# NextPay QRPh Subscription Billing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Ava Smart Dental's display-only trial into real, enforced, money-collecting subscription billing — trial-first signup, then a monthly QRPh invoice through NextPay Partners API v2.

**Architecture:** Trial-first (model A). Signup stays free and instant — no payment at checkout, so the fake card step is deleted outright. The clinic gets 14 days, then a **monthly QR invoice**: a QRPh payment intent minted server-side, shown in Settings → Billing and emailed at T-7/T-3/T-1. Access is gated on a new `clinics.paid_until` column, enforced in **Postgres RLS** (not just UI) via a `clinic_is_writable()` predicate: full access → 7-day grace (banner, still writable) → read-only (records fully viewable and exportable, new entries blocked). Data is never deleted. All server code runs as **Supabase Edge Functions** (Deno), reachable natively by both the landing site and the clinic PWA.

**Tech Stack:** Supabase (Postgres + RLS + Edge Functions/Deno + pg_cron), NextPay Partners API v2 (QRPh), React 19 + Vite + TypeScript, Vitest (new).

---

## Ground rules (from `nextpay-kit/NEXTPAY-INTEGRATION-GUIDE.md`)

These are non-negotiable and every task below inherits them:

1. **Price server-side only.** The charged amount is read from the `billing_plans` table. No amount ever comes from a request body. (Guide §7 rule 1 — a drifted duplicate price table once nearly overcharged a customer ₱8,500.)
2. **Verify before you grant.** Before extending `paid_until`, re-`GET` the intent from NextPay and require `status === "succeeded"`. Never trust a webhook. (Guide §7 rule 3.) In this trial-first model the risk moved here — provisioning is free, *extending paid time* is what costs money.
3. **Idempotency keys on every create.** Both the poll and the webhook can fire at once; extending must be safe to run twice.
4. **Amounts are integer centavos**, `currency: "PHP/2"`. ₱1,499 → `149900`.
5. **`pk_*` client id + secret are secret** — Supabase function secrets only, never git. `account_id` is not secret.

**Sandbox for all of this.** `NEXTPAY_ACCOUNT_ID=ce437d23-b5b2-4a4d-8ba2-c7263934fe3e` (sandbox, minted against the *sandbox* merchant `87d1bbf3-…` — **not** the `4ca76807-…` live merchant the kit's `.env.example` hardcodes). Live values get swapped in at go-live; only the key prefix and account id change.

---

## Email delivery — Resend

Supabase Auth's SMTP sends auth mail only; it will not send billing reminders. **Resend** is the chosen provider. It stays behind the one-function adapter `sendBillingEmail()` in Task 10 so swapping it out is a single edit, and it never throws — a failed reminder must not abort the cron run.

Before Task 10: create the Resend API key, verify the `avasmartdental.ph` sending domain, then

```bash
npx supabase secrets set RESEND_API_KEY=re_xxx \
  BILLING_EMAIL_FROM="Ava Smart Dental <billing@avasmartdental.ph>"
```

---

## File Structure

**Created:**
| Path | Responsibility |
|---|---|
| `supabase/migrations/0004_billing.sql` | `billing_plans`, `clinics.paid_until`, `billing_invoices`, access-tier functions |
| `supabase/migrations/0005_write_gate.sql` | Re-issue write RLS on the 22 tenant tables behind `clinic_is_writable()` |
| `supabase/functions/_shared/nextpayClient.ts` | Deno/Web-standard port of the kit client |
| `supabase/functions/_shared/http.ts` | `Response`-shaped JSON/CORS helpers + secure token |
| `supabase/functions/_shared/db.ts` | Service-role Supabase client factory |
| `supabase/functions/create-invoice/index.ts` | Mint the QRPh intent for a clinic's next period |
| `supabase/functions/invoice-status/index.ts` | Re-verify with NextPay, extend `paid_until` |
| `supabase/functions/nextpay-webhook/index.ts` | Webhook nudge → same verified path |
| `supabase/functions/billing-cron/index.ts` | Reminders, invoice generation, status transitions |
| `supabase/config.toml` | CLI project config + per-function `verify_jwt` |
| `app/src/lib/nextpayClient.test.ts` | Unit test: Basic auth header + request body shape |
| `app/src/lib/plans.test.ts` | **Drift test** — display prices must equal `billing_plans` |
| `clinic-app/src/features/billing/*` | Invoice + QR UI in Settings → Billing |
| `clinic-app/src/lib/access.ts` | Client mirror of the access tier |

**Modified:**
| Path | Change |
|---|---|
| `app/src/pages/CheckoutPage.tsx` | 3 steps → 2 (Account → Review) |
| `app/src/components/checkout/ReviewStep.tsx` | Drop card summary + "authorize NextPay to charge my card" |
| `app/src/components/checkout/BuildingAnimation.tsx` | Drop the fake "Tokenizing your card with NextPay" step |
| `clinic-app/src/features/settings/SettingsPage.tsx` | Delete duplicated `PLAN_INFO`; real billing section |
| `clinic-app/src/lib/api.ts` | `getClinicBilling` returns `paid_until` + tier |

**Deleted:** `app/src/components/checkout/PaymentForm.tsx` (card capture that never sent anywhere).

---

## Task 0: Test tooling

Neither app has any test runner. Everything below is TDD, so this comes first.

**Files:** Modify `app/package.json`, `clinic-app/package.json`; Create `app/vitest.config.ts`, `clinic-app/vitest.config.ts`

- [ ] **Step 1: Install Vitest in both apps**

```bash
cd app && npm i -D vitest@^3 && cd ../clinic-app && npm i -D vitest@^3
```

- [ ] **Step 2: Add the test script to both `package.json` files**

In `app/package.json` and `clinic-app/package.json`, inside `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `app/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `clinic-app/vitest.config.ts`**

`clinic-app` uses the `@/` path alias (see `clinic-app/vite.config.ts`), so the config must resolve it or imports will fail.

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Verify both runners start**

Run: `cd app && npm test`
Expected: exits 0 with "No test files found" (no tests yet — that is correct).

Run: `cd clinic-app && npm test`
Expected: same.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/package-lock.json app/vitest.config.ts \
        clinic-app/package.json clinic-app/package-lock.json clinic-app/vitest.config.ts
git commit -m "test: add vitest to app and clinic-app"
```

---

## Task 1: Billing schema

The authority for prices, paid-through dates, and invoices.

**Files:** Create `supabase/migrations/0004_billing.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0004_billing.sql — subscription billing: server-side prices, paid-through
-- tracking, monthly QRPh invoices, and the access-tier functions that gate
-- writes once a clinic stops paying.

-- ---------------------------------------------------------------------------
-- 1. billing_plans — THE server-side price table. Single source of truth for
--    what a clinic is charged. Amounts are integer centavos (NextPay "PHP/2").
--    Never charge from a request body. (Guide §7 rule 1.)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id text primary key,
  display_name text not null,
  amount_centavos integer not null check (amount_centavos > 0),
  self_serve boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.billing_plans (id, display_name, amount_centavos, self_serve) values
  ('solo',        'Solo',         149900, true),
  ('clinic',      'Clinic',       299900, true),
  ('multibranch', 'Multi-branch', 499900, false)
on conflict (id) do update
  set display_name    = excluded.display_name,
      amount_centavos = excluded.amount_centavos,
      self_serve      = excluded.self_serve,
      updated_at      = now();

alter table public.billing_plans enable row level security;

-- Prices are public information (they are on the pricing page).
drop policy if exists "anyone reads plans" on public.billing_plans;
create policy "anyone reads plans"
  on public.billing_plans for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. clinics.paid_until — the real entitlement clock.
--    During the trial it equals trial_end; each paid invoice pushes it forward
--    one month. THIS is what gates access, not trial_end.
-- ---------------------------------------------------------------------------
alter table public.clinics
  add column if not exists paid_until timestamptz;

update public.clinics
  set paid_until = trial_end
  where paid_until is null;

alter table public.clinics
  alter column paid_until set not null;

-- Grace period is uniform for now but lives on the row so support can extend
-- it for one clinic without a code change.
alter table public.clinics
  add column if not exists grace_days integer not null default 7
  check (grace_days >= 0 and grace_days <= 60);

-- ---------------------------------------------------------------------------
-- 3. billing_invoices — one row per monthly charge attempt.
--    external_id is what we send to NextPay; it is unique so a retried
--    generation can never mint two intents for the same period.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  plan_id text not null references public.billing_plans (id),
  amount_centavos integer not null check (amount_centavos > 0),
  period_start timestamptz not null,
  period_end timestamptz not null,
  external_id text not null unique,
  payment_intent_id text,
  qr_string text,
  qr_expires_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'paid', 'expired', 'canceled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_invoices_period_valid check (period_end > period_start),
  -- At most one unpaid invoice per clinic per period.
  unique (clinic_id, period_start)
);

