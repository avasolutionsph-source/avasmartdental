import { json, preflight } from '../_shared/http.ts';
import { callerAccountId, serviceClient } from '../_shared/db.ts';

// Adds a clinic/branch under the caller's account. A service-role function
// (not a direct client insert) so we control the tenant link and let the
// account-tier trigger recompute the tier from the new clinic count.
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const accountId = await callerAccountId(req.headers.get('authorization'));
  if (!accountId) return json(401, { error: 'unauthorized' }, origin);

  let name: unknown;
  try {
    const body = await req.json();
    name = (body as Record<string, unknown>)?.name;
  } catch {
    name = undefined;
  }
  if (typeof name !== 'string' || !name.trim()) {
    return json(400, { error: 'name_required' }, origin);
  }

  const db = serviceClient();
  const { data: account } = await db
    .from('accounts')
    .select('id, owner_user_id, trial_end, paid_until, subscription_status')
    .eq('id', accountId)
    .maybeSingle();
  if (!account) return json(404, { error: 'account_not_found' }, origin);

  // clinics still carries deprecated NOT NULL billing columns (0016); fill them
  // with the account's values. The ACCOUNT is authoritative; the tier is
  // recomputed by the clinics_recompute_tier trigger after this insert.
  const { data: clinic, error } = await db
    .from('clinics')
    .insert({
      owner_user_id: account.owner_user_id,
      account_id: account.id,
      name: name.trim(),
      plan: 'tier_1',
      trial_end: account.trial_end,
      paid_until: account.paid_until,
      subscription_status: account.subscription_status,
    })
    .select('id')
    .single();
  if (error) {
    console.error('add clinic failed', error);
    return json(500, { error: 'add_failed' }, origin);
  }

  const { data: acct } = await db.from('accounts').select('tier').eq('id', accountId).maybeSingle();
  return json(200, { clinicId: clinic.id, accountTier: acct?.tier ?? null }, origin);
});
