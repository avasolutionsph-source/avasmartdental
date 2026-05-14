# Next — what's left to do

Ordered roughly by what unblocks the most. See `DONE_STEPS.md` for the
shipped surface this builds on.

---

## 1. Stand up the clinic-app deployment (blocks the whole flow)

Right now `Smart-Dental` repo has the PWA wired but isn't deployed.
Without it, the install + login UX has nowhere to land.

- [ ] In Netlify, **Add new site → Import from GitHub →
      `avasolutionsph-source/Smart-Dental`** (separate site from the
      landing one).
  - Build command + publish dir auto-detect from the repo's
    `netlify.toml` (already shipped).
- [ ] Set env vars on **both** Netlify projects to the **same Supabase
      project** — that's how a checkout signup becomes a login on the
      clinic app:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] On the **landing** Netlify, also set:
  - `VITE_APP_URL` = the clinic app's Netlify URL (e.g.
    `https://ava-clinic.netlify.app`)
  - `VITE_APP_REDIRECT_URL` = same URL (this is where Supabase's
    "confirm your email" link sends users)
- [ ] Optional: rename the Netlify site (Site settings → Change site
      name) to `ava-clinic-app` or similar.
- [ ] Optional but recommended: point a custom subdomain
      `app.avasmartdental.ph` at the clinic Netlify; the bare apex/`www`
      at the landing Netlify.

After this the install button on `/downloads` of the landing site lets
the user install **either** site. We should decide which one is "the
app" — likely the clinic app, in which case `/downloads` should link to
the clinic app URL (the code already supports it via `VITE_APP_URL`,
but the current Downloads page directly fires its own install prompt
for the landing site). Pick one direction and commit to it.

## 2. Supabase configuration

- [ ] In Supabase Dashboard → **Authentication → Email Templates**,
      rebrand the confirmation, magic-link, and recovery emails with Ava
      copy and link styling. Set the redirect URL.
- [ ] Authentication → Providers → Email → decide whether **"Confirm
      email"** stays on. Default ON is safer; turn OFF only for early
      testing.
- [ ] Add a **`clinics` table** (or columns on `auth.users` via a
      trigger) so the signup metadata persists in a real row, not just
      `raw_user_meta_data`. Sample shape:

  ```sql
  create table public.clinics (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users on delete cascade,
    name text not null,
    contact_name text,
    phone text,
    plan text not null,
    trial_end timestamptz not null,
    subscription_status text not null default 'trialing',
    created_at timestamptz default now()
  );
  alter table public.clinics enable row level security;
  create policy "owners read own clinic" on public.clinics
    for select using (auth.uid() = owner_user_id);
  ```

  Then add a `handle_new_user` trigger or a Supabase Edge Function that
  reads `raw_user_meta_data` and inserts a `clinics` row on signup.

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

- [ ] Bundle sizes are flagged by Vite (>500kB main chunk on both
      apps). Code-split with `React.lazy` on the heaviest routes
      (`ReportsPage`, `PatientProfilePage` are the biggest in the
      clinic app).
- [ ] No tests anywhere yet. Start with the checkout validation
      (`PaymentForm` luhn / expiry, `AccountForm` password rules) and
      the auth gate behavior.
- [ ] Sentry or similar for prod error reporting on both sites.
- [ ] Replace the placeholder `123 Dental Avenue, Makati City` text in
      receipts with clinic-configurable address from the `clinics` row.

## 8. Once the original mgv-app folder is no longer the source of truth

`/Users/kennmhenard/Desktop/AvaSmartDental/mgv-app/` is a sanitized
clone with no `.git`. `~/Desktop/mgv/Smart-Dental/` is the canonical
working tree (has the GitHub remote). Currently any change to the
clinic app means editing both, then syncing. Once you trust the
sanitized copy is what you want, delete the original and re-clone from
the remote into the sanitized location.

---

## How to pick this up

1. Read `DONE_STEPS.md` to know what surface exists.
2. Read each repo's `README.md` for build + run commands.
3. The two repos share state through Supabase — `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` must match on both Netlify projects, or
   accounts created by the checkout won't be visible to the login.
4. Start at step 1 above (deploy the clinic app). Everything else is
   downstream of that.
