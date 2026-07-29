# NextPay Billing — Go-Live Runbook

State of the integration and the exact steps left for the owner to take it live.
Everything below the "Done & verified" line is finished; everything under
"Owner steps remaining" needs credentials or decisions only the owner has.

Supabase project: **AvaSmartDental** (`ehirqsqkfnjuuvzthsrx`, Tokyo).
Branch: **feat/nextpay-payments**.

---

## Done & verified (sandbox) — Phases A, B, C

Built in three additive phases (migrations 0004–0024). All money-path and
isolation behaviour verified against the live sandbox.

**Pricing (current): by clinic count, monthly OR annual.**
`billing_plans` tiers (the single server-side price table):
| tier | clinics | monthly | annual | self-serve |
|---|---|---|---|---|
| `tier_1` | 1 | ₱699 | ₱7,000 | yes |
| `tier_2_6` | 2–6 | ₱1,499 | ₱15,000 | yes |
| `tier_6plus` | 7+ | — | — | no (contact) |
Trial is **18 days**. Cadence (monthly/annual) is chosen at the pay screen.

**Account-level billing (Phase B).** Billing lives on a new `accounts` table
(one per owner), not on clinics. `accounts.paid_until` + `grace_days` are the
entitlement clock; `accounts.tier` is derived from clinic count.
`billing_invoices` are account-scoped. The deprecated `clinics.*` billing
columns are frozen, non-authoritative copies.

**Multi-clinic per account (Phase C).** One account owns many clinics; the app
sends an `x-clinic-id` header and `current_clinic_id()` returns that clinic
**only if its account is owned by the caller** (else NULL → RLS deny). A
malformed header denies cleanly (0024). Adding a branch bumps the tier;
`add-clinic` is blocked for a lapsed (read_only) account (add-then-bill).

**Isolation — exhaustively re-verified (Phase C).** Two accounts, all 22
tenant tables: account A spoofing B's clinic id reads `[]` on every table,
INSERT → 403, UPDATE/DELETE → 0 rows, B's data intact. 22/22 `tenant_select`
policies route through the single `current_clinic_id()` chokepoint; 66 gated
write policies; `clinic_is_writable()` **fail-open** (only a definite lapse
blocks writes; reads/export always open).

**Settlement (verified idempotent).** `settle_invoice()` is one atomic SQL
function: claim (open→paid, guarded) + amount-check + `paid_until =
GREATEST(paid_until, period_end)` on the account. Verified: simulate → paid,
`paid_until` advances one period (monthly +1mo / annual +1yr, month-end
clamped); repeated polls + webhook replay never double-credit; a forged webhook
→ `verify_failed`.

**Edge functions** (deployed): `create-invoice` (JWT, account-scoped, prices
monthly/annual server-side), `invoice-status` (JWT), `nextpay-webhook` (no
JWT, re-verifies), `billing-cron` (no JWT, `x-cron-secret`; account-level
reminders + lapse), `add-clinic` (JWT, entitlement-gated).

**Paywall integrity (H1, verified).** Trial length + tier are server-authoritative
(signup ignores client-supplied values); clients cannot write `accounts`
(no UPDATE policy) — a direct `paid_until` PATCH changes 0 rows.

**Secrets set** in Supabase (`ehirqsqkfnjuuvzthsrx`): `NEXTPAY_CLIENT_ID`,
`NEXTPAY_CLIENT_SECRET` (sandbox pk_test), `NEXTPAY_ACCOUNT_ID` (`ce437d23-…`,
sandbox), `NEXTPAY_BASE_URL`, `BILLING_CRON_SECRET`.

Tests: `app` 10 passing, `clinic-app` 6 passing. 24 migrations synced, 0 drift.
No secrets in git; `.env` gitignored. Live DB has 1 real clinic ("kenn"); all
test data cleaned up.

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

9. **Known low-risk edge (accepted).** If a clinic lets a QR expire (15 min)
   and clicks Pay again, `create-invoice` mints a fresh intent and overwrites
   `payment_intent_id`; a late payment on the *old, expired* QR would not settle
   (settlement matches on the current intent id). This is bounded by the 900s
   expiry — NextPay should reject payment on an expired intent — so it is left
   as-is. If NextPay ever honors late payments, match settlement on the invoice
   rather than the latest intent id.

10. **Monitor settlement 500s.** `settle_invoice` raises `amount_mismatch` when
   the amount NextPay reports differs from the invoice's stored amount; the
   caller returns 5xx (so the poll reports not-yet-paid / NextPay retries) and
   logs it. In normal operation this never fires (the invoice stores its own
   amount at creation). A *sustained* run of settlement 500s means either a
   genuine mismatch needing manual resolution, or that NextPay changed the
   `getPaymentIntent` response shape — either way it strands a paying customer,
   so alert on repeated `settle_invoice failed` / `amount_mismatch` log lines.
