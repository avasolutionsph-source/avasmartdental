# Phase C Implementation Plan — Multi-clinic per account (header-based switcher)

> **HIGHEST-RISK phase.** This changes `current_clinic_id()` — the predicate behind all 66 tenant RLS policies on 22 tables. A bug here is a cross-account data leak. Additive; do NOT break the verified settle / fail-open / billing-single-source-on-accounts. FULL isolation re-verification (including cross-account leak tests on all 22 tables) BEFORE merge. Stop after for the user's verification.

**Goal:** One account owns many clinics; the app switches the active clinic via an `x-clinic-id` request header; `current_clinic_id()` returns that clinic ONLY if it belongs to the caller's account (else NULL → deny). Account tier is derived from clinic count (1→tier_1, 2–6→tier_2_6, 7+→tier_6plus/contact).

---

## The security model (read carefully)

`current_clinic_id()` becomes header-driven WITH membership validation:
```sql
create or replace function public.current_clinic_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.id
  from public.clinics c
  join public.accounts a on a.id = c.account_id
  where a.owner_user_id = auth.uid()          -- caller must OWN the account
    and c.id = nullif(current_setting('request.headers', true)::json ->> 'x-clinic-id', '')::uuid
$$;
```
Why this is safe:
- The `x-clinic-id` header names the desired clinic, but the row is returned only when its account's `owner_user_id = auth.uid()`. A caller sending another account's clinic id gets **no row → NULL**, and every RLS policy (`clinic_id = current_clinic_id()`) then fails (`= NULL` is NULL) → deny. So spoofing another account's clinic id leaks nothing.
- Absent/empty header → NULL → deny (the app always sends the header).
- Service-role edge functions don't use this (they scope by explicit ids), so settlement/cron are unaffected. `request.headers` is unset there → NULL, harmless.
- Fail-open stays intact: `clinic_is_writable()` still returns true on unknown, but the RLS `clinic_id = current_clinic_id()` predicate independently denies when the clinic isn't the caller's — fail-open never widens cross-account access.

A malformed (non-uuid) header errors that one request (fails closed) — no leak. The app only ever sends valid uuids.

---

## Migration 0020 — multi-clinic core

`supabase/migrations/0020_multi_clinic.sql`:
```sql
-- Allow many clinics per account.
alter table public.clinics drop constraint if exists clinics_owner_user_id_key;

-- current_clinic_id: header-driven, membership-validated (see plan security note).
create or replace function public.current_clinic_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.id
  from public.clinics c
  join public.accounts a on a.id = c.account_id
  where a.owner_user_id = auth.uid()
    and c.id = nullif(current_setting('request.headers', true)::json ->> 'x-clinic-id', '')::uuid
$$;

-- Account tier tracks clinic count. 1->tier_1, 2..6->tier_2_6, 7+->tier_6plus.
create or replace function public.recompute_account_tier()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account uuid := coalesce(new.account_id, old.account_id);
  v_count integer;
  v_tier text;
begin
  select count(*) into v_count from public.clinics where account_id = v_account;
  select id into v_tier from public.billing_plans
    where v_count >= min_clinics and (max_clinics is null or v_count <= max_clinics)
    order by min_clinics desc limit 1;
  if v_tier is not null then
    update public.accounts set tier = v_tier where id = v_account;
  end if;
  return null;
end;
$$;

drop trigger if exists clinics_recompute_tier on public.clinics;
create trigger clinics_recompute_tier
  after insert or delete on public.clinics
  for each row execute function public.recompute_account_tier();
```

**Note on `owner_user_id` on clinics:** it stays (each clinic still records its owner = account owner), but is no longer unique. The account is the tenant boundary; the clinic is a branch under it.

**Adding a clinic (app path):** a new `add-clinic` needs to insert a clinics row under the caller's account. Since RLS on clinics currently only has the owner-read/write via account, adding a clinic is a service-role edge function (`add-clinic`) that: verifies the caller (callerAccountId), inserts a clinic with `account_id` = caller's account, name from body. (Direct client insert into clinics would need a new RLS insert policy; an edge function keeps it controlled and lets us enforce limits + tier recompute.) Tier recompute fires via the trigger.

---

## FULL isolation re-verification (controller-run, BEFORE merge)

Create **two** throwaway accounts A and B, each via signup (1 clinic each), then add a 2nd clinic to A (via add-clinic / SQL). Get owner JWTs for both.

For EACH of the 22 tenant tables, prove:
1. **A sees only A's active clinic's rows.** With `x-clinic-id: A_clinic1`, seed a row; SELECT returns it. Switch `x-clinic-id: A_clinic2` → that row is NOT visible (different clinic of the same account); seed a row under clinic2, visible only under clinic2.
2. **Cross-account read blocked.** As A (JWT_A) with `x-clinic-id: B_clinic` → SELECT returns 0 rows (current_clinic_id = NULL). As A with no header → 0 rows.
3. **Cross-account write blocked.** As A with `x-clinic-id: B_clinic` → INSERT → denied (clinic_id NULL / RLS). As A with `x-clinic-id: B_clinic` → UPDATE/DELETE of B's row → 0 rows affected.
4. **Own multi-clinic switching works.** A can read/write both A_clinic1 and A_clinic2 by switching the header.

Representative table for the full curl matrix: `patients`. Then a scripted sweep asserting the same SELECT-isolation for all 22 tables (as A with B's header → 0 rows on every table).

Invariants still hold: 66 gated write policies; `clinic_is_writable()` fail-open; `settle_invoice` on accounts; billing single-sourced on accounts. Tier recompute: adding A's 2nd clinic flips A's account tier to `tier_2_6`.

Clean up ALL test accounts/clinics/rows (Mode B).

---

## Count-based billing (self-serve boundary)
- tier_1 (1) and tier_2_6 (2–6) are self-serve → create-invoice prices them (₱699 / ₱1,499 monthly; ₱7,000 / ₱15,000 annual).
- Reaching 7 clinics sets tier_6plus (self_serve=false) → create-invoice returns `plan_not_self_serve`; the UI routes to the contact flow. (Adding the 7th clinic should warn the owner they move to contact pricing — UI copy.)

## Frontend (clinic-app + landing)
- **x-clinic-id injection:** configure the supabase client with a custom `global.fetch` that reads the active clinic id from a store (zustand) and sets the `x-clinic-id` header on every request. Switching updates the store (no client recreation).
- **Active-clinic store + switcher:** a nav dropdown listing the account's clinics; selecting one updates the store and refetches (react-query invalidate). Persist the selection (localStorage) with a sensible default (first clinic) on load.
- **Add clinic:** a small flow calling the `add-clinic` edge function; on success, refetch the clinic list and switch to it. Warn when the add crosses into tier_6plus (contact).
- **Landing:** remove the "Coming Soon" state — `tier_2_6` becomes a normal "Start free trial" card (signups begin at 1 clinic and grow into it); `tier_6plus` stays the contact CTA. Update `comingSoon` flags / rendering accordingly.
- **Billing display:** SettingsPage already reads the account; show the current clinic count and tier.

## Stop
After the full isolation re-verification passes and everything is committed on the branch, STOP and hand off for the user's verification BEFORE merging to main / deploying.
