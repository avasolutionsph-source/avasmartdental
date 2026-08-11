import { json, preflight } from '../_shared/http.ts';
import { callerAccountId, serviceClient } from '../_shared/db.ts';

// Toggles the caller's "cancel at period end" intent. Graceful by design: the
// user keeps access until the period lapses — enforcement stays DATE-BASED in
// account_access_tier, untouched here. This only records intent (drives the UI
// and stops reminders); billing-cron flips the status to 'canceled' at lapse.
// Service-role because a direct owner UPDATE on accounts is RLS-locked.
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const accountId = await callerAccountId(req.headers.get('authorization'));
  if (!accountId) return json(401, { error: 'unauthorized' }, origin);

  let cancel: unknown;
  try {
    const body = await req.json();
    cancel = (body as Record<string, unknown>)?.cancel;
  } catch {
    cancel = undefined;
  }
  if (typeof cancel !== 'boolean') return json(400, { error: 'cancel_boolean_required' }, origin);

  const db = serviceClient();
  const { data: account } = await db
    .from('accounts')
    .select('id, subscription_status, cancel_at_period_end')
    .eq('id', accountId)
    .maybeSingle();
  if (!account) return json(404, { error: 'account_not_found' }, origin);

  if (cancel) {
    // Only a live subscription can be canceled; a lapsed/already-canceled
    // account has nothing to cancel.
    if (account.subscription_status !== 'trialing' && account.subscription_status !== 'active') {
      return json(409, { error: 'not_cancelable', status: account.subscription_status }, origin);
    }
  } else if (!account.cancel_at_period_end) {
    // Resume only makes sense when a cancellation is pending.
    return json(409, { error: 'not_canceled' }, origin);
  }

  const { error } = await db
    .from('accounts')
    .update({ cancel_at_period_end: cancel })
    .eq('id', accountId);
  if (error) {
    console.error('set cancel_at_period_end failed', error);
    return json(500, { error: 'update_failed' }, origin);
  }

  return json(200, { cancelAtPeriodEnd: cancel }, origin);
});
