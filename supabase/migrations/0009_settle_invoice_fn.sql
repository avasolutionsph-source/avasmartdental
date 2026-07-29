-- 0009_settle_invoice_fn.sql — make settlement atomic and monotonic.
--
-- Folds "claim the invoice + verify amount + extend paid_until" into ONE
-- function so the whole thing is a single transaction:
--   * claim: open -> paid, guarded, so concurrent poll+webhook can't both win;
--   * amount check happens against the invoice's OWN stored amount_centavos
--     (server-side truth), and a mismatch RAISES, which rolls back the claim —
--     so an invoice is never left 'paid' without paid_until being credited;
--   * paid_until = GREATEST(paid_until, period_end) so paid time can NEVER move
--     backwards, even if a stale invoice for an older period is ever settled
--     late (defense-in-depth beyond the one-open-invoice invariant).
create or replace function public.settle_invoice(
  p_invoice_id uuid,
  p_paid_amount integer
)
returns table (out_paid_until timestamptz, out_already_settled boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_period_end timestamptz;
  v_amount integer;
  v_claimed boolean := false;
begin
  update public.billing_invoices
     set status = 'paid', paid_at = now()
   where id = p_invoice_id and status = 'open'
   returning clinic_id, period_end, amount_centavos
   into v_clinic_id, v_period_end, v_amount;
  v_claimed := found;

  if v_claimed then
    if p_paid_amount is distinct from v_amount then
      -- Roll back the claim: never credit time for a wrong amount, and never
      -- leave the invoice marked paid. A human must resolve the mismatch.
      raise exception 'amount_mismatch: expected %, got %', v_amount, p_paid_amount;
    end if;

    update public.clinics
       set paid_until = greatest(paid_until, v_period_end),
           subscription_status = 'active'
     where id = v_clinic_id;
  end if;

  return query
    select c.paid_until, (not v_claimed)
    from public.billing_invoices bi
    join public.clinics c on c.id = bi.clinic_id
    where bi.id = p_invoice_id;
end;
$$;

-- Only the service role (edge functions) may settle. Never the browser.
revoke all on function public.settle_invoice(uuid, integer) from public, anon, authenticated;
