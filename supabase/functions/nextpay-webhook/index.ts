import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json } from '../_shared/http.ts';
import { nextpayEnv, serviceClient } from '../_shared/db.ts';
import { settleInvoice } from '../_shared/settle.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, null);

  let event: { type?: string; data?: { id?: string } };
  try { event = await req.json(); } catch { return json(400, { error: 'bad_json' }, null); }

  // Always 200 on anything we don't handle — retries help nobody here.
  if (event.type !== 'v2.payment_intent.succeeded' || !event.data?.id) {
    return json(200, { ignored: true }, null);
  }

  const env = nextpayEnv();
  const client = new NextPayClient(env.clientId, env.clientSecret, env.baseUrl);

  // The webhook body is UNTRUSTED. Re-fetch the intent ourselves and believe
  // only that. A forged POST claiming success gets nowhere.
  let intent;
  try {
    intent = await client.getPaymentIntent(event.data.id);
  } catch (e) {
    console.error('webhook verify failed', e);
    return json(502, { error: 'verify_failed' }, null);   // let NextPay retry
  }
  if (intent.status !== 'succeeded') return json(200, { ignored: true }, null);

  const db = serviceClient();
  const { data: invoice } = await db
    .from('billing_invoices').select('*')
    .eq('payment_intent_id', intent.id).maybeSingle();
  if (!invoice) return json(200, { ignored: true }, null);

  try {
    await settleInvoice(db, invoice, intent.amountCentavos);
  } catch (e) {
    console.error('settle failed', e);
    return json(500, { error: 'settle_failed' }, null);
  }
  return json(200, { ok: true }, null);
});
