export type AccessTier = 'full' | 'grace' | 'read_only';

/**
 * Mirrors public.clinic_access_tier(). Presentation only — Postgres RLS is the
 * enforcement. This exists so the UI doesn't offer buttons that will 403.
 *
 * FAILS OPEN, exactly like the SQL function: an unparseable or missing
 * paid_until yields 'full', never 'read_only'. Getting this backwards would
 * show a lapsed-account banner to a clinic that has paid.
 */
export function accessTier(
  paidUntil: string | null | undefined,
  graceDays = 7,
  status?: string,
  now: Date = new Date(),
): AccessTier {
  if (status === 'canceled') return 'read_only';
  if (!paidUntil) return 'full';
  const end = new Date(paidUntil).getTime();
  if (Number.isNaN(end)) return 'full';   // unknown != unpaid
  const t = now.getTime();
  if (t <= end) return 'full';
  if (t <= end + graceDays * 86_400_000) return 'grace';
  return 'read_only';
}