create index if not exists billing_invoices_clinic_idx
  on public.billing_invoices (clinic_id, created_at desc);
create index if not exists billing_invoices_open_idx
  on public.billing_invoices (status) where status = 'open';

alter table public.billing_invoices enable row level security;

-- Owners may READ their invoices. They may never write them — only the
-- service role (edge functions) writes, and only after verifying with NextPay.
drop policy if exists "owners read own invoices" on public.billing_invoices;
create policy "owners read own invoices"
  on public.billing_invoices for select
  to authenticated
  using (clinic_id = public.current_clinic_id());

drop trigger if exists billing_invoices_set_updated_at on public.billing_invoices;
create trigger billing_invoices_set_updated_at
  before update on public.billing_invoices
  for each row execute function public.set_updated_at();

drop trigger if exists billing_plans_set_updated_at on public.billing_plans;
create trigger billing_plans_set_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Access tier — derived from dates, never stored, so it can never go stale.
--      full      : paid_until in the future
--      grace     : past paid_until but within grace_days — still writable,
--                  the UI shows a warning banner
--      read_only : past grace — records stay fully readable and exportable,
--                  new entries are blocked. Nothing is ever deleted.
--
-- Returns NULL when the clinic is unknown or its state is unreadable. Callers
-- must treat NULL as "don't know", never as "not entitled" — see
-- clinic_is_writable() below for why.
-- ---------------------------------------------------------------------------
create or replace function public.clinic_access_tier(p_clinic_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.subscription_status = 'canceled' then 'read_only'
    when c.paid_until is null then null           -- unknown, not "unpaid"
    when now() <= c.paid_until then 'full'
    when now() <= c.paid_until
                  + make_interval(days => coalesce(c.grace_days, 7)) then 'grace'
    else 'read_only'
  end
  from public.clinics c
  where c.id = p_clinic_id;
$$;

-- Writable — used by the write RLS policies in 0005.
--
-- DELIBERATELY FAIL-OPEN. Only a definitive 'read_only' blocks a write;
-- anything unknown (no clinic row, null paid_until, unreadable state) allows
-- it. The two failure modes are not symmetric:
--   * Wrong in our favour  -> a PAYING clinic cannot record a treatment.
--     That is a patient-safety problem.
--   * Wrong in their favour -> someone gets a few days of unpaid use.
--     That is a small, recoverable revenue problem.
-- We take the revenue risk every time.
--
-- This does NOT weaken tenant isolation. The policies read
--   clinic_id = current_clinic_id() AND clinic_is_writable()
-- so when current_clinic_id() is NULL the first predicate is already NULL and
-- the write is refused regardless. Fail-open here only ever answers the
-- question "have they paid?", never "is this row theirs?".
create or replace function public.clinic_is_writable()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.clinic_access_tier(public.current_clinic_id()) is distinct from 'read_only',
    true
  );
$$;

grant execute on function public.clinic_access_tier(uuid) to authenticated;
grant execute on function public.clinic_is_writable() to authenticated;
```

- [ ] **Step 2: Apply it**

```bash
npx supabase db push
```

Expected: `Applying migration 0004_billing.sql... done.`

- [ ] **Step 3: Verify the tier function against real dates**

Run in the SQL Editor:

```sql
select id, name, plan, trial_end, paid_until,
       public.clinic_access_tier(id) as tier
from public.clinics;
```

Expected: every existing clinic has `paid_until = trial_end`, and `tier` is `full` for any clinic whose trial has not ended. A clinic whose `trial_end` passed more than 7 days ago must read `read_only` — that is the whole point of this task.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_billing.sql
git commit -m "feat(billing): plans, paid_until, invoices, access tiers"
```

---

## Task 2: Enforce the write gate in RLS

**This is the highest-value task in the plan.** Until it lands, `trial_end` is decorative and nobody ever has a reason to pay. It must be enforced in Postgres — a UI-only gate is bypassed by any direct API call with the anon key.

**Files:** Create `supabase/migrations/0005_write_gate.sql`

- [ ] **Step 1: Write the migration**

`0003_multi_tenant.sql` created `tenant_insert` / `tenant_update` / `tenant_delete` on 22 tables keyed only on `clinic_id = current_clinic_id()`. This re-issues those three (select is untouched — reading always stays open) with the writability predicate added.

```sql
-- 0005_write_gate.sql — writes require an entitled clinic.
--
-- SELECT policies are deliberately NOT touched: a lapsed clinic must keep
-- full read access to its own patient records, including export. Only the
-- creation of new data stops. Nothing is ever deleted for non-payment.

do $$
declare
  t text;
  tables text[] := array[
    'dentists','patients','medical_histories','consent_forms','dental_charts',
    'tooth_records','treatments','invoices','invoice_items','installment_plans',
    'installment_schedule','payments','appointments','file_assets','drugs',
    'prescriptions','services','clinic_settings','payment_terms','notifications',
    'expense_categories','expenses'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists tenant_insert on public.%I', t);
    execute format($f$
      create policy tenant_insert on public.%I
        for insert to authenticated
        with check (clinic_id = public.current_clinic_id()
                    and public.clinic_is_writable())
    $f$, t);

    execute format('drop policy if exists tenant_update on public.%I', t);
    execute format($f$
      create policy tenant_update on public.%I
        for update to authenticated
        using (clinic_id = public.current_clinic_id())
        with check (clinic_id = public.current_clinic_id()
                    and public.clinic_is_writable())
    $f$, t);

    execute format('drop policy if exists tenant_delete on public.%I', t);
    execute format($f$
      create policy tenant_delete on public.%I
        for delete to authenticated
        using (clinic_id = public.current_clinic_id()
               and public.clinic_is_writable())
    $f$, t);
  end loop;
end $$;
```

- [ ] **Step 2: Apply**

```bash
npx supabase db push
```

- [ ] **Step 3: Prove the gate actually bites**

This is the test that matters. In the SQL Editor, impersonating a real clinic owner:

**Structural check (works even with an empty DB — no session needed):**

