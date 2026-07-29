# Phase A Implementation Plan — Pricing tiers, 18-day trial, annual billing, read-only redirect

> **Scope discipline:** Phase A ships on the CURRENT single-clinic-per-account model. Every account has exactly one clinic, so every account is the **1-clinic tier**. Count-based tiering (2–6, 6+) is defined in data now but only becomes *reachable* in Phase C (multi-clinic). Do NOT touch `current_clinic_id()`, the 22-table isolation, `settle_invoice()`, the webhook re-verify, `clinic_is_writable()` fail-open, or the H1 fixes. Additive only. LIVE clinic DB (`ehirqsqkfnjuuvzthsrx`).

**Goal:** New clinic-count pricing (₱699 / ₱1,499 / contact), 18-day trial, monthly **and** annual billing, and a read-only "redirect to pay" experience — without disturbing the verified isolation/settlement.

**Two parallel agents** (separate worktrees, coordinated merge):
- **Agent 1 — Pricing vertical** (owns all pricing-coupled files + the only DB work).
- **Agent 2 — Read-only redirect UX** (clinic-app only, DB-free, independent files).

---

## Target pricing model

`billing_plans` becomes tier-by-clinic-count with monthly **and** annual amounts:

| id | display_name | min_clinics | max_clinics | monthly_centavos | annual_centavos | self_serve |
|---|---|---|---|---|---|---|
| `tier_1` | 1 clinic | 1 | 1 | 69900 | 700000 | true |
| `tier_2_6` | 2–6 clinics | 2 | 6 | 149900 | 1500000 | true |
| `tier_6plus` | 6+ clinics | 7 | (null) | (null) | (null) | false |

₱699→69900, ₱7,000→700000, ₱1,499→149900, ₱15,000→1500000. `tier_6plus` has null amounts (request pricing, not self-serve).

**Billing period** (`monthly`/`annual`) is chosen at the **pay screen after the trial**, never at signup. Signup just starts an 18-day trial at `tier_1`.

---

## Agent 1 — Pricing vertical

**Files (owns exclusively):** `supabase/migrations/0011_pricing_tiers.sql`, `supabase/migrations/0012_trial_18_and_serverside_plan.sql`, `supabase/functions/create-invoice/index.ts`, `app/src/lib/plans.ts`, `app/src/lib/plans.test.ts`, `clinic-app/src/lib/api.ts` (`getClinicBilling`), `clinic-app/src/types/models.ts` (`ClinicBilling`), `clinic-app/src/features/settings/SettingsPage.tsx` (billing amount display), `app/src/sections/Pricing.tsx`, `app/src/pages/PricingPage.tsx`, `app/src/pages/CheckoutPage.tsx`.

### Task A1.1 — Migration 0011: pricing tiers

`supabase/migrations/0011_pricing_tiers.sql`:
```sql
-- 0011_pricing_tiers.sql — clinic-count pricing tiers with monthly + annual.
-- Replaces the solo/clinic/multibranch plan enum. Additive + migrates the one
-- existing clinic's plan so the clinics.plan FK stays satisfied.

-- 1. New tier columns (amounts nullable: tier_6plus is request-priced).
alter table public.billing_plans
  add column if not exists min_clinics integer,
  add column if not exists max_clinics integer,
  add column if not exists monthly_centavos integer,
  add column if not exists annual_centavos integer;

-- 2. Relax the legacy amount_centavos so request-priced tiers can exist.
alter table public.billing_plans alter column amount_centavos drop not null;
alter table public.billing_plans drop constraint if exists billing_plans_amount_centavos_check;

-- 3. Seed the new tiers.
insert into public.billing_plans
  (id, display_name, min_clinics, max_clinics, monthly_centavos, annual_centavos, amount_centavos, self_serve)
values
  ('tier_1',    '1 clinic',    1, 1,    69900,  700000,  69900,  true),
  ('tier_2_6',  '2–6 clinics', 2, 6,   149900, 1500000, 149900, true),
  ('tier_6plus','6+ clinics',  7, null, null,   null,    null,   false)
on conflict (id) do update set
  display_name     = excluded.display_name,
  min_clinics      = excluded.min_clinics,
  max_clinics      = excluded.max_clinics,
  monthly_centavos = excluded.monthly_centavos,
  annual_centavos  = excluded.annual_centavos,
  amount_centavos  = excluded.amount_centavos,
  self_serve       = excluded.self_serve,
  updated_at       = now();

-- 4. Migrate existing clinics off the old plan ids (all are 1 clinic -> tier_1).
update public.clinics
  set plan = 'tier_1'
  where plan in ('solo', 'clinic', 'multibranch');

-- 5. Drop the old plan rows now that nothing references them.
delete from public.billing_plans where id in ('solo', 'clinic', 'multibranch');
```

