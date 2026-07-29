-- 0017_billing_on_accounts.sql — move the billing/entitlement functions onto
-- accounts. The RLS-referenced NAMES (clinic_is_writable, clinic_access_tier,
-- settle_invoice) are kept and only their BODIES change to resolve clinic ->
-- account, so the 66 tenant RLS policies and current_clinic_id() are untouched.

-- account_access_tier — same date logic, on the account. Fail-open contract:
-- NULL means "unknown", never "unpaid".
create or replace function public.account_access_tier(p_account_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when a.subscription_status = 'canceled' then 'read_only'
    when a.paid_until is null then null
    when now() <= a.paid_until then 'full'
    when now() <= a.paid_until + make_interval(days => coalesce(a.grace_days,7)) then 'grace'
    else 'read_only'
  end
  from public.accounts a where a.id = p_account_id;
$$;

-- clinic_access_tier — back-compat wrapper, resolves through the account.
create or replace function public.clinic_access_tier(p_clinic_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select public.account_access_tier((select account_id from public.clinics where id = p_clinic_id));
$$;

-- clinic_is_writable — SAME NAME (called by all 66 write policies), body now
-- goes clinic -> account. Still DELIBERATELY FAIL-OPEN: only a definitive
-- 'read_only' blocks a write; unknown/unreadable allows it.
create or replace function public.clinic_is_writable()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.account_access_tier(
      (select account_id from public.clinics where id = public.current_clinic_id())
    ) is distinct from 'read_only',
    true
  );
$$;

grant execute on function public.account_access_tier(uuid) to authenticated;

-- settle_invoice — credit the ACCOUNT, not the clinic. Claim + amount-check
-- unchanged; the GREATEST paid_until extension moves to accounts.
create or replace function public.settle_invoice(p_invoice_id uuid, p_paid_amount integer)
returns table (out_paid_until timestamptz, out_already_settled boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_clinic_id uuid;
  v_account_id uuid;
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
      raise exception 'amount_mismatch: expected %, got %', v_amount, p_paid_amount;
    end if;
    select account_id into v_account_id from public.clinics where id = v_clinic_id;
    update public.accounts
       set paid_until = greatest(paid_until, v_period_end),
           subscription_status = 'active'
     where id = v_account_id;
  end if;

  return query
    select a.paid_until, (not v_claimed)
    from public.billing_invoices bi
    join public.clinics c on c.id = bi.clinic_id
    join public.accounts a on a.id = c.account_id
    where bi.id = p_invoice_id;
end;
$$;

revoke all on function public.settle_invoice(uuid, integer) from public, anon, authenticated;
