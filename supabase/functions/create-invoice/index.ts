import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json, preflight } from '../_shared/http.ts';
import { callerAccountId, nextpayEnv, serviceClient } from '../_shared/db.ts';

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

// Add exactly one year, clamping the Feb 29 leap-day anchor to Feb 28 on a
// non-leap target year (same rolled-over-day logic as addOneMonthUTC).
function addOneYearUTC(d: Date): Date {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCFullYear(r.getUTCFullYear() + 1);
  if (r.getUTCDate() < day) r.setUTCDate(0); // Feb 29 -> Feb 28
  return r;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const accountId = await callerAccountId(req.headers.get('authorization'));
  if (!accountId) return json(401, { error: 'unauthorized' }, origin);

  // `period` is a product choice (which cadence to bill), never an amount —
  // the SERVER always looks up the price from billing_plans below. Default to
  // the account's stored billing_period, else 'monthly'. Anything else is
  // rejected outright so a typo can't silently fall through to monthly.
  let bodyPeriod: unknown;
  try {
    const body = await req.json().catch(() => ({}));
    bodyPeriod = (body as Record<string, unknown>)?.period;
  } catch {
    bodyPeriod = undefined;
  }
  if (bodyPeriod !== undefined && bodyPeriod !== 'monthly' && bodyPeriod !== 'annual') {
    return json(400, { error: 'invalid_period' }, origin);
  }

  const db = serviceClient();

  // Billing is account-level (Phase B/C). Price off the account. The request
  // body is NEVER consulted for amount.
  const { data: account } = await db
    .from('accounts')
    .select(
      'id, tier, paid_until, billing_period, billing_plans!inner(monthly_centavos, annual_centavos, self_serve)',
    )
    .eq('id', accountId)
    .maybeSingle();
  if (!account) return json(404, { error: 'account_not_found' }, origin);

  const plan = one<{ monthly_centavos: number | null; annual_centavos: number | null; self_serve: boolean }>(
    account.billing_plans,
  );
  if (!plan) return json(500, { error: 'plan_missing' }, origin);
  if (!plan.self_serve) return json(400, { error: 'plan_not_self_serve' }, origin);

  const period: 'monthly' | 'annual' =
    (bodyPeriod as 'monthly' | 'annual' | undefined) ??
    (account.billing_period === 'annual' ? 'annual' : 'monthly');

  const amountCentavos = period === 'annual' ? plan.annual_centavos : plan.monthly_centavos;
  if (amountCentavos == null) return json(400, { error: 'plan_not_self_serve' }, origin);

  const periodStart = new Date(account.paid_until);
  const periodEnd = period === 'annual' ? addOneYearUTC(periodStart) : addOneMonthUTC(periodStart);
  const periodTag = periodStart.toISOString().slice(0, 10);

  // Persist the chosen cadence on the ACCOUNT so a renewal/cron run (which has
  // no body to read `period` from) reuses the same cadence next time.
  if (account.billing_period !== period) {
    const { error: accountUpdateError } = await db
      .from('accounts')
      .update({ billing_period: period })
      .eq('id', account.id);
    if (accountUpdateError) {
      console.error('account billing_period update failed', accountUpdateError);
    }
  }

  // At most one invoice row per (account, period). Reuse it across retries.
  const { data: existing } = await db
    .from('billing_invoices')
    .select('*')
    .eq('account_id', accountId)
    .eq('period_start', periodStart.toISOString())
    .maybeSingle();

  if (existing?.status === 'paid') {
    return json(200, { alreadyPaid: true, invoiceId: existing.id }, origin);
  }

  const invoiceId = existing?.id ?? crypto.randomUUID();
  // The cadence is part of the external_id (and therefore the NextPay
  // idempotency key). Without it, switching monthly<->annual for the SAME
  // period would reuse one idempotency key with two different amounts, which
  // NextPay rejects — stranding the customer on the pay screen. Full account id
  // keeps external_id globally unique across accounts.
  const desiredExternalId = `inv-${accountId}-${periodTag}-${period}`;

  // Did the caller switch cadence on an existing open invoice for this period?
  const cadenceSwitched = !!existing && existing.billing_period !== period;

  if (!existing) {
    const { error } = await db.from('billing_invoices').insert({
      id: invoiceId,
      account_id: accountId,
      plan_id: account.tier,
      amount_centavos: amountCentavos,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      external_id: desiredExternalId,
      billing_period: period,
      status: 'open',
    });
    if (error) {
      console.error('invoice insert failed', error);
      return json(500, { error: 'invoice_insert_failed' }, origin);
    }
  } else if (cadenceSwitched) {
    // Re-point the existing open invoice at the new cadence: new amount, new
    // period_end, new external_id, and clear the stale intent so a fresh one is
    // minted below with the correct amount.
    const { error } = await db.from('billing_invoices').update({
      amount_centavos: amountCentavos,
      period_end: periodEnd.toISOString(),
      billing_period: period,
      external_id: desiredExternalId,
      payment_intent_id: null,
      qr_string: null,
      qr_expires_at: null,
    }).eq('id', invoiceId).eq('status', 'open');
    if (error) {
      console.error('invoice cadence update failed', error);
      return json(500, { error: 'invoice_update_failed' }, origin);
    }
  }

  const baseExternalId = cadenceSwitched
    ? desiredExternalId
    : (existing?.external_id ?? desiredExternalId);

  // Idempotency: NextPay dedupes on the key derived from external_id
  // (pi-<external_id>). A repeated "Pay" click within the QR's life returns the
  // SAME intent — same QR string AND same base64 image. Only once the previous
  // QR has expired do we mint a genuinely new intent, by bumping the
  // external_id with a retry suffix. (A cadence switch already cleared the old
  // QR above, so prevExpired is false and the fresh cadence id is used.)
  const prevExpired = !cadenceSwitched && existing?.qr_expires_at
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
      metadata: { invoice_id: invoiceId, account_id: accountId, period: periodTag },
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
    billingPeriod: period,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  }, origin);
});
