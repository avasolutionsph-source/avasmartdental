import { createClient } from '@supabase/supabase-js';
import { useActiveClinic } from '@/features/clinics/activeClinic';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

// Injects the active clinic (branch) as the `x-clinic-id` header on every
// request the client makes. Postgres's current_clinic_id() reads this
// header and RLS denies (NULL) anything without it, so this must run on
// every single Supabase call, not just the ones we think are tenant-scoped.
//
// Reads the zustand store synchronously (getState(), no hook) so switching
// clinics never requires recreating the client — see features/clinics/activeClinic.ts.
const clinicFetch: typeof fetch = (input, init = {}) => {
  const id = useActiveClinic.getState().activeClinicId;
  const headers = new Headers(init.headers);
  if (id) headers.set('x-clinic-id', id);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: clinicFetch },
});
