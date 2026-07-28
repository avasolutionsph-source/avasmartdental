import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ClinicBilling } from '@/types/models';

/**
 * Shared cache key for the signed-in clinic's billing/subscription row.
 * Kept in one place so the Settings → Billing tab and the app-wide
 * AccessBanner (mounted in the Layout shell) read the same data and can
 * both be refreshed by invalidating this key after a payment.
 */
export const CLINIC_BILLING_QUERY_KEY = ['clinic-billing'] as const;

export function useClinicBilling() {
  return useQuery<ClinicBilling | null>({
    queryKey: CLINIC_BILLING_QUERY_KEY,
    // getClinicBilling() already swallows errors and resolves null (e.g. an
    // admin-created account with no clinics row) — nothing extra to catch.
    queryFn: () => api.getClinicBilling(),
  });
}

/** Returns a function that re-fetches billing everywhere it's used — call after a payment lands. */
export function useRefetchClinicBilling() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CLINIC_BILLING_QUERY_KEY });
}
