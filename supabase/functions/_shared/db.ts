import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** Service-role client — bypasses RLS. Only ever used inside edge functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Resolves the caller's JWT to their clinic id, or null. */
export async function callerClinicId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return null;
  const { data } = await serviceClient()
    .from('clinics').select('id').eq('owner_user_id', user.id).maybeSingle();
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