Apply: `npx supabase db push --dry-run --linked` (show), then `--linked --yes`. Verify:
```sql
select id, min_clinics, max_clinics, monthly_centavos, annual_centavos, self_serve
from public.billing_plans order by min_clinics;
-- expect 3 tiers as above
select plan from public.clinics;  -- expect tier_1 for existing clinic(s)
```

### Task A1.2 — Migration 0012: 18-day trial + server-side plan

`supabase/migrations/0012_trial_18_and_serverside_plan.sql`:
```sql
-- 0012 — trial is 18 days (was 14) and the tier is server-authoritative.
-- Supersedes the 0010 trigger. The client no longer influences trial length
-- OR tier: a new account always starts an 18-day trial at tier_1 (one clinic).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_clinic_name text := nullif(meta->>'clinic_name', '');
  v_trial_end timestamptz := now() + interval '18 days';
begin
  -- A signup is identified by clinic_name in the metadata.
  if v_clinic_name is null then
    return new;
  end if;

  insert into public.clinics (
    owner_user_id, name, contact_name, phone, plan,
    trial_end, paid_until, subscription_status
  )
  values (
    new.id, v_clinic_name,
    nullif(meta->>'contact_name', ''),
    nullif(meta->>'phone', ''),
    'tier_1',            -- server-side: every new account is one clinic
    v_trial_end,
    v_trial_end,
    'trialing'
  )
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;
```
Apply + verify with a throwaway auth user (see the pattern used in prior tasks): metadata `plan` set to junk → clinic lands `plan='tier_1'`, `trial_end ≈ now()+18d`. **Clean up the throwaway user.**

### Task A1.3 — Migration 0013: invoice billing_period + clinic billing_period

`supabase/migrations/0013_billing_period.sql`:
```sql
-- Records which cadence an invoice/clinic is on. Chosen at the pay screen.
alter table public.billing_invoices
  add column if not exists billing_period text
  check (billing_period in ('monthly','annual'));

alter table public.clinics
  add column if not exists billing_period text
  check (billing_period in ('monthly','annual'));
```

### Task A1.4 — create-invoice: period + tier pricing

Rework `supabase/functions/create-invoice/index.ts`:
- Read `period` from the POST body: `'monthly' | 'annual'` (a product choice — the SERVER still prices it; the body never carries an amount). Default to the clinic's stored `billing_period`, else `'monthly'`. Reject anything else.
- Select the clinic's tier via the existing `billing_plans!inner(...)` embed, now selecting `monthly_centavos, annual_centavos, self_serve`.
- `amountCentavos = period === 'annual' ? annual_centavos : monthly_centavos`. If the chosen amount is null (tier_6plus / request-priced) → `json(400, {error:'plan_not_self_serve'})`.
- `period_end = addOneMonthUTC(periodStart)` for monthly, or a new `addOneYearUTC(periodStart)` for annual (clamp Feb 29 → Feb 28 the same way).
- Persist `billing_period` on the invoice row and on the clinic (so renewals/cron reuse it).
- Keep everything else identical (idempotency, reuse, qrImageDataUrl-always, full-UUID external_id, metadata).

`addOneYearUTC`:
```ts
function addOneYearUTC(d: Date): Date {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCFullYear(r.getUTCFullYear() + 1);
  if (r.getUTCDate() < day) r.setUTCDate(0); // Feb 29 -> Feb 28
  return r;
}
```

Deploy and **verify against the live sandbox** (reuse the throwaway-clinic + JWT + temp `simpay` pattern from Tasks 7–8, then clean up ALL test rows):
- `create-invoice` with `{"period":"annual"}` → amount **700000**, period_end = periodStart + 1 year.
- `create-invoice` with `{"period":"monthly"}` → amount **69900**, period_end + 1 month.
- amount override in body still ignored.
- settle one via the poll → paid_until advances by the right period.
- Test the month-end clamp for annual on a Feb-29 anchor if feasible.

### Task A1.5 — Landing pricing + drift test

