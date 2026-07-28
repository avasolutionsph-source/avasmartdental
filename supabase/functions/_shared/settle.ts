import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Marks an invoice paid and pushes paid_until to the period end.
 * Idempotent and concurrency-safe: the UPDATE is guarded on status='open',
 * so whichever of {poll, webhook} arrives second changes zero rows and the
 * clinic is never credited twice.
 *
 * The caller MUST have already verified with NextPay that the intent
 * succeeded — this function does not re-check. (Guide §7 rule 3.)
 */
export async function settleInvoice(
  db: SupabaseClient,
  invoice: { id: string; clinic_id: string; period_end: string; amount_centavos: number },
  paidAmountCentavos: number,
): Promise<{ paidUntil: string; alreadySettled: boolean }> {
  if (paidAmountCentavos !== invoice.amount_centavos) {
    // Underpayment/overpayment: do not credit time. Needs a human.
    console.error('amount mismatch', {
      invoice: invoice.id,
      expected: invoice.amount_centavos,
      got: paidAmountCentavos,
    });
    throw new Error('amount_mismatch');
  }

  const { data: claimed } = await db
    .from('billing_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoice.id)
    .eq('status', 'open')          // <- the guard: only one caller wins
    .select('id');

  const alreadySettled = !claimed || claimed.length === 0;

  if (!alreadySettled) {
    await db.from('clinics').update({
      paid_until: invoice.period_end,
      subscription_status: 'active',
    }).eq('id', invoice.clinic_id);
  }

  const { data: clinic } = await db
    .from('clinics').select('paid_until').eq('id', invoice.clinic_id).maybeSingle();

  return { paidUntil: clinic!.paid_until, alreadySettled };
}
