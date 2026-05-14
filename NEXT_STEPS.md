# Next — what's left to do

Ordered roughly by what unblocks the most. See `DONE_STEPS.md` for the
shipped surface this builds on.

---

## 1. Stand up the clinic-app deployment (blocks the whole flow)

**Status:** clinic-app source code is now in `clinic-app/` of this
monorepo. Both apps share one repo. What's left is Netlify config.

See `DEPLOY.md` for the full step-by-step. Quick checklist:

- [ ] Reconfigure (or recreate) the Netlify site serving
      `smartdentalapp.avasolutions.ph`:
  - Repository: `avasolutionsph-source/avasmartdental` (yes, same repo
    as landing — monorepo now)
  - **Base directory: `clinic-app/`** ← this is what makes Netlify
    build the right app
  - Branch: `main`
- [ ] Set env vars on both Netlify sites to the **same Supabase**
      project:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] On the landing Netlify, also set:
  - `VITE_APP_URL` = `https://smartdentalapp.avasolutions.ph`
  - `VITE_APP_REDIRECT_URL` = `https://smartdentalapp.avasolutions.ph/login`

After this, the install button on `/downloads` will correctly redirect
to the clinic-app PWA: `usePwaInstall` detects when `VITE_APP_URL`
points to a different origin and redirects there instead of firing
the landing-site install prompt. **Decision is committed: clinic app
is "the app."** When `VITE_APP_URL` is unset (local dev), it falls
back to installing the landing site so previews still work.

## 2. Supabase configuration

- [ ] In Supabase Dashboard → **Authentication → Email Templates**,
      rebrand the confirmation, magic-link, and recovery emails with Ava
      copy and link styling. Set the redirect URL.
- [ ] Authentication → Providers → Email → decide whether **"Confirm
      email"** stays on. Default ON is safer; turn OFF only for early
      testing.
- [x] **DONE** — `clinics` table + `handle_new_user` trigger are
      committed in `supabase/migrations/0001_clinics.sql` and
      `0002_handle_new_user.sql`. Apply them once via the Supabase
      Dashboard SQL Editor (or `supabase db push`); see
      `supabase/README.md`.

- [ ] RLS on every existing table (`patients`, `appointments`, etc.) so
      a logged-in user only sees their own clinic's data. The current
      mgv-app code assumes everything is accessible — without RLS, any
      authenticated user reads everything.

## 3. Real NextPay integration

Right now the Payment step is purely a UI form — no tokenization, no
charge, no webhook. To actually capture cards and bill on day 14:

- [ ] Sign up for a NextPay merchant account; get API keys + sandbox.
- [ ] Replace `PaymentForm`'s submit-side with a NextPay tokenization
      call (Netlify Function so the secret stays server-side). The card
      form fields stay UI-only; tokenize them inline.
- [ ] Persist the token + customer ID on the `clinics` row.
- [ ] Netlify Function for the NextPay webhook → updates
      `subscription_status` to `active` / `past_due` / `canceled`.
- [ ] Scheduled function (Netlify scheduled functions or Supabase pg_cron)
      to charge subscriptions on `trial_end` and on each monthly
      anniversary.

## 4. Subscription / billing UX inside the clinic app

- [ ] A **Settings → Billing** page in `mgv-app` showing: current plan,
      trial-end date, next charge, masked card on file, "Cancel
      subscription" button.
- [ ] "Trial ending in 3 days" + "Trial ended" email cadence.
- [ ] Cancel-anytime hook — when the user cancels, mark
      `subscription_status = canceled` so the next scheduled charge
      skips them.
- [ ] Update the receipt header in `BillingPage.tsx` (lines ~1495–1510)
      to read clinic info from a `clinics` row instead of the
      placeholder text we shipped.

## 5. Login extras

- [ ] **Forgot password** link on `LoginPage` → calls
      `supabase.auth.resetPasswordForEmail` with `redirectTo` pointing
      at a new `/reset-password` page in the clinic app.
- [ ] Build that `/reset-password` page — reads the session from the
      URL hash, lets the user set a new password, then redirects to
      `/dashboard`.
- [ ] **Sign out** menu item — `useAuth().signOut()` is wired; surface
      a button in the TopBar user-menu.

## 6. Multi-user per clinic (Pricing implies it; code doesn't support it yet)

The Clinic plan says "Up to 5 dentists" and Multi-branch says
"Unlimited dentists." Today, 1 signup = 1 user = 1 clinic.

- [ ] Add a `clinic_members` join table (`clinic_id`, `user_id`, `role`).
- [ ] "Invite dentist" flow in Settings → Team — sends a Supabase
      invite (`auth.admin.inviteUserByEmail`) tied to the clinic_id.
- [ ] Role-based UI gating (owner / dentist / staff).

## 7. Quality / polish

- [x] **DONE for the landing site** — routes are lazy-loaded via
      `React.lazy` in `app/src/main.tsx`. Main chunk is now ~358kB
      gzipped 110kB, well under the warning threshold. **Still TODO
      on the clinic app** (`ReportsPage`, `PatientProfilePage` are the
      biggest there).
- [ ] No tests anywhere yet. Start with the checkout validation
      (`PaymentForm` luhn / expiry, `AccountForm` password rules) and
      the auth gate behavior.
- [ ] Sentry or similar for prod error reporting on both sites.
- [ ] Replace the placeholder `123 Dental Avenue, Makati City` text in
      receipts with clinic-configurable address from the `clinics` row.

## 8. Pick ONE Supabase project for both apps

The clinic app (`Smart-Dental` history) already has its own Supabase
with the full data schema (patients, appointments, billing, etc.). The
landing site was set up earlier with a fresh Supabase project
(`ehirqsqkfnjuuvzthsrx`). **For end-to-end signup → login to work,
both apps MUST point at the same Supabase.**

Recommendation: use the clinic app's existing Supabase. Update the
landing site's `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` Netlify
env vars to match the clinic app's. Then apply
`supabase/migrations/0001_clinics.sql` and `0002_handle_new_user.sql`
to that Supabase (adds the `clinics` table + signup trigger).

See `DEPLOY.md` step 1 + 2 for details.

---

## How to pick this up

1. Read `DONE_STEPS.md` to know what surface exists.
2. Read each repo's `README.md` for build + run commands.
3. The two repos share state through Supabase — `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` must match on both Netlify projects, or
   accounts created by the checkout won't be visible to the login.
4. Start at step 1 above (deploy the clinic app). Everything else is
   downstream of that.