- `app/src/lib/plans.ts`: replace the three plans with the new tiers. Keep the `Plan[]` shape but add `annualPrice: number | null` and `annualPriceLabel: string | null`. tier_1 (₱699/mo, ₱7,000/yr, ctaKind checkout), tier_2_6 (₱1,499/mo, ₱15,000/yr, ctaKind checkout), tier_6plus (contact, ctaKind sales, price null). `getPlan` default → tier_1.
- `app/src/lib/plans.test.ts`: rewrite the drift test to parse `0011_pricing_tiers.sql` and assert each landing tier's monthly (×100) == `monthly_centavos` and annual (×100) == `annual_centavos`; tier_6plus has null amounts. Prove it fails on an injected drift, then reverts.
- `app/src/sections/Pricing.tsx`, `app/src/pages/PricingPage.tsx`: render the three tiers with "₱X/mo or ₱Y/yr"; 6+ shows "Contact us". Only tier_1 and tier_2_6 are self-serve CTAs; 6+ → the existing sales/mailto path.
- `app/src/pages/CheckoutPage.tsx`: signup is a plain 18-day trial (no plan/period selection). If a `?plan=` param exists, it's cosmetic only — the server forces tier_1. Copy: "18-day free trial" (was 14).

### Task A1.6 — clinic-app billing display

- `clinic-app/src/lib/api.ts` `getClinicBilling`: change the embed to `billing_plans!inner(display_name, monthly_centavos, annual_centavos)`. Return `planLabel` = display_name and `planMonthlyCentavos`/`planAnnualCentavos`. Keep the `Array.isArray` normalize + single-string `.select(...)`.
- `clinic-app/src/types/models.ts` `ClinicBilling`: replace `planAmountCentavos` with `planMonthlyCentavos: number | null`, `planAnnualCentavos: number | null`, and add `billing_period: 'monthly'|'annual'|null`.
- `clinic-app/src/features/settings/SettingsPage.tsx`: show the tier label + "₱X/mo or ₱Y/yr" from the new fields. If a `billing_period` is set, highlight the active cadence.

**Agent 1 verification:** `cd app && npm run build && npm test` (drift test green, fails-on-drift proven); `cd clinic-app && npm run build`; migrations applied + create-invoice sandbox-verified; all test rows cleaned up.

---

## Agent 2 — Read-only redirect-to-pay UX (clinic-app only)

**Files (owns exclusively):** `clinic-app/src/features/billing/ReadOnlyGate.tsx` (new), and the wiring in the app shell/router (`clinic-app/src/components/layout/Layout.tsx` and/or the router) to mount it. Uses the EXISTING `accessTier()` (`clinic-app/src/lib/access.ts`), `useClinicBilling()` hook, and `PayInvoiceCard` (all already built) — do NOT modify those; import and compose them.

**Requirement:** On a **definite** `read_only` tier, present a prominent "redirect to payment" experience that shows the QR/invoice to unlock — while keeping patient records **viewable and exportable** (reads stay open; this is patient-safe, NOT a full lockout). Fail-open is preserved: `accessTier` already returns `full` on unknown/unparseable state, so the gate only ever engages on a definite lapse.

### Task A2.1 — ReadOnlyGate component
`clinic-app/src/features/billing/ReadOnlyGate.tsx`:
- Reads `useClinicBilling()`; computes `tier = accessTier(billing.paid_until, billing.grace_days ?? 7, billing.subscription_status)`.
- If `tier !== 'read_only'` → render nothing (children pass through).
- If `read_only` → render a prominent interstitial that:
  - States clearly: subscription lapsed; **records are safe, still viewable and exportable**; new entries are paused until payment.
  - Embeds `<PayInvoiceCard onPaid={refetch}>` so the QR is right there to unlock.
  - Offers an explicit "Continue to view records (read-only)" action so the user can still reach read/export views — must NOT hard-block navigation to reads (patient safety).
- Style with clinic-app's real `@theme` tokens (danger/warning/primary), matching `AccessBanner`.

### Task A2.2 — Wire it in
Mount `ReadOnlyGate` in the authenticated shell so it engages app-wide on `read_only`. On any write-oriented route (new patient, new appointment, etc.) it should steer to pay; on read routes it allows viewing. Keep the existing `AccessBanner` for the `grace` tier (unchanged). Reuse the `?tab=billing` deep link.

**Agent 2 verification:** `cd clinic-app && npm run build && npm test` (existing 6 access tests still pass). Since a live lapsed clinic + payment is a full e2e, verify by reading the code + build; note that runtime verification happens in the coordinated post-merge sandbox pass.

---

## Coordinated merge + verification (controller)

1. Merge Agent 1's branch → run `app` + `clinic-app` build & tests, confirm the drift test passes (needs both plans.ts + 0011 present).
2. Merge Agent 2's branch → rebuild clinic-app.
3. Final sandbox pass: throwaway clinic → force `read_only` → confirm ReadOnlyGate shows the pay screen, records still readable; pay via sandbox sim → gate clears. Clean up all test rows (Mode B).
4. Re-confirm the PRESERVED invariants are untouched: `current_clinic_id()` unchanged, 22-table SELECT isolation intact, `settle_invoice` idempotency, fail-open gate. Then Phase A is done; **stop before Phase B.**
