import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClinics } from '@/lib/api';
import { useActiveClinic } from './activeClinic';

/** Shared cache key so the switcher and the bootstrap gate read/refresh the same list. */
export const CLINICS_QUERY_KEY = ['clinics', 'list'] as const;

export function useClinics() {
  return useQuery({
    queryKey: CLINICS_QUERY_KEY,
    queryFn: getClinics,
  });
}

/**
 * Loads the account's clinic list and makes sure a VALID clinic is active
 * before the caller renders anything that fires tenant-scoped queries.
 *
 * Every PostgREST request depends on the `x-clinic-id` header (injected in
 * lib/supabase.ts from the activeClinic store) — a data query that starts
 * before an active clinic is chosen doesn't error, it silently returns 0
 * rows (current_clinic_id() -> NULL -> RLS denies). So callers must wait
 * for `ready` before mounting the rest of the authenticated shell.
 *
 * Defaults to the first clinic (alphabetical, per getClinics' `order`) when
 * the persisted activeClinicId is missing or no longer belongs to this
 * account (e.g. localStorage from a different account, or the clinic was
 * removed).
 */
export function useClinicBootstrap() {
  const { data: clinics, isLoading, isError } = useClinics();
  const activeClinicId = useActiveClinic((s) => s.activeClinicId);
  const setActiveClinic = useActiveClinic((s) => s.setActiveClinic);

  useEffect(() => {
    if (!clinics) return;
    const stillValid = clinics.some((c) => c.id === activeClinicId);
    if (!stillValid) {
      setActiveClinic(clinics[0]?.id ?? null);
    }
  }, [clinics, activeClinicId, setActiveClinic]);

  const activeIsValid =
    !!clinics && (clinics.length === 0 || clinics.some((c) => c.id === activeClinicId));

  // Fail open on a load error rather than spinning forever — subsequent
  // tenant queries will come back empty/erroring on their own, which is a
  // visible, debuggable failure instead of a stuck splash screen.
  const ready = !isLoading && (isError || activeIsValid);

  return { clinics: clinics ?? [], ready, isLoading, isError };
}
