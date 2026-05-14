import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const appRedirectUrl =
  (import.meta.env.VITE_APP_REDIRECT_URL as string | undefined) ??
  (typeof window !== "undefined"
    ? `${window.location.origin}/checkout/success`
    : undefined);

export type SignupPayload = {
  email: string;
  password: string;
  clinicName: string;
  contactName: string;
  phone: string;
  plan: string;
  trialEndIso: string;
};

export type SignupResult =
  | { ok: true; simulated: boolean }
  | { ok: false; reason: string };

export async function signupClinic(
  payload: SignupPayload,
): Promise<SignupResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, simulated: true };
  }

  const { error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: appRedirectUrl,
      data: {
        clinic_name: payload.clinicName,
        contact_name: payload.contactName,
        phone: payload.phone,
        plan: payload.plan,
        trial_end: payload.trialEndIso,
      },
    },
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, simulated: false };
}