```sql
-- Every one of the 22 tenant tables must carry all three write policies with
-- the entitlement gate. NOTE: coalesce BOTH qual and with_check — an INSERT
-- policy has qual = NULL, and `NULL || anything` is NULL, which would silently
-- under-count. (This bit us once; the fixed form is below.)
select count(*) as gated_write_policies
from pg_policies
where schemaname = 'public'
  and policyname in ('tenant_insert','tenant_update','tenant_delete')
  and coalesce(qual,'') || ' ' || coalesce(with_check,'') like '%clinic_is_writable%';
-- expect: 66  (22 tables x 3 policies)

-- SELECT policies must be untouched — reads stay open for lapsed clinics.
select count(*) as ungated_selects
from pg_policies
where schemaname = 'public' and policyname = 'tenant_select'
  and coalesce(qual,'') not like '%clinic_is_writable%';
-- expect: 22
```

**Behavioral check (only once a real clinic + owner session exists):**

```sql
-- Pick a clinic and force it past grace.
update public.clinics
   set paid_until = now() - interval '30 days'
 where id = '<TEST_CLINIC_ID>';

select public.clinic_access_tier('<TEST_CLINIC_ID>');  -- expect: read_only
```

Then, signed in as that clinic's owner in the clinic app (or via the REST API with their JWT):

```bash
curl -X POST "$SUPABASE_URL/rest/v1/patients" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $OWNER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Gate","last_name":"Test"}'
```

Expected: **HTTP 403**, `new row violates row-level security policy for table "patients"`.

Then confirm reads still work — a lapsed clinic must never lose sight of its records:

```bash
curl "$SUPABASE_URL/rest/v1/patients?select=id,first_name&limit=5" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $OWNER_JWT"
```

Expected: **HTTP 200** with rows.

- [ ] **Step 4: Prove the gate FAILS OPEN on unknown state**

The gate must only ever block on a definitive `read_only`. A paying clinic that
cannot record a treatment is a patient-safety problem; a few days of unpaid use
is not. Confirm the asymmetry holds:

```sql
-- 'unknown' state must NOT block.
select public.clinic_access_tier('00000000-0000-0000-0000-000000000000') is null
       as tier_is_unknown;   -- expect: true
```

Expected: `tier_is_unknown = true`, and `clinic_is_writable()` returns **true**
for that unknown clinic — not false. Verify directly:

```sql
select coalesce(
  public.clinic_access_tier('00000000-0000-0000-0000-000000000000')
    is distinct from 'read_only', true) as writable;  -- expect: true
```

If this returns `false`, the function is fail-closed and must be fixed before
going further — that bug silently locks out paying clinics.

- [ ] **Step 5: Restore the test clinic**

```sql
update public.clinics set paid_until = trial_end where id = '<TEST_CLINIC_ID>';
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_write_gate.sql
git commit -m "feat(billing): gate writes on entitlement, keep reads open"
```

---

## Task 3: Kill the duplicated price table

Guide §7 rule 1 is about exactly the bug already present here: `app/src/lib/plans.ts` says ₱1,499/₱2,999/₱4,999 and `SettingsPage.tsx:1189` repeats them in `PLAN_INFO`. Two copies drift.

**Files:** Create `app/src/lib/plans.test.ts`; Modify `clinic-app/src/features/settings/SettingsPage.tsx`, `clinic-app/src/lib/api.ts`

- [ ] **Step 1: Write the failing drift test**

Create `app/src/lib/plans.test.ts`. It pins the display prices to the migration's centavo values, so changing one without the other fails CI.

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { plans } from "./plans";

/**
 * The charging authority is public.billing_plans (0004_billing.sql). The
 * marketing page keeps its own copy for layout reasons, so this test asserts
 * the two never drift. Guide §7 rule 1 — a stale duplicate once meant a
 * customer would have been charged ₱8,500 over the advertised price.
 */
function migrationPrices(): Record<string, number> {
  const sql = readFileSync(
    resolve(__dirname, "../../../supabase/migrations/0004_billing.sql"),
    "utf8",
  );
  const out: Record<string, number> = {};
  const re = /\('([a-z]+)',\s*'[^']*',\s*(\d+),/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) out[m[1]] = Number(m[2]);
  return out;
}

describe("plan prices", () => {
  const fromSql = migrationPrices();

  it("parses every plan out of the migration", () => {
    expect(Object.keys(fromSql).sort()).toEqual([
      "clinic",
      "multibranch",
      "solo",
    ]);
  });

  it.each(plans)("$id display price matches billing_plans", (plan) => {
    expect(fromSql[plan.id]).toBe(plan.price * 100);
  });
});
```

- [ ] **Step 2: Run it — it must pass immediately**

Run: `cd app && npm test`
Expected: **PASS**, 4 tests. (It passes now because the values agree today; its job is to fail the day someone edits one side alone. Verify it works by temporarily changing `price: 1499` to `1599` in `plans.ts` — the test must fail — then change it back.)

- [ ] **Step 3: Delete `PLAN_INFO` from the clinic app**

In `clinic-app/src/features/settings/SettingsPage.tsx`, remove the `PLAN_INFO` constant near line 1189 entirely and read the plan from the API instead. In `clinic-app/src/lib/api.ts`, extend `getClinicBilling`:

```ts
export async function getClinicBilling(): Promise<ClinicBilling | null> {
  const { data, error } = await supabase
    .from('clinics')
    .select(
      'id, name, plan, trial_end, paid_until, subscription_status, created_at,' +
      ' billing_plans!inner(display_name, amount_centavos)'
    )
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...data,
    planLabel: data.billing_plans.display_name,
    planAmountCentavos: data.billing_plans.amount_centavos,
  } as ClinicBilling;
}
```

Update `ClinicBilling` in `clinic-app/src/types/models.ts:315` to add `paid_until: string`, `planLabel: string`, `planAmountCentavos: number`. Render prices with `planAmountCentavos / 100`.

- [ ] **Step 4: Typecheck both apps**

Run: `cd app && npm run build && cd ../clinic-app && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/plans.test.ts clinic-app/src/features/settings/SettingsPage.tsx clinic-app/src/lib/api.ts clinic-app/src/types/models.ts
git commit -m "fix(billing): single price source, drift test, drop PLAN_INFO"
```

---

## Task 4: Checkout → 2 steps

Signup is free and instant. The card step captured a PAN, validated it with Luhn, and sent it precisely nowhere — it must go, not be rewired.

**Files:** Delete `app/src/components/checkout/PaymentForm.tsx`; Modify `CheckoutPage.tsx`, `ReviewStep.tsx`, `BuildingAnimation.tsx`

- [ ] **Step 1: Delete the card form**

```bash
git rm app/src/components/checkout/PaymentForm.tsx
```

- [ ] **Step 2: Reduce the wizard to two steps**

In `app/src/pages/CheckoutPage.tsx`: delete the `PaymentForm` and `PaymentData` imports, the `payment`/`emptyPayment` state, and `handlePaymentNext`. Then:

```ts
const steps = [
  { id: "account", label: "Account" },
  { id: "review", label: "Review" },
];
```

```tsx
{stepIdx === 0 && (
  <AccountForm initial={account} onNext={handleAccountNext} />
)}
{stepIdx === 1 && (
  <ReviewStep
    plan={plan}
    account={account}
    onBack={() => setStepIdx(0)}
    onEditAccount={() => setStepIdx(0)}
    onConfirm={handleConfirm}
  />
)}
```

`handleAccountNext` already sets `setStepIdx(1)` — now that is Review. Leave `handleConfirm` alone; free signup is unchanged.

- [ ] **Step 3: Strip payment language from Review**

In `ReviewStep.tsx`: remove the `payment` and `onEditPayment` props, the card summary block, and the **"I authorize NextPay to charge my card"** checkbox with its state. Nothing is charged today, so consenting to a charge is simply false. Replace with:

```tsx
<p className="text-sm text-fg-muted">
  Your 14-day trial starts now — no payment needed. We'll show you a
  GCash/Maya QR code before it ends.
