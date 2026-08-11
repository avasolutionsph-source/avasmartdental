-- 0025_cancel_at_period_end.sql — graceful "cancel subscription" support.
-- A boolean intent flag on accounts: the user keeps access until the period
-- ends (enforcement stays date-based in account_access_tier — UNCHANGED), then
-- billing-cron flips the status to 'canceled'. Paying clears the flag.

alter table public.accounts
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column public.accounts.cancel_at_period_end is
  'User asked to cancel; keep access until paid_until/trial_end, then billing-cron sets status=canceled. Cleared on payment (settle_invoice) or resume.';

-- settle_invoice — same as 0022 (account-scoped claim + amount-check + GREATEST),
-- plus: a successful payment clears any pending cancellation (paying = continue).
create or replace function public.settle_invoice(p_invoice_id uuid, p_paid_amount integer)
returns table (out_paid_until timestamptz, out_already_settled boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_account_id uuid;
  v_period_end timestamptz;
  v_amount integer;
  v_claimed boolean := false;
begin
  update public.billing_invoices
     set status = 'paid', paid_at = now()
   where id = p_invoice_id and status = 'open'
   returning account_id, period_end, amount_centavos
   into v_account_id, v_period_end, v_amount;
  v_claimed := found;

  if v_claimed then
    if p_paid_amount is distinct from v_amount then
      raise exception 'amount_mismatch: expected %, got %', v_amount, p_paid_amount;
    end if;
    if v_account_id is null then
      raise exception 'invoice_has_no_account: %', p_invoice_id;
    end if;
    update public.accounts
       set paid_until = greatest(paid_until, v_period_end),
           subscription_status = 'active',
           cancel_at_period_end = false
     where id = v_account_id;
  end if;

  return query
    select a.paid_until, (not v_claimed)
    from public.billing_invoices bi
    join public.accounts a on a.id = bi.account_id
    where bi.id = p_invoice_id;
end;
$$;

revoke all on function public.settle_invoice(uuid, integer) from public, anon, authenticated;
