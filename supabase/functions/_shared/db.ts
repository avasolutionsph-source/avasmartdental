import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** Service-role client — bypasses RLS. Only ever used inside edge functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Resolves the caller's JWT to their auth user id, or null. */
async function callerUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await anon.auth.getUser();
  return user?.id ?? null;
}

/**
 * Resolves the caller's JWT to their ACCOUNT id, or null. Billing is
 * account-level (an owner has one account, which may own many clinics), so
 * billing functions scope by account, never by a single clinic.
 */
export async function callerAccountId(authHeader: string | null): Promise<string | null> {
  const userId = await callerUserId(authHeader);
  if (!userId) return null;
  const { data } = await serviceClient()
    .from('accounts').select('id').eq('owner_user_id', userId).maybeSingle();
  return data?.id ?? null;
}

export function nextpayEnv() {
  return {
    clientId: Deno.env.get('NEXTPAY_CLIENT_ID')!,
    clientSecret: Deno.env.get('NEXTPAY_CLIENT_SECRET')!,
    accountId: Deno.env.get('NEXTPAY_ACCOUNT_ID')!,
    baseUrl: Deno.env.get('NEXTPAY_BASE_URL') ?? 'https://api.partners.nextpay.world',
  };
}