</p>
```

- [ ] **Step 4: Remove the fake tokenization beat**

In `BuildingAnimation.tsx`, delete the `"Tokenizing your card with NextPay"` step from the steps array. It describes something that never happened.

- [ ] **Step 5: Verify no card references survive**

Run: `cd app && npx grep -r "PaymentForm\|cardNumber\|Tokenizing\|cvc" src/ || echo "clean"`
Expected: `clean`.

Run: `cd app && npm run build && npm test`
Expected: build succeeds, tests pass.

- [ ] **Step 6: Manually walk the flow**

Run: `cd app && npm run dev`, open `/checkout?plan=solo`.
Expected: two steps only; no card fields anywhere; signup completes and lands on `/checkout/success`.

- [ ] **Step 7: Commit**

```bash
git add -A app/src
git commit -m "feat(checkout): 2-step trial signup, remove non-functional card capture"
```

---

## Task 5: The NextPay client (Deno port)

Ported from `nextpay-kit/reference/nextpayClient.ts`. **Do not use the spa-app's client** — it uses a client-id + HMAC scheme against `api.nextpay.world` and 401s on everything.

Exactly two deliberate changes from the kit file: `Buffer.from(...).toString('base64')` → `btoa(...)` for Deno, and a `cancelPaymentIntent` method the kit omits (needed by the go-live check).

**Files:** Create `supabase/functions/_shared/nextpayClient.ts`, `app/src/lib/nextpayClient.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `app/src/lib/nextpayClient.test.ts`. Retyping the Basic-auth header is where these integrations break, so it is asserted byte-for-byte.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextPayClient } from "../../../supabase/functions/_shared/nextpayClient";

const OK = {
  id: "pi_123",
  status: "pending",
  amount: 149900,
  expires_at: "2026-07-19T12:15:00Z",
  payment_instrument: {
    id: "pm_456",
    actions: [
      {
        action_kind: "qr.present",
        client_instructions: {
          qrph_string: "00020101021228",
          qrph_base64_string: "aGVsbG8=",
        },
      },
    ],
  },
};

