# Session Handoff — NextPay Billing (Phases A/B/C) + polish

Read this first to continue the work. Everything is on branch
**`feat/nextpay-payments`** (Draft **PR #1**). **Nothing is merged to `main` or
deployed to production — that is owner-gated.**

---

## 1. What this project is

Monorepo, two Vite + React + TS SPAs sharing ONE Supabase project:
- **`app/`** — marketing/landing site (avasmartdental.ph, **not deployed yet**).
  Signup lives here at `/checkout` (there is NO signup in the clinic app).
- **`clinic-app/`** — the clinic PWA. Production: **`https://smartdentalapp.avasolutions.ph`**
  (custom domain) / `https://avasmartdentalapp.netlify.app` (both live). Routes:
  `/login`, `/reset-password`, protected app. Netlify **Deploy Preview** for PR #1:
  `https://deploy-preview-1--avasmartdentalapp.netlify.app`.
- **Supabase**: project **`ehirqsqkfnjuuvzthsrx`** ("AvaSmartDental", org
  `avasolutions4-ui's Org`, Tokyo, **FREE tier**). CLI is linked + logged in.

---

## 2. What was built (all verified against the LIVE sandbox, then live pk_live smoke test)

**Billing model:** trial-first (18-day), then a monthly **or** annual QRPh
invoice via NextPay Partners v2 (GCash/Maya QR — no cards). Tiered pricing by
**clinic count**:

| tier | clinics | monthly | annual | self-serve |
|---|---|---|---|---|
| `tier_1` | 1 | ₱699 (69900) | ₱7,000 (700000) | yes |
| `tier_2_6` | 2–6 | ₱1,499 (149900) | ₱15,000 (1500000) | yes |
| `tier_6plus` | 7+ | — | — | no (contact) |

**Account-level billing (Phase B):** a new `accounts` table owns billing
(`paid_until`, `grace_days`, `tier`, `subscription_status`, `billing_period`).
One account per owner. The DEPRECATED `clinics.*` billing columns are frozen
copies (see COMMENTs). `billing_invoices` is **account-scoped** (`account_id`).

**Multi-clinic per account (Phase C):** one account owns many clinics. The
clinic app sends an **`x-clinic-id`** header; `current_clinic_id()` returns that
clinic ONLY if its account is owned by the caller (`auth.uid()`), else NULL →
RLS denies. Malformed header → clean deny (0024 uses a CASE-guarded uuid cast).
Account tier is auto-recomputed from clinic count by a trigger. `add-clinic`
edge function adds branches (blocked when the account is lapsed/read_only).

**Migrations** (in `supabase/migrations/`, all applied, 0 drift — note gaps
0014/0015 are cosmetic, never existed):
- 0001–0003 tenant base (pre-existing; applied via CLI this project).
- 0004 billing_plans + paid_until + invoices + access-tier fns.
- 0005 write-gate RLS (66 gated write policies across 22 tenant tables).
- 0006 clinics.plan FK. 0007 signup sets paid_until. 0008 reminders ledger.
- 0009 atomic `settle_invoice()` (claim + amount-check + GREATEST).
- 0010 paywall integrity (H1): server-side trial/tier; drop owner-UPDATE on clinics.
- 0011 tier pricing. 0012 18-day trial + server-side tier. 0013 billing_period.
- 0016 accounts + 1:1 backfill. 0017 billing fns → accounts. 0018 signup
  account+clinic + reminders by account. 0019 Phase-B findings.
- 0020 multi-clinic (drop unique, header current_clinic_id, tier trigger).
  0021 signup fix (dropped unique broke ON CONFLICT). 0022 invoices → account_id.
  0023 (superseded) + 0024 safe uuid cast for the header.

**Edge functions** (`supabase/functions/`, deployed): `create-invoice` (JWT,
account-scoped, prices monthly/annual server-side), `invoice-status` (JWT),
`nextpay-webhook` (no JWT, re-verifies — currently NOT registered; poll is
primary), `billing-cron` (no JWT, `x-cron-secret`; account-level reminders +
lapse; **pg_cron NOT scheduled yet**), `add-clinic` (JWT, entitlement-gated).
Shared: `_shared/{nextpayClient,http,db,settle}.ts`.

**Frontend:** landing 2-step checkout (no card capture); tier pricing with a
**Monthly/Yearly toggle** + fixed "Recommended" badge; QR `PayInvoiceCard`;
app-wide `AccessBanner` + `ReadOnlyGate`; **clinic switcher** (`x-clinic-id`
header injection via custom `global.fetch` reading a zustand store; bootstrap
gates data pages on active-clinic-set); styled **AddClinicModal**; auth CTAs
wired (Sign in → clinic-app `/login` via `clinicLoginUrl()`; Get Ava / Start
free trial → `/checkout?plan=tier_1`).

**Verified LIVE (pk_live):** real ₱1 QRPh smoke test end-to-end — mint invoice
(account `7438910a`) → owner paid ₱1 → poll settled → account.paid_until +1mo,
idempotent, cascade correct. Env confirmed LIVE (account 7438910a, pk_live).
Cross-account isolation exhaustively verified (2 accounts × 22 tables, 0 leaks,
read+write). All test data cleaned up (Mode B) EXCEPT the ZZZTEST account below.

Tests: `app` 10 pass, `clinic-app` 6 pass; both build green.

---

## 3. OUTSTANDING — do these

1. **ZZZTEST test account still on the LIVE DB** (kept so the owner can log into
   preview/production; SAME DB for both):
   - email `zzztest.preview@avasmartdental.ph` / pw `PreviewTest2026!`
   - **Delete before real go-live**: `delete from auth.users where
     email='zzztest.preview@avasmartdental.ph';` (cascades account+clinic).
     Do NOT touch the real clinic "kenn".
2. **Verify on the rebuilt Deploy Preview** (owner didn't want browser checks
   this session): the styled Add Clinic **modal** (not window.prompt) and the
   fixed **Sign in / Get Ava** CTAs. Code is verified (build green); just needs
   a live look after Netlify rebuilds PR #1.
3. **Set `VITE_APP_URL=https://smartdentalapp.avasolutions.ph`** in the marketing
   site's production Netlify env (code has a safe fallback, but set it). Confirm
   which clinic-app URL is canonical.
4. **Backups** (TOP go-live blocker): project is FREE tier, **no backups**
   (`supabase backups list` → pitr_enabled false, []). Move to a paid plan with
   daily backups + PITR BEFORE real patient data.
5. **Go-live sequence** (owner-gated, see `docs/NEXTPAY-GO-LIVE.md`): backups →
   (live secrets already set) → register webhook for `v2.payment_intent.succeeded`
   → schedule pg_cron for billing-cron → preview → production. Merge PR #1.

---

## 4. Live secrets already set (Supabase `ehirqsqkfnjuuvzthsrx`)
`NEXTPAY_CLIENT_ID`/`NEXTPAY_CLIENT_SECRET` = **pk_live/sk_live**,
`NEXTPAY_ACCOUNT_ID` = **`7438910a-16d4-429e-b29f-33e503e6f212`** (live SmartDental,
shared "AVA Spa Central" merchant interim), `NEXTPAY_BASE_URL`, `NEXTPAY_ENV=production`,
`BILLING_CRON_SECRET` (value unknown to us — set by an earlier agent; rotate when
scheduling pg_cron). Webhook intentionally skipped (Pro Plus locked; poll = primary).

---

## 5. Test harness recipe (for future LIVE/sandbox testing — Mode B, always clean up)

Create a throwaway auth user via SQL (bypasses gotrue email validation; set ALL
token columns to '' or gotrue login 500s):
```sql
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000','authenticated',
  'authenticated','xxx.deleteme@avasmartdental.ph', crypt('Pw123!', gen_salt('bf')),
  now(),'','','','','','','','','{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('clinic_name','XXX — DELETE ME'), now(), now());
```
- The `handle_new_user` trigger auto-creates the account (tier_1, 18-day) + clinic.
- Get a JWT: `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with apikey=anon
  key + `{email,password}` → `access_token`.
- Anon key is public (in the deployed clinic-app bundle) — retrieve via
  `npx supabase projects api-keys --project-ref ehirqsqkfnjuuvzthsrx`.
- Call edge fns with `Authorization: Bearer <JWT>` + `apikey: <anon>`.
- To simulate a SANDBOX payment (only works on pk_test): a temp `simpay` function
  that GETs the intent → POSTs `/v2/payment-simulations/payment-instrument`. On
  **LIVE** you cannot simulate — a real payment is required (use a temp ₱1 plan:
  `insert into billing_plans (id,display_name,min_clinics,max_clinics,
  monthly_centavos,annual_centavos,amount_centavos,self_serve) values
  ('test_1peso','₱1',9999,9999,100,100,100,true);` then set the test account's
  `tier='test_1peso'`). ALWAYS delete the temp plan + throwaway user + any temp
  function/secret afterward.
- Windows gotcha: bash writes `/tmp`, but Node reads `/tmp` as `C:\tmp` — pass
  data through bash vars/stdin, not `/tmp` files, when piping to `node -e`.
- `supabase db query --linked` runs SQL via stdin (shows only the LAST
  statement's rows). No Docker/psql available; `db dump` needs Docker (absent).

---

## 6. Git / PR
- Branch `feat/nextpay-payments`, in sync with origin. Draft **PR #1**:
  `https://github.com/avasolutionsph-source/avasmartdental/pull/1`.
- Push works via the machine's stored git credential (40-char PAT). `gh` is NOT
  installed; PR #1 was created via the GitHub API using that credential.
- Untracked `NEXTPAY INTEGRATION/` is the reference kit — leave it; `.env` inside
  is gitignored.
