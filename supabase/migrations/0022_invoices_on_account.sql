-- 0022_invoices_on_account.sql — invoices are account-level (Phase C: an account
-- has many clinics, so clinic_id no longer identifies the billing entity).
-- Add account_id, backfill, swap the per-period uniqueness + owner-read RLS to
-- the account, and simplify settle_invoice to use it directly. clinic_id becomes
-- a deprecated, nullable column.

alter table public.billing_invoices
  add column if not exists account_id uuid references public.accounts(id) on delete cascade;

update public.billing_invoices bi
  set account_id = c.account_id
  from public.clinics c
  where bi.clinic_id = c.id and bi.account_id is null;

alter table public.billing_invoices alter column account_id set not null;
alter table public.billing_invoices alter column clinic_id drop not null;
comment on column public.billing_invoices.clinic_id is
  'DEPRECATED (Phase C, 0022): invoices are account-level. Use account_id.';

-- Per-period uniqueness moves to the account.
alter table public.billing_invoices drop constraint if exists billing_invoices_clinic_id_period_start_key;
alter table public.billing_invoices add constraint billing_invoices_account_period_key unique (account_id, period_start);

create index if not exists billing_invoices_account_idx on public.billing_invoices (account_id, created_at desc);

-- Owner-read RLS on the account (was clinic-scoped).
drop policy if exists "owners read own invoices" on public.billing_invoices;
create policy "owners read own invoices"
  on public.billing_invoices for select to authenticated
  using (account_id in (select id from public.accounts where owner_user_id = auth.uid()));

-- settle_invoice — credit the account via the invoice's own account_id (no clinic
-- hop). Claim + amount-check + GREATEST unchanged.
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
           subscription_status = 'active'
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