describe("NextPayClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(OK), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends HTTP Basic auth built from client id and secret", async () => {
    const c = new NextPayClient("pk_test_abc", "shh");
    await c.createPaymentIntent({
      accountId: "acct_1",
      externalId: "inv-1",
      amountCentavos: 149900,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(
      "Basic " + btoa("pk_test_abc:shh"),
    );
  });

  it("posts the documented body shape in centavos", async () => {
    const c = new NextPayClient("pk_test_abc", "shh");
    await c.createPaymentIntent({
      accountId: "acct_1",
      externalId: "inv-1",
      amountCentavos: 149900,
      metadata: { invoice_id: "abc" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.partners.nextpay.world/v2/payment-intents");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Idempotency-Key"]).toBe("pi-inv-1");
    expect(JSON.parse(init.body)).toEqual({
      account_id: "acct_1",
      external_id: "inv-1",
      amount: 149900,
      currency: "PHP/2",
      expires_in_seconds: 900,
      payment_instrument_options: {
        method_type: "qrph_p2m_reference",
        method_provider: "automatic",
      },
      metadata: { invoice_id: "abc" },
    });
  });

  it("pulls the QR out of the qr.present action", async () => {
    const c = new NextPayClient("pk_test_abc", "shh");
    const r = await c.createPaymentIntent({
      accountId: "acct_1",
      externalId: "inv-1",
      amountCentavos: 149900,
    });
    expect(r.qrString).toBe("00020101021228");
    expect(r.qrImageDataUrl).toBe("data:image/png;base64,aGVsbG8=");
    expect(r.instrumentId).toBe("pm_456");
  });

  it("throws NextPayError carrying the status code", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "bad key" }), { status: 401 }),
    );
    const c = new NextPayClient("ck_wrong", "shh");
    await expect(
      c.createPaymentIntent({
        accountId: "a",
        externalId: "b",
        amountCentavos: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("requires both credentials", () => {
    expect(() => new NextPayClient("", "shh")).toThrow(/required/);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd app && npm test`
Expected: FAIL — `Cannot find module '../../../supabase/functions/_shared/nextpayClient'`.

- [ ] **Step 3: Write the client**

Create `supabase/functions/_shared/nextpayClient.ts` — the kit file with the two changes noted above.

```ts
// Ported from nextpay-kit/reference/nextpayClient.ts for Deno.
// Changes from the kit original, and ONLY these:
//   1. Buffer.from(...).toString('base64') -> btoa(...)   (no node:buffer)
//   2. added cancelPaymentIntent() for the go-live wiring check
//
// Auth: HTTP Basic — Authorization: Basic base64(client_id:client_secret).
// Host is the same for sandbox and production; only the key prefix differs
// (pk_test_ / pk_live_). Amounts are integer centavos with currency "PHP/2".
// NOTE: the dashboard self-serve key (ck_…) does NOT work here — it 401s.

const DEFAULT_BASE_URL = 'https://api.partners.nextpay.world';

export interface CreatePaymentIntentArgs {
  accountId: string;
  externalId: string;
  amountCentavos: number;
  expiresInSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  id: string;
  status: string; // pending | succeeded | failed | canceled | expired
  amountCentavos: number;
  expiresAt: string | null;
  instrumentId: string | null;
  qrString: string | null;
  qrImageDataUrl: string | null;
}

export class NextPayError extends Error {
  constructor(message: string, public statusCode: number, public body?: unknown) {
    super(message);
    this.name = 'NextPayError';
  }
}

export class NextPayClient {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(clientId: string, clientSecret: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!clientId || !clientSecret) {
      throw new Error('NextPayClient: clientId and clientSecret are required');
    }
    this.authHeader = 'Basic ' + btoa(`${clientId}:${clientSecret}`);
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async createPaymentIntent(args: CreatePaymentIntentArgs): Promise<PaymentIntentResult> {
    const body = {
      account_id: args.accountId,
      external_id: args.externalId,
      amount: args.amountCentavos,
      currency: 'PHP/2',
      expires_in_seconds: args.expiresInSeconds ?? 900,
      payment_instrument_options: { method_type: 'qrph_p2m_reference', method_provider: 'automatic' },
      ...(args.metadata ? { metadata: args.metadata } : {}),
    };
    const data = await this.request('POST', '/v2/payment-intents', {
      body,
      idempotencyKey: `pi-${args.externalId}`,
    });
    return normalizeIntent(data);
  }

  async getPaymentIntent(id: string): Promise<PaymentIntentResult> {
    const data = await this.request(
      'GET',
      `/v2/payment-intents/${encodeURIComponent(id)}?include_payment_instrument=true`,
    );
    return normalizeIntent(data);
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntentResult> {
    const data = await this.request(
      'PATCH',
      `/v2/payment-intents/${encodeURIComponent(id)}/cancel`,
    );
    return normalizeIntent(data);
  }

  private async request(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    opts: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.idempotencyKey) headers['X-Idempotency-Key'] = opts.idempotencyKey;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
    if (!res.ok) {
      const rec = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {};
      const detail = rec.detail ?? rec.code ?? text;
      throw new NextPayError(`NextPay ${res.status}: ${detail}`, res.status, data);
    }
    return (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  }
}

function normalizeIntent(data: Record<string, unknown>): PaymentIntentResult {
  const instrument = (data.payment_instrument as Record<string, unknown> | undefined) ?? null;
  const actions = (instrument?.actions as Array<Record<string, unknown>> | undefined) ?? [];
  const qrAction = actions.find((a) => a.action_kind === 'qr.present');
  const ci = (qrAction?.client_instructions as Record<string, unknown> | undefined) ?? {};
  const base64 = ci.qrph_base64_string as string | undefined;
  return {
    id: String(data.id ?? ''),
    status: String(data.status ?? 'pending'),
    amountCentavos: Number(data.amount ?? 0),
    expiresAt: (data.expires_at as string | null) ?? null,
    instrumentId: instrument ? String(instrument.id ?? '') : null,
    qrString: (ci.qrph_string as string | undefined) ?? null,
    qrImageDataUrl: base64 ? `data:image/png;base64,${base64}` : null,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `cd app && npm test`
Expected: PASS, 5 client tests + 4 plan tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/nextpayClient.ts app/src/lib/nextpayClient.test.ts
git commit -m "feat(billing): NextPay Partners v2 client (Deno) with unit tests"
```

---

## Task 6: Shared function helpers

**Files:** Create `supabase/functions/_shared/http.ts`, `supabase/functions/_shared/db.ts`, `supabase/config.toml`

- [ ] **Step 1: Write `http.ts`**

Rewritten from the kit's Netlify-handler version — Edge Functions return `Response`, not `{statusCode, body}`. The kit's `generateToken()` used `Math.random()`, which is not cryptographically secure; this uses `crypto.getRandomValues()`.

```ts
// Response helpers for Supabase Edge Functions (Web-standard Response).
// Both origins call these functions, so CORS is an explicit allowlist rather
// than the kit's permissive '*'.

const ALLOWED_ORIGINS = [
  'https://avasmartdental.ph',
  'https://smartdentalapp.avasolutions.ph',
  'http://localhost:5173',
  'http://localhost:5174',
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export function preflight(origin: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/** URL-safe random id. Uses the CSPRNG — never Math.random(). */
export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2: Write `db.ts`**

```ts
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** Service-role client — bypasses RLS. Only ever used inside edge functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Resolves the caller's JWT to their clinic id, or null. */
export async function callerClinicId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return null;
  const { data } = await serviceClient()
    .from('clinics').select('id').eq('owner_user_id', user.id).maybeSingle();
  return data?.id ?? null;
}

export function nextpayEnv() {
  return {
    clientId: Deno.env.get('NEXTPAY_CLIENT_ID')!,
    clientSecret: Deno.env.get('NEXTPAY_CLIENT_SECRET')!,
    accountId: Deno.env.get('NEXTPAY_ACCOUNT_ID')!,
    baseUrl: Deno.env.get('NEXTPAY_BASE_URL') ?? 'https://api.partners.nextpay.world',
  };
}
```

- [ ] **Step 3: Create `supabase/config.toml`**

The repo has no CLI project config yet (migrations were applied by hand). `nextpay-webhook` must skip JWT verification — NextPay does not carry a Supabase token. It is safe because it re-`GET`s every intent before acting.

```toml
project_id = "ava-smart-dental"

[functions.create-invoice]
verify_jwt = true

[functions.invoice-status]
verify_jwt = true

[functions.nextpay-webhook]
verify_jwt = false

[functions.billing-cron]
verify_jwt = false
```

- [ ] **Step 4: Set the function secrets**

```bash
npx supabase secrets set \
  NEXTPAY_CLIENT_ID=pk_test_xxx \
  NEXTPAY_CLIENT_SECRET=xxx \
  NEXTPAY_ACCOUNT_ID=ce437d23-b5b2-4a4d-8ba2-c7263934fe3e \
  NEXTPAY_BASE_URL=https://api.partners.nextpay.world \
  BILLING_CRON_SECRET="$(openssl rand -hex 32)"
```

Then confirm nothing secret reached git:

```bash
git grep -nE "pk_(live|test)_[A-Za-z0-9]" -- . && echo "LEAK" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 5: Commit** (config only — secrets live in Supabase)

```bash
git add supabase/functions/_shared/http.ts supabase/functions/_shared/db.ts supabase/config.toml
git commit -m "feat(billing): edge function shared helpers and config"
```

---

## Task 7: `create-invoice`

Mints the QRPh intent for a clinic's next unpaid period. Callable by the owner (Settings → "Pay now") and by the cron.

**Files:** Create `supabase/functions/create-invoice/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json, preflight } from '../_shared/http.ts';
import { callerClinicId, nextpayEnv, serviceClient } from '../_shared/db.ts';

const QR_TTL_SECONDS = 900; // 15 min, per the guide's default

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const clinicId = await callerClinicId(req.headers.get('authorization'));
  if (!clinicId) return json(401, { error: 'unauthorized' }, origin);

  const db = serviceClient();

  // Price comes from the DB. The request body is never consulted for amount.
  const { data: clinic } = await db
    .from('clinics')
    .select('id, name, plan, paid_until, billing_plans!inner(amount_centavos, self_serve)')
    .eq('id', clinicId)
    .maybeSingle();
  if (!clinic) return json(404, { error: 'clinic_not_found' }, origin);
  if (!clinic.billing_plans.self_serve) {
    return json(400, { error: 'plan_not_self_serve' }, origin);
  }

  const periodStart = new Date(clinic.paid_until);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Reuse an existing open invoice for this period if its QR is still alive —
  // this is what makes repeated "Pay now" clicks safe.
  const { data: existing } = await db
    .from('billing_invoices')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('period_start', periodStart.toISOString())
    .maybeSingle();

  if (existing?.status === 'paid') {
    return json(200, { alreadyPaid: true, invoiceId: existing.id }, origin);
  }
  if (existing?.qr_string && new Date(existing.qr_expires_at!) > new Date()) {
    return json(200, {
      invoiceId: existing.id,
      qrString: existing.qr_string,
      expiresAt: existing.qr_expires_at,
      amountCentavos: existing.amount_centavos,
    }, origin);
  }

  const amountCentavos = clinic.billing_plans.amount_centavos;
  const periodTag = periodStart.toISOString().slice(0, 10);
  // Unique per clinic+period+attempt: the idempotency key is derived from it,
  // so an expired QR gets a genuinely new intent rather than a cached one.
  const attempt = existing ? Date.parse(new Date().toISOString()) : 0;
  const externalId = existing?.external_id
    ?? `inv-${clinicId.slice(0, 8)}-${periodTag}`;

  const invoiceId = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    const { error } = await db.from('billing_invoices').insert({
      id: invoiceId,
      clinic_id: clinicId,
      plan_id: clinic.plan,
      amount_centavos: amountCentavos,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      external_id: externalId,
      status: 'open',
    });
    if (error) return json(500, { error: 'invoice_insert_failed' }, origin);
  }

  const env = nextpayEnv();
  const client = new NextPayClient(env.clientId, env.clientSecret, env.baseUrl);

  let intent;
  try {
    intent = await client.createPaymentIntent({
      accountId: env.accountId,
      externalId: attempt ? `${externalId}-r${attempt}` : externalId,
      amountCentavos,
      expiresInSeconds: QR_TTL_SECONDS,
      metadata: { invoice_id: invoiceId, clinic_id: clinicId, period: periodTag },
    });
  } catch (e) {
    console.error('createPaymentIntent failed', e);
    return json(502, { error: 'nextpay_unavailable' }, origin);
  }

  const qrExpiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString();
  await db.from('billing_invoices').update({
    payment_intent_id: intent.id,
    qr_string: intent.qrString,
    qr_expires_at: qrExpiresAt,
  }).eq('id', invoiceId);

  return json(200, {
    invoiceId,
    qrString: intent.qrString,
    qrImageDataUrl: intent.qrImageDataUrl,
    expiresAt: qrExpiresAt,
    amountCentavos,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  }, origin);
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy create-invoice
```

- [ ] **Step 3: Call it with a real owner JWT**

```bash
curl -X POST "$SUPABASE_URL/functions/v1/create-invoice" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY"
```

Expected: HTTP 200 with a non-null `qrString` beginning `00020101`, and `amountCentavos` of `149900` for a Solo clinic. Confirm the row landed:

```sql
select external_id, amount_centavos, status, payment_intent_id
from public.billing_invoices order by created_at desc limit 1;
```

- [ ] **Step 4: Verify the amount cannot be overridden from the client**

```bash
curl -X POST "$SUPABASE_URL/functions/v1/create-invoice" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" -d '{"amountCentavos": 1}'
```

Expected: still `149900`. The body is ignored. This is guide §7 rule 1 made real.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/create-invoice/index.ts
git commit -m "feat(billing): create-invoice mints QRPh intent at server price"
```

---

## Task 8: `invoice-status` — verify, then extend

The money-critical function. It must never extend `paid_until` on anyone's say-so.

**Files:** Create `supabase/functions/invoice-status/index.ts`

- [ ] **Step 1: Write it**

```ts
import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json, preflight } from '../_shared/http.ts';
import { callerClinicId, nextpayEnv, serviceClient } from '../_shared/db.ts';
import { settleInvoice } from '../_shared/settle.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);

  const clinicId = await callerClinicId(req.headers.get('authorization'));
  if (!clinicId) return json(401, { error: 'unauthorized' }, origin);

  const invoiceId = new URL(req.url).searchParams.get('invoice_id');
  if (!invoiceId) return json(400, { error: 'invoice_id_required' }, origin);

  const db = serviceClient();
  const { data: invoice } = await db
    .from('billing_invoices').select('*')
    .eq('id', invoiceId).eq('clinic_id', clinicId)   // scope to the caller
    .maybeSingle();
  if (!invoice) return json(404, { error: 'invoice_not_found' }, origin);
  if (invoice.status === 'paid') return json(200, { status: 'paid' }, origin);
  if (!invoice.payment_intent_id) return json(200, { status: 'open' }, origin);

  const env = nextpayEnv();
  const client = new NextPayClient(env.clientId, env.clientSecret, env.baseUrl);

  // Guide §7 rule 3 — the authoritative check. Note the intent stays "pending"
  // for ~15s AFTER the customer pays, so the UI must keep polling.
  let intent;
  try {
    intent = await client.getPaymentIntent(invoice.payment_intent_id);
  } catch (e) {
    console.error('getPaymentIntent failed', e);
    return json(502, { error: 'nextpay_unavailable' }, origin);
  }

  if (intent.status !== 'succeeded') {
    return json(200, { status: invoice.status, intentStatus: intent.status }, origin);
  }

  const result = await settleInvoice(db, invoice, intent.amountCentavos);
  return json(200, { status: 'paid', paidUntil: result.paidUntil }, origin);
});
```

- [ ] **Step 2: Write the shared settlement helper**

Create `supabase/functions/_shared/settle.ts`. Both the poll and the webhook call this, possibly at the same instant — so the extension is done by a conditional UPDATE that only one caller can win.

```ts
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
```

- [ ] **Step 3: Deploy both**

```bash
npx supabase functions deploy invoice-status
```

- [ ] **Step 4: Simulate a sandbox payment end-to-end**

Sandbox-only endpoint from guide §2. Take `payment_instrument_id` from the created intent:

```bash
curl -X POST "https://api.partners.nextpay.world/v2/payment-simulations/payment-instrument" \
  -u "$NEXTPAY_CLIENT_ID:$NEXTPAY_CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"payment_instrument_id":"<PM_ID>","simulate_failure":false}'
```

Then poll:

```bash
curl "$SUPABASE_URL/functions/v1/invoice-status?invoice_id=<INVOICE_ID>" \
  -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY"
```

Expected: within ~15s, `{"status":"paid","paidUntil":"..."}` where `paidUntil` is one month past the old value.

- [ ] **Step 5: Prove idempotency — the check that matters most**

Call the same poll **three more times**:

```bash
for i in 1 2 3; do
  curl -s "$SUPABASE_URL/functions/v1/invoice-status?invoice_id=<INVOICE_ID>" \
    -H "Authorization: Bearer $OWNER_JWT" -H "apikey: $ANON_KEY"; echo
done
```

Then:

```sql
select paid_until from public.clinics where id = '<CLINIC_ID>';
```

Expected: `paid_until` is **unchanged** from step 4 — one month added in total, not four. If it moved, the guard failed; stop and fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/invoice-status/index.ts supabase/functions/_shared/settle.ts
git commit -m "feat(billing): verified, idempotent invoice settlement"
```

---

## Task 9: `nextpay-webhook`

A faster nudge down the same verified path. Never a source of truth — a webhook can be replayed or forged (guide §7 rule 3).

**Files:** Create `supabase/functions/nextpay-webhook/index.ts`

- [ ] **Step 1: Write it**

```ts
import { NextPayClient } from '../_shared/nextpayClient.ts';
import { json } from '../_shared/http.ts';
import { nextpayEnv, serviceClient } from '../_shared/db.ts';
import { settleInvoice } from '../_shared/settle.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, null);

  let event: { type?: string; data?: { id?: string } };
  try { event = await req.json(); } catch { return json(400, { error: 'bad_json' }, null); }

  // Always 200 on anything we don't handle — retries help nobody here.
  if (event.type !== 'v2.payment_intent.succeeded' || !event.data?.id) {
    return json(200, { ignored: true }, null);
  }

  const env = nextpayEnv();
  const client = new NextPayClient(env.clientId, env.clientSecret, env.baseUrl);

  // The webhook body is UNTRUSTED. Re-fetch the intent ourselves and believe
  // only that. A forged POST claiming success gets nowhere.
  let intent;
  try {
    intent = await client.getPaymentIntent(event.data.id);
  } catch (e) {
    console.error('webhook verify failed', e);
    return json(502, { error: 'verify_failed' }, null);   // let NextPay retry
  }
  if (intent.status !== 'succeeded') return json(200, { ignored: true }, null);

  const db = serviceClient();
  const { data: invoice } = await db
    .from('billing_invoices').select('*')
    .eq('payment_intent_id', intent.id).maybeSingle();
  if (!invoice) return json(200, { ignored: true }, null);

  try {
    await settleInvoice(db, invoice, intent.amountCentavos);
  } catch (e) {
    console.error('settle failed', e);
    return json(500, { error: 'settle_failed' }, null);
  }
  return json(200, { ok: true }, null);
});
```

- [ ] **Step 2: Deploy and register**

```bash
npx supabase functions deploy nextpay-webhook
```

Register `$SUPABASE_URL/functions/v1/nextpay-webhook` for `v2.payment_intent.succeeded` in the NextPay sandbox dashboard.

- [ ] **Step 3: Prove a forged webhook cannot grant paid time**

```bash
curl -X POST "$SUPABASE_URL/functions/v1/nextpay-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"v2.payment_intent.succeeded","data":{"id":"pi_does_not_exist"}}'
```

Expected: **not** a settlement — a 502 `verify_failed` (unknown id) and `paid_until` unchanged in the DB. Confirm:

```sql
select paid_until from public.clinics where id = '<CLINIC_ID>';
```

- [ ] **Step 4: Replay a real webhook twice**

Re-send the genuine payload for an already-paid intent twice. Expected: `{"ok":true}` both times, `paid_until` unchanged after the first.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/nextpay-webhook/index.ts
git commit -m "feat(billing): webhook nudge behind mandatory re-verification"
```

---

## Task 10: Reminders + lifecycle cron

QRPh has no auto-charge, so a forgotten QR is lost revenue. Reminders are part of the mechanism, not a nicety. Trial reminders fire at **day 7, 11, 13** (T-7/T-3/T-1 of a 14-day trial); renewal reminders at T-7/T-3/T-1 of `paid_until`.

**Files:** Create `supabase/functions/billing-cron/index.ts`, `supabase/migrations/0006_reminders.sql`

- [ ] **Step 1: Add the reminder ledger**

`supabase/migrations/0006_reminders.sql` — so a reminder is sent once and only once:

```sql
create table if not exists public.billing_reminders (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  kind text not null check (kind in ('trial_t7','trial_t3','trial_t1',
                                    'renewal_t7','renewal_t3','renewal_t1',
                                    'grace_started','read_only')),
  period_start timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (clinic_id, kind, period_start)
);

alter table public.billing_reminders enable row level security;

drop policy if exists "owners read own reminders" on public.billing_reminders;
create policy "owners read own reminders"
  on public.billing_reminders for select to authenticated
  using (clinic_id = public.current_clinic_id());
```

Apply: `npx supabase db push`

- [ ] **Step 2: Write the cron function**

```ts
import { json } from '../_shared/http.ts';
import { serviceClient } from '../_shared/db.ts';

const DAY = 86_400_000;

/**
 * Resend. Kept behind this one function so swapping providers is a single
 * edit. Never throws — a failed reminder must not abort the cron run or block
 * the lapse transitions below.
 */
async function sendBillingEmail(to: string, kind: string, ctx: Record<string, unknown>) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.log('BILLING_EMAIL (no key, logged only)', { to, kind, ctx }); return; }

  const daysLeft = Number(ctx.daysLeft ?? 0);
  const trial = kind.startsWith('trial');
  const subject = trial
    ? `Your Ava Smart Dental trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
    : `Your Ava Smart Dental subscription renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('BILLING_EMAIL_FROM') ?? 'Ava Smart Dental <billing@avasmartdental.ph>',
        to: [to],
        subject,
        html: `<p>Hi ${ctx.clinic ?? 'there'},</p>
               <p>${trial ? 'Your free trial' : 'Your subscription'} ends in
               <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.
               Open Settings → Billing to show your GCash/Maya QR code and pay.</p>
               <p><a href="https://smartdentalapp.avasolutions.ph/settings?tab=billing">Pay now</a></p>
               <p>Your patient records are always safe — nothing is ever deleted.</p>`,
      }),
    });
    if (!res.ok) console.error('resend failed', res.status, await res.text());
  } catch (e) {
    console.error('resend threw', e);
  }
}

Deno.serve(async (req) => {
  // Not JWT-guarded (cron has no user), so it carries its own shared secret.
  if (req.headers.get('x-cron-secret') !== Deno.env.get('BILLING_CRON_SECRET')) {
    return json(401, { error: 'unauthorized' }, null);
  }

  const db = serviceClient();
  const now = Date.now();

  const { data: clinics } = await db
    .from('clinics')
    .select('id, name, plan, paid_until, grace_days, subscription_status, owner_user_id')
    .neq('subscription_status', 'canceled');

  let reminders = 0, lapsed = 0;

  for (const c of clinics ?? []) {
    const paidUntil = Date.parse(c.paid_until);
    const daysLeft = Math.ceil((paidUntil - now) / DAY);
    const onTrial = c.subscription_status === 'trialing';

    const kind =
      daysLeft === 7 ? (onTrial ? 'trial_t7' : 'renewal_t7') :
      daysLeft === 3 ? (onTrial ? 'trial_t3' : 'renewal_t3') :
      daysLeft === 1 ? (onTrial ? 'trial_t1' : 'renewal_t1') : null;

    if (kind) {
      // Insert first; a duplicate key means it already went out.
      const { error } = await db.from('billing_reminders')
        .insert({ clinic_id: c.id, kind, period_start: c.paid_until });
      if (!error) {
        const { data: u } = await db.auth.admin.getUserById(c.owner_user_id);
        if (u?.user?.email) {
          await sendBillingEmail(u.user.email, kind, { daysLeft, clinic: c.name });
        }
        reminders++;
      }
    }

    // Past paid_until + grace -> past_due. This only flips a label; the actual
    // write-blocking is done by RLS off the dates, so it cannot drift.
    const graceEnds = paidUntil + c.grace_days * DAY;
    if (now > graceEnds && c.subscription_status !== 'past_due') {
      await db.from('clinics').update({ subscription_status: 'past_due' }).eq('id', c.id);
      lapsed++;
    }
  }

  return json(200, { reminders, lapsed }, null);
});
```

- [ ] **Step 3: Deploy and schedule**

```bash
npx supabase functions deploy billing-cron
```

Schedule it daily at 09:00 Manila (01:00 UTC) via pg_cron in the SQL Editor:

```sql
select cron.schedule(
  'billing-daily', '0 1 * * *',
  $$select net.http_post(
      url := '<SUPABASE_URL>/functions/v1/billing-cron',
      headers := jsonb_build_object('x-cron-secret', '<BILLING_CRON_SECRET>')
    )$$
);
```

- [ ] **Step 4: Test by moving a clinic's dates**

```sql
update public.clinics set paid_until = now() + interval '3 days'
 where id = '<TEST_CLINIC_ID>';
```

```bash
curl -X POST "$SUPABASE_URL/functions/v1/billing-cron" -H "x-cron-secret: $BILLING_CRON_SECRET"
```

Expected: `{"reminders":1,...}`, a `trial_t3` row in `billing_reminders`, and a `BILLING_EMAIL` line in `npx supabase functions logs billing-cron`. Run it **again immediately** — expected `{"reminders":0,...}`, proving no double-send.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_reminders.sql supabase/functions/billing-cron/index.ts
git commit -m "feat(billing): daily reminders at T-7/T-3/T-1 and lapse transitions"
```

---

## Task 11: Billing UI — QR, banners, read-only

**Files:** Create `clinic-app/src/lib/access.ts`, `clinic-app/src/features/billing/PayInvoiceCard.tsx`, `clinic-app/src/features/billing/AccessBanner.tsx`; Modify `SettingsPage.tsx`

- [ ] **Step 1: Mirror the access tier client-side**

`clinic-app/src/lib/access.ts` — presentation only. The DB is the enforcement; this just avoids showing buttons that will 403.

```ts
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
```

- [ ] **Step 2: Write its test**

`clinic-app/src/lib/access.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { accessTier } from './access';

const PAID = '2026-07-19T00:00:00Z';

describe('accessTier', () => {
  it('is full before paid_until', () => {
    expect(accessTier(PAID, 7, 'active', new Date('2026-07-18T00:00:00Z'))).toBe('full');
  });
  it('is grace within the grace window', () => {
    expect(accessTier(PAID, 7, 'active', new Date('2026-07-24T00:00:00Z'))).toBe('grace');
  });
  it('is read_only past the grace window', () => {
    expect(accessTier(PAID, 7, 'active', new Date('2026-07-27T00:00:00Z'))).toBe('read_only');
  });
  it('is read_only when canceled regardless of dates', () => {
    expect(accessTier(PAID, 7, 'canceled', new Date('2026-07-01T00:00:00Z'))).toBe('read_only');
  });

  // Fail-open: unknown state must never read as unpaid.
  it('is full when paid_until is missing', () => {
    expect(accessTier(null, 7, 'active', new Date('2030-01-01T00:00:00Z'))).toBe('full');
  });
  it('is full when paid_until is unparseable', () => {
    expect(accessTier('not-a-date', 7, 'active')).toBe('full');
  });
});
```

Run: `cd clinic-app && npm test` → expected FAIL, then PASS after step 1's file exists.

- [ ] **Step 3: Build the QR pay card**

`clinic-app/src/features/billing/PayInvoiceCard.tsx`. Renders the QR from `qrImageDataUrl`, counts down the 15-minute expiry, polls `invoice-status` every 3s, and offers a fresh QR on expiry. The intent stays `pending` for ~15s after payment, so the poll must not give up early.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Invoice = {
  invoiceId: string;
  qrImageDataUrl: string | null;
  expiresAt: string;
  amountCentavos: number;
};

export function PayInvoiceCard({ onPaid }: { onPaid: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'waiting' | 'paid' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<number | null>(null);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const base = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${base}/functions/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`request_failed_${res.status}`);
    return res.json();
  }, []);

  async function generate() {
    setState('loading'); setError(null);
    try {
      const inv = await call('create-invoice', { method: 'POST' });
      if (inv.alreadyPaid) { setState('paid'); onPaid(); return; }
      setInvoice(inv);
      setState('waiting');
    } catch {
      setError("Couldn't generate a QR code. Please try again.");
      setState('error');
    }
  }

  // Poll until succeeded — NextPay reports pending for ~15s after payment.
  useEffect(() => {
    if (state !== 'waiting' || !invoice) return;
    const id = window.setInterval(async () => {
      try {
        const r = await call(`invoice-status?invoice_id=${invoice.invoiceId}`);
        if (r.status === 'paid') {
          window.clearInterval(id);
          setState('paid');
          onPaid();
        }
      } catch { /* transient — keep polling */ }
    }, 3000);
    return () => window.clearInterval(id);
  }, [state, invoice, call, onPaid]);

  // Expiry countdown
  useEffect(() => {
    if (!invoice) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((Date.parse(invoice.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && state === 'waiting') setState('idle');
    };
    tick();
    timer.current = window.setInterval(tick, 1000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [invoice, state]);

  if (state === 'paid') {
    return <p className="text-sm font-medium text-emerald-700">Payment received — thank you!</p>;
  }

  return (
    <div className="rounded-2xl border border-line p-5">
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
      {state === 'waiting' && invoice?.qrImageDataUrl ? (
        <>
          <img src={invoice.qrImageDataUrl} alt="QR code for payment" className="mx-auto h-56 w-56" />
          <p className="mt-3 text-center text-sm text-fg-muted">
            Scan with GCash, Maya, or any QRPh bank app to pay{' '}
            <strong>₱{(invoice.amountCentavos / 100).toLocaleString('en-PH')}</strong>.
          </p>
          <p className="mt-1 text-center text-xs text-fg-faint">
            Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} ·
            keep this page open, confirmation takes a few seconds.
          </p>
        </>
      ) : (
        <button onClick={generate} disabled={state === 'loading'}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">
          {state === 'loading' ? 'Generating QR…' : 'Show payment QR code'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the banner**

`clinic-app/src/features/billing/AccessBanner.tsx` — shown app-wide, not just in Settings. Grace is amber and reassuring; read-only states plainly that records remain available.

```tsx
import { Link } from 'react-router-dom';
import type { AccessTier } from '../../lib/access';

export function AccessBanner({ tier, daysLeft }: { tier: AccessTier; daysLeft: number }) {
  if (tier === 'full') return null;
  const readOnly = tier === 'read_only';
  return (
    <div className={`px-4 py-2.5 text-sm ${readOnly ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
      {readOnly ? (
        <>Your subscription has lapsed. Your patient records are safe and you can still
          view and export everything — new entries are paused until payment.{' '}</>
      ) : (
        <>Your subscription ended {daysLeft === 0 ? 'today' : `${Math.abs(daysLeft)} day(s) ago`}.
          You still have full access for now.{' '}</>
      )}
      <Link to="/settings?tab=billing" className="font-semibold underline">Pay now</Link>
    </div>
  );
}
```

- [ ] **Step 5: Wire into Settings and the app shell**

In `SettingsPage.tsx`, replace the disabled "Manage subscription" placeholder (~line 1262) with `<PayInvoiceCard onPaid={refetchBilling} />` and show `paid_until` alongside the plan. Mount `<AccessBanner />` in the authenticated layout so it is visible on every page.

- [ ] **Step 6: Verify against a real lapsed clinic**

```sql
update public.clinics set paid_until = now() - interval '2 days'
 where id = '<TEST_CLINIC_ID>';
```

Run `cd clinic-app && npm run dev`, sign in as that owner.
Expected: amber grace banner; Settings → Billing shows a QR on click; scanning is not needed — run the sandbox simulation from Task 8 step 4 and the card must flip to "Payment received" within ~15s without a reload.

Then push it past grace (`now() - interval '30 days'`) and confirm: red banner, patient list still loads and exports, "Add patient" fails with a permission error from RLS.

- [ ] **Step 7: Commit**

```bash
git add clinic-app/src
git commit -m "feat(billing): QR payment card, access banner, read-only handling"
```

---

## Task 12: Go-live gate

Work `nextpay-kit/VERIFICATION-CHECKLIST.md` bucket 2. Bucket 1 (KYB/UAT/settlement) is already done account-wide — do not repeat it.

- [ ] **Step 1: Sandbox smoke test**

```bash
node "NEXTPAY INTEGRATION/nextpay-kit/scripts/smoke-test.mjs"
```
Expected: `SMOKE TEST PASSED`.

- [ ] **Step 2: Full unit suite**

```bash
cd app && npm test && cd ../clinic-app && npm test
```
Expected: all green.

- [ ] **Step 3: Confirm no secret is in git**

```bash
git grep -nE "pk_(live|test)_[A-Za-z0-9]{8}" -- . && echo "LEAK — STOP" || echo "clean"
git check-ignore -v "NEXTPAY INTEGRATION/nextpay-kit/scripts/.env"
```
Expected: `clean`, and the `.env` reported as ignored.

- [ ] **Step 4: Mint the LIVE account**

The sandbox `account_id` does **not** exist in production. Ask the owner to run, with `pk_live_` and the **live** merchant `4ca76807-325b-4cd5-bd3f-e05be864684d` in `.env`:

```bash
node "NEXTPAY INTEGRATION/nextpay-kit/scripts/mint-product-account.mjs" "Ava Smart Dental"
```

- [ ] **Step 5: Canceled live intent — proves live wiring, moves no money**

Set the live secrets, then create a ₱1.00 intent and cancel it:

```bash
npx supabase secrets set NEXTPAY_CLIENT_ID=pk_live_xxx NEXTPAY_CLIENT_SECRET=xxx \
  NEXTPAY_ACCOUNT_ID=<LIVE_ACCOUNT_ID>
```

Create an intent via `create-invoice`, confirm a `qrString` comes back, then cancel it through `PATCH /v2/payment-intents/:id/cancel`.
Expected: the intent reads `canceled`. No money moved.

- [ ] **Step 6: Deploy to preview first, never straight to production**

- [ ] **Step 7: Tick off `VERIFICATION-CHECKLIST.md` bucket 2 and commit**

```bash
git add -A && git commit -m "chore(billing): go-live verification complete"
```

---

## What this plan deliberately does not do

- **No auto-charge.** QRPh is pull-by-scan; every month needs a human. That is why reminders are load-bearing.
- **No `signup_sessions` table.** Signup is free in model A, so there is nothing to hold server-side.
- **No change to marketing copy.** "14 days free. No charge today" and "Start free trial" are promises to customers; changing them is the owner's call, not a developer's.
- **No data deletion, ever.** Non-payment blocks new writes only.
- **`multibranch` never self-serves.** It is `ctaKind: "sales"`; `billing_plans.self_serve = false` enforces that server-side.
