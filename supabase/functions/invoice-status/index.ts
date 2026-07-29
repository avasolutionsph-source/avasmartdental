import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json, preflight } from '../_shared/http.ts';
import { callerAccountId, nextpayEnv, serviceClient } from '../_shared/db.ts';
import { settleInvoice } from '../_shared/settle.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);

  const accountId = await callerAccountId(req.headers.get('authorization'));
  if (!accountId) return json(401, { error: 'unauthorized' }, origin);

  const invoiceId = new URL(req.url).searchParams.get('invoice_id');
  if (!invoiceId) return json(400, { error: 'invoice_id_required' }, origin);

  const db = serviceClient();
  const { data: invoice } = await db
    .from('billing_invoices').select('*')
    .eq('id', invoiceId).eq('account_id', accountId)   // scope to the caller's account
    .maybeSingle();
  if (!invoice) return json(404, { error: 'invoice_not_found' }, origin);
  if (invoice.status === 'paid') return json(200, { status: 'paid' }, origin);
  if (!invoice.payment_intent_id) return json(200, { status: 'open' }, origin);

  const env = nextpayEnv();
  const client = new NextPayClient(env.clientId, env.clientSecret, env.baseUrl);

  // Guide §7 rule 3 — the authoritative check. Note the intent stays "pending"
  // for ~15s AFTER the customer pays, so the UI must keep polling.
  let intent;
  try {
    intent = await client.getPaymentIntent(invoice.payment_intent_id);
  } catch (e) {
    console.error('getPaymentIntent failed', e);
    return json(502, { error: 'nextpay_unavailable' }, origin);
  }

  if (intent.status !== 'succeeded') {
    return json(200, { status: invoice.status, intentStatus: intent.status }, origin);
  }

  const result = await settleInvoice(db, invoice, intent.amountCentavos);
  return json(200, { status: 'paid', paidUntil: result.paidUntil }, origin);
});
