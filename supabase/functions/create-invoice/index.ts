import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json, preflight } from '../_shared/http.ts';
import { callerClinicId, nextpayEnv, serviceClient } from '../_shared/db.ts';

const QR_TTL_SECONDS = 900; // 15 min, per the guide's default

// PostgREST returns a to-one embed as an object, but supabase-js sometimes
// hands it back as a one-element array. Normalize so `.self_serve` etc. are
// read off the right thing (a bare `.self_serve` on an array is undefined,
// which would wrongly reject a self-serve plan).
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

// Add exactly one calendar month, clamping month-end anchors. Plain
// setUTCMonth(+1) overflows: Jan 31 -> Mar 3 (Feb has no 31st), which would
// over-credit a few days and drift the anchor forward every short month. This
// clamps Jan 31 -> Feb 28/29. All UTC — paid_until is a UTC timestamptz.
function addOneMonthUTC(d: Date): Date {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCMonth(r.getUTCMonth() + 1);
  if (r.getUTCDate() < day) r.setUTCDate(0); // rolled over -> last day of intended month
  return r;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const clinicId = await callerClinicId(req.headers.get('authorization'));
  if (!clinicId) return json(401, { error: 'unauthorized' }, origin);

  const db = serviceClient();

  // Price comes from the DB. The request body is NEVER consulted for amount.
  const { data: clinic } = await db
    .from('clinics')
    .select('id, name, plan, paid_until, billing_plans!inner(amount_centavos, self_serve)')
    .eq('id', clinicId)
    .maybeSingle();
  if (!clinic) return json(404, { error: 'clinic_not_found' }, origin);

  const plan = one<{ amount_centavos: number; self_serve: boolean }>(clinic.billing_plans);
  if (!plan) return json(500, { error: 'plan_missing' }, origin);
  if (!plan.self_serve) return json(400, { error: 'plan_not_self_serve' }, origin);

  const amountCentavos = plan.amount_centavos;
  const periodStart = new Date(clinic.paid_until);
  const periodEnd = addOneMonthUTC(periodStart);
  const periodTag = periodStart.toISOString().slice(0, 10);

  // At most one invoice row per (clinic, period). Reuse it across retries.
  const { data: existing } = await db
    .from('billing_invoices')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('period_start', periodStart.toISOString())
    .maybeSingle();

  if (existing?.status === 'paid') {
    return json(200, { alreadyPaid: true, invoiceId: existing.id }, origin);
  }

  const invoiceId = existing?.id ?? crypto.randomUUID();
  // Full clinic id (not an 8-char prefix): billing_invoices.external_id is
  // globally UNIQUE, so a truncated prefix could collide between two clinics in
  // the same period and block the second one from ever billing.
  const baseExternalId = existing?.external_id ?? `inv-${clinicId}-${periodTag}`;

  if (!existing) {
    const { error } = await db.from('billing_invoices').insert({
      id: invoiceId,
      clinic_id: clinicId,
      plan_id: clinic.plan,
      amount_centavos: amountCentavos,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      external_id: baseExternalId,
      status: 'open',
    });
    if (error) {
      console.error('invoice insert failed', error);
      return json(500, { error: 'invoice_insert_failed' }, origin);
    }
  }

  // Idempotency: NextPay dedupes on the idempotency key derived from external_id
  // (pi-<external_id>). A repeated "Pay" click within the QR's life returns the
  // SAME intent — same QR string AND same base64 image — which is exactly what
  // we want. Only once the previous QR has expired do we mint a genuinely new
  // intent, by bumping the external_id with a retry suffix.
  const prevExpired = existing?.qr_expires_at
    ? new Date(existing.qr_expires_at) <= new Date()
    : false;
  const intentExternalId = prevExpired
    ? `${baseExternalId}-r${Date.now()}`
    : baseExternalId;

  const env = nextpayEnv();
  const client = new NextPayClient(env.clientId, env.clientSecret, env.baseUrl);

  let intent;
  try {
    intent = await client.createPaymentIntent({
      accountId: env.accountId,
      externalId: intentExternalId,
      amountCentavos,
      expiresInSeconds: QR_TTL_SECONDS,
      metadata: { invoice_id: invoiceId, clinic_id: clinicId, period: periodTag },
    });
  } catch (e) {
    console.error('createPaymentIntent failed', e);
    return json(502, { error: 'nextpay_unavailable' }, origin);
  }

  const qrExpiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString();
  await db.from('billing_invoices').update({
    payment_intent_id: intent.id,
    qr_string: intent.qrString,
    qr_expires_at: qrExpiresAt,
  }).eq('id', invoiceId);

  // Always return qrImageDataUrl so the UI can render the QR on every call,
  // including reuse — the client card renders from qrImageDataUrl.
  return json(200, {
    invoiceId,
    qrString: intent.qrString,
    qrImageDataUrl: intent.qrImageDataUrl,
    expiresAt: qrExpiresAt,
    amountCentavos,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  }, origin);
});
