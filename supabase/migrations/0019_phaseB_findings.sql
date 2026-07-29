-- 0019_phaseB_findings.sql — close two Phase-B review findings (both additive).

-- LOW: mark the clinics billing columns as deprecated/non-authoritative. Since
-- Phase B, the ACCOUNT is the source of truth; these are frozen copies kept only
-- to satisfy old NOT NULL constraints and are never read for a billing decision.
comment on column public.clinics.paid_until is
  'DEPRECATED since Phase B (0016). Non-authoritative frozen copy — billing lives on public.accounts.paid_until. Do not read for entitlement.';
comment on column public.clinics.subscription_status is
  'DEPRECATED since Phase B (0016). Non-authoritative — use public.accounts.subscription_status.';
comment on column public.clinics.billing_period is
  'DEPRECATED since Phase B (0016). Non-authoritative — use public.accounts.billing_period.';
comment on column public.clinics.trial_end is
  'DEPRECATED since Phase B (0016). Non-authoritative — use public.accounts.trial_end.';
comment on column public.clinics.plan is
  'DEPRECATED since Phase B (0016). Non-authoritative — the account tier is public.accounts.tier.';

-- LOW: settle_invoice defense-in-depth. clinics.account_id is NOT NULL, so a
-- clinic should always resolve to an account — but if that invariant is ever
-- violated, raise instead of silently crediting nothing.
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
    if v_account_id is null then
      raise exception 'clinic_has_no_account: %', v_clinic_id;
    end if;
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
