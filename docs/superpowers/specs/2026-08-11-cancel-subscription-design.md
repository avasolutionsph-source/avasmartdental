# Cancel / Resume subscription — design

**Status:** approved (2026-08-11). Small additive feature on the account-level
billing model (Phases B/C).

## Problem
There is no way for a clinic to cancel its subscription or free trial from the
app. The backend already supports a `canceled` state (`account_access_tier` maps
`canceled → read_only`, `billing-cron` skips canceled accounts), but nothing
lets a user trigger it. Clients on the free trial look for a Cancel button and
find none.

Note: billing is **manual QRPh** (no card on file, no auto-charge), so a trial
that is never paid simply lapses to read-only on its own. "Cancel" is therefore
about **explicit intent, stopping reminders, and clear status** — not about
stopping a recurring charge.

## Decision
- **Cancel at period end** (graceful): keep access until `trial_end`/`paid_until`,
  then lapse to read-only. Do not revoke access immediately.
- **Resume/undo allowed** any time before the period ends.
- Paying (settling an invoice) also clears the cancel intent (paying = continue).

## Data model
Add one column:
```sql
alter table public.accounts
  add column cancel_at_period_end boolean not null default false;
```
We do **not** flip `subscription_status` to `canceled` at cancel time (that maps
to read_only immediately, which is the wrong behavior). The flag records intent;
enforcement stays date-based in `account_access_tier` (unchanged). At period end
the cron flips the status to `canceled` for a clean label.

## Edge function — `set-subscription-cancel` (JWT, verify_jwt = true)
- Body `{ cancel: boolean }`. Resolves the caller's account via `callerAccountId`.
- `cancel = true`: allowed only when `subscription_status in ('trialing','active')`;
  sets `cancel_at_period_end = true`.
- `cancel = false` (resume): allowed when `cancel_at_period_end = true` and the
  period has not lapsed; sets it back to `false`.
- Service-role update (direct owner UPDATE on `accounts` is RLS-locked), same
  pattern as `add-clinic` / `create-invoice`.
- Returns `{ cancel_at_period_end }`.

## billing-cron — two small additions
1. Skip reminder emails when `cancel_at_period_end = true` (don't nag someone who
   canceled).
2. At lapse (`now > graceEnds`): if `cancel_at_period_end = true` set
   `subscription_status = 'canceled'` (instead of `past_due`).

Select must additionally read `cancel_at_period_end`.

## settle_invoice — clear the flag on payment
Redefine `settle_invoice` (based on the current 0022 account-scoped version):
when it credits the account, also set `cancel_at_period_end = false`. Claim +
amount-check + `GREATEST(paid_until, period_end)` are unchanged.

## Frontend (Settings → Billing)
- `ClinicBilling` gains `cancel_at_period_end: boolean`; `getClinicBilling`
  selects it.
- `api.setSubscriptionCancel(cancel: boolean)` → `supabase.functions.invoke`.
- BillingSection:
  - `trialing`/`active` **and not** canceled → **"Cancel subscription"** button
    with a confirm dialog: *"You'll keep access until {trial_end|paid_until}.
    Your patient data is never deleted."*
  - `cancel_at_period_end = true` (not yet lapsed) → info banner *"Subscription
    canceled — you have access until {date}"* + **"Resume subscription"** button.
  - On success, refetch billing (`useRefetchClinicBilling`).

## Access & safety (unchanged)
- `account_access_tier` and `clinic_is_writable` are untouched — still fail-open,
  still date-driven. A cancel never blocks writes early; a resume never needs to
  "unlock" anything before period end.
- Data is never deleted; a lapsed/canceled account is read-only, not gone.

## Out of scope
- Refunds / proration (manual QR, no auto-charge — nothing to refund).
- Email confirmation of cancellation (reminders only today; can add later).
- Per-clinic cancellation (billing is account-level).
