import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Marks an invoice paid and pushes paid_until forward — all inside the
 * settle_invoice() SQL function (migration 0009), which is atomic and
 * monotonic:
 *   - the open->paid claim is guarded, so a simultaneous poll + webhook can
 *     never both credit the month;
 *   - the amount is checked against the invoice's own stored amount; a
 *     mismatch rolls the claim back (never 'paid' without credit);
 *   - paid_until = GREATEST(paid_until, period_end), so time never moves back.
 *
 * The caller MUST have already verified with NextPay that the intent
 * succeeded (Guide §7 rule 3). A mismatch surfaces as a thrown error — the
 * caller returns 5xx so NextPay retries / the poll reports not-yet-paid, and
 * the mismatch is logged for a human. That is deliberate: we never credit a
 * wrong amount.
 */
export async function settleInvoice(
  db: SupabaseClient,
  invoice: { id: string; clinic_id: string; period_end: string; amount_centavos: number },
  paidAmountCentavos: number,
): Promise<{ paidUntil: string; alreadySettled: boolean }> {
  const { data, error } = await db.rpc('settle_invoice', {
    p_invoice_id: invoice.id,
    p_paid_amount: paidAmountCentavos,
  });
  if (error) {
    console.error('settle_invoice failed', { invoice: invoice.id, error: error.message });
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    paidUntil: row?.out_paid_until as string,
    alreadySettled: Boolean(row?.out_already_settled),
  };
}
