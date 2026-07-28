# NextPay Billing — Go-Live Runbook

State of the integration and the exact steps left for the owner to take it live.
Everything below the "Done & verified" line is finished; everything under
"Owner steps remaining" needs credentials or decisions only the owner has.

Supabase project: **AvaSmartDental** (`ehirqsqkfnjuuvzthsrx`, Tokyo).
Branch: **feat/nextpay-payments**.

---

## Done & verified (sandbox)

**Database** (migrations 0004–0008, applied to the live project):
- `billing_plans` — the single server-side price table (Solo ₱1,499 / Clinic
  ₱2,999 / Multi-branch ₱4,999). All charging reads from here.
- `clinics.paid_until` + `grace_days` — the real entitlement clock.
- `billing_invoices` — one row per monthly charge; owner-read-only RLS.
- `billing_reminders` — send-once ledger.
- Write-gate RLS on all 22 tenant tables: writes require `clinic_is_writable()`
  (**fail-open** — only a definitive lapse blocks new entries; reads and export
  always stay open). Verified: 66 gated write policies, 22 untouched SELECTs.
- `clinics.plan` → `billing_plans.id` FK (referential integrity + PostgREST embed).
- Signup trigger sets `paid_until = trial_end` (a bug where 0004's NOT NULL
  would have broken every new signup — fixed and verified end-to-end).

**Edge functions** (deployed to the live project):
- `create-invoice` (JWT) — mints a QRPh intent at the **server** price. Verified:
  amount 149900, QR returned, amount-override from the body rejected.
- `invoice-status` (JWT) — re-verifies with NextPay, then extends `paid_until`
  through a `status='open'`-guarded UPDATE. Verified: simulate → paid,
  `paid_until` +1 month; 3 extra polls left it unchanged (no double credit).
- `nextpay-webhook` (no JWT) — re-GETs the intent before settling. Verified:
  forged id → `verify_failed`; genuine → settled via webhook; replayed → no
  double credit.
- `billing-cron` (no JWT, `x-cron-secret`) — T-7/T-3/T-1 reminders + past-due
  lapse. Verified: trialing clinic 3 days out → `trial_t3`, re-run → no
  double-send, wrong secret → 401.

**Frontend**:
- Landing checkout reduced to 2 steps (Account → Review); the non-functional
  card capture is gone.
- Clinic app: `PayInvoiceCard` (QR + poll), app-wide `AccessBanner`
  (grace/read-only), `paid_until` shown as "Paid through", single price source
  (duplicated `PLAN_INFO` removed; drift test guards it).

**Secrets already set** in Supabase (`ehirqsqkfnjuuvzthsrx`):
`NEXTPAY_CLIENT_ID`, `NEXTPAY_CLIENT_SECRET` (sandbox pk_test), `NEXTPAY_ACCOUNT_ID`
(`ce437d23-…`, sandbox), `NEXTPAY_BASE_URL`, `BILLING_CRON_SECRET`.

Tests: `app` 9 passing, `clinic-app` 6 passing. No secrets in git; `.env` gitignored.

---

## Owner steps remaining (need pk_live / decisions)

1. **Mint the LIVE collections account.** Sandbox and live are separate
   workspaces — the sandbox `account_id` does not exist in production. With
   `pk_live_` creds and the **live** merchant `4ca76807-325b-4cd5-bd3f-e05be864684d`
   in `nextpay-kit/scripts/.env`:
   ```bash
   node "NEXTPAY INTEGRATION/nextpay-kit/scripts/mint-product-account.mjs" "Ava Smart Dental"
   ```
   ⚠️ `scripts/.env` currently has the **live** merchant id. If you ever re-run
   the sandbox mint/smoke test, point `NEXTPAY_MERCHANT_ID` at the sandbox
   merchant `87d1bbf3-…` first, or you'll mint against the wrong workspace.

2. **Swap in live secrets** on Supabase (you set these — never paste them here):
   ```bash
   npx supabase secrets set \
     NEXTPAY_CLIENT_ID=pk_live_xxx \
     NEXTPAY_CLIENT_SECRET=xxx \
     NEXTPAY_ACCOUNT_ID=<LIVE_ACCOUNT_ID_FROM_STEP_1> \
     --project-ref ehirqsqkfnjuuvzthsrx
   ```

3. **Canceled live intent** (proves live wiring, moves no money): create a small
   QRPh intent via `create-invoice`, confirm a `qrString` comes back, then
   `PATCH /v2/payment-intents/:id/cancel`. Expect `canceled`.

4. **Schedule the daily cron.** Choose a `BILLING_CRON_SECRET`, set it on
   Supabase, then in the SQL editor (needs `pg_cron` + `pg_net`, enable via
   Dashboard → Database → Extensions):
   ```sql
   select cron.schedule('billing-daily', '0 1 * * *',
     $$select net.http_post(
        url := 'https://ehirqsqkfnjuuvzthsrx.supabase.co/functions/v1/billing-cron',
        headers := jsonb_build_object('x-cron-secret', '<BILLING_CRON_SECRET>')
     )$$);
   ```
   (01:00 UTC = 09:00 Manila.)

5. **Register the webhook** in the NextPay dashboard: event
   `v2.payment_intent.succeeded` → `https://ehirqsqkfnjuuvzthsrx.supabase.co/functions/v1/nextpay-webhook`.

6. **Email (optional, deferred).** To turn on reminder emails, set
   `RESEND_API_KEY` + `BILLING_EMAIL_FROM` on Supabase and verify the
   `avasmartdental.ph` sending domain in Resend. Until then reminders log only.

7. **Deploy frontends to preview first**, never straight to production. The
   landing site (`avasmartdental.ph`) is not currently deployed.

8. **Backups.** The project is on the free tier with no backups. Before real
   patient data lands, move to a plan with daily backups + PITR.
