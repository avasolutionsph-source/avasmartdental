# Done — what's already shipped

**Monorepo:** both apps now live in this single `avasmartdental` repo.

- **Landing site / checkout** — `app/` subfolder.
  React + Vite + Tailwind, deployed on Netlify at `smartdental.avasolutions.ph`.
- **Clinic app (PWA)** — `clinic-app/` subfolder (cloned from the
  now-archived `Smart-Dental` repo).
  React + Vite + Tailwind v4 + Supabase, target: `smartdentalapp.avasolutions.ph`.

See `DEPLOY.md` for the full Netlify + Supabase setup walkthrough.

---

## Landing site — `app/`

### Checkout / payment flow
- `/pricing` CTAs route into `/checkout?plan=solo|clinic|multibranch`
  (multi-branch keeps its mailto sales link). Shared plan data in
  `src/lib/plans.ts`.
- 3-step checkout: **Account → Payment → Review** with a sticky
  `PlanSummary` side panel showing trial breakdown and "₱0 today".
- `AccountForm` captures clinic name, contact, mobile, work email, **and a
  password (≥8 chars, show/hide toggle)**.
- `PaymentForm` is a NextPay-branded card capture with Luhn validation,
  auto-format, expiry sanity check, brand detection. Frontend only — no
  real tokenization yet.
- `ReviewStep` masks the card, requires explicit consent checkbox, calls
  `handleConfirm`.
- `BuildingAnimation` overlay plays a 3-phase sequence (secure payment →
  create workspace → activate trial) with stacked-blocks visual.
- `signupClinic` (`src/lib/supabase.ts`) calls
  `supabase.auth.signUp({ email, password, options.data: metadata })` so
  trial_end + clinic metadata is saved on the user row. Gracefully
  simulates when env vars are unset (returns `simulated: true`).
- `CheckoutSuccessPage` shows email-confirmation copy + demo-mode banner
  when Supabase is unconfigured.

### Marketing pages
- `HomePage`, `PricingPage`, `DownloadsPage`, `FAQPage` — all in
  `src/pages/`. Section components in `src/sections/`.
- Brand: warm white + violet `#7c3aed` family, Inter + Fraunces fonts.

### Landing site is itself a PWA
- `vite-plugin-pwa` configured in `vite.config.ts`: full manifest, SW via
  Workbox in autoUpdate mode, icons from `public/logo-mark.png`.
- `src/lib/usePwaInstall.ts` hook captures `beforeinstallprompt`,
  detects iOS, watches `appinstalled`, and exposes a single
  `promptInstall()` function. When `VITE_APP_URL` is set to a different
  origin, the hook flips to a `redirect` status and `promptInstall()`
  sends the user to the clinic-app PWA to install there instead — so
  "Install Ava" on the landing site installs the actual product, not
  the marketing site.
- `DownloadsPage` "Install Ava" button is real now — fires the native
  install dialog on Chrome/Edge/Android, shows a 3-step Share→Add-to-Home
  walkthrough on iOS, falls back to a Bookmark hint elsewhere, redirects
  to the clinic-app PWA when `VITE_APP_URL` points off-origin, and
  collapses to "Already installed" once installed.

### Performance
- Route-level code splitting via `React.lazy` in `main.tsx` — only
  `HomePage` ships in the initial bundle; `PricingPage`, `FAQPage`,
  `DownloadsPage`, `CheckoutPage`, `CheckoutSuccessPage` are split into
  separate chunks loaded behind a `<Suspense>` spinner. Main chunk is
  now under the Vite 500kB warning threshold.

### Supabase schema (committed in `supabase/migrations/`)
- `0001_clinics.sql` — `public.clinics` table (owner_user_id FK to
  `auth.users`, plan, trial_end, subscription_status with check
  constraint), index on owner_user_id, RLS with read + update policies
  scoped to `auth.uid()`, and a `set_updated_at` trigger.
- `0002_handle_new_user.sql` — `SECURITY DEFINER` function fired on
  `auth.users` insert. Reads `raw_user_meta_data` written by
  `signupClinic()` and inserts the matching `clinics` row. Silently
  skips users without clinic metadata (so admin-created users don't
  break), idempotent via `ON CONFLICT`.
- `0003_multi_tenant.sql` — multi-tenant lockdown. Adds `clinic_id`
  column (with `default current_clinic_id()` so inserts auto-scope)
  and indexes to all 22 clinic-data tables (patients, dentists,
  appointments, billing, treatments, invoices, payments, expenses,
  prescriptions, drugs, services, file_assets, settings, etc.).
  Replaces every wide-open `using (true)` policy with a tenant-scoped
  `clinic_id = current_clinic_id()` policy on select/insert/update/
  delete. Drops the legacy `clinic_settings.id = 1` single-row check;
  adds `on_clinic_created` trigger that auto-provisions per-clinic
  `clinic_settings` and default `payment_terms` whenever a `clinics`
  row is inserted.
- See `supabase/README.md` for how to apply (Dashboard SQL Editor or
  `supabase db push`).

### Env vars (Netlify → Environment variables)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — optional; without them
  signup is simulated.
- `VITE_APP_REDIRECT_URL` — where Supabase's confirmation-email link
  should land users.
- `VITE_APP_URL` — public URL of the clinic-app PWA.

---

## Clinic app — `clinic-app/` (merged into this repo)

### Merge
- The `Smart-Dental` GitHub repo has been cloned into `clinic-app/` and
  its `.git` removed, so the clinic app source now lives in this same
  `avasmartdental` repo. One repo, two Vite projects, one shared
  Supabase. The `Smart-Dental` remote is no longer the source of truth.
- Vite config patched (`clinic-app/vite.config.ts`) with explicit empty
  `css.postcss` config so Vite doesn't walk up the FS tree and pick up a
  stray `~/postcss.config.js` (which was breaking the build on Windows).
- Inner `DONE_STEPS.md` / `NEXT_STEPS.md` deleted — top-level versions
  are canonical.

### PWA setup
- `vite-plugin-pwa` with full manifest (`name: Ava Smart Dental`,
  `theme_color: #7c3aed`, standalone display, `en-PH`, medical category).
- Icons: `public/icons/icon-192.png`, `icon-512.png` (any + maskable),
  `apple-touch-icon.png`, `favicon.png`.
- SW registers in `main.tsx` via `registerSW({ immediate: true })`.
  Workbox `runtimeCaching` does NetworkFirst for Supabase + StaleWhileRevalidate
  for images. `navigateFallback` to `/index.html`.

### Rebrand SmartDental → Ava Smart Dental
- `package.json` name, README rewritten.
- User-facing strings updated in: LoginPage, Sidebar, TopBar, BillingPage
  receipt header + footer, ui/index.ts comment, index.html title +
  apple-mobile-web-app-title.
- Primary + accent color palettes in `src/index.css` swapped to brand
  violet (#7c3aed family). Sidebar gradient moved to deep violet
  (#5b21b6 / #6d28d9 / #4c1d95).
- LocalStorage keys (`smartdental_calendar_bg`, `smart-dental-legend`)
  **intentionally kept** so existing user data persists.

### Auth wall (login → dashboard)
- `src/lib/auth.tsx` already had `AuthProvider` + `useAuth()` wired to
  `supabase.auth.signInWithPassword` / `signOut`.
- `src/app/router.tsx` re-enabled the gate: `/login` renders LoginPage,
  `ProtectedRoute` redirects unauth users to `/login`, an `AuthGateSplash`
  holds the screen while the initial session resolves.
- PWA `start_url` is `/`, which redirects to `/dashboard`, which
  redirects to `/login` if not signed in — so installed-PWA users land
  on the login screen immediately.

---

## End-to-end flow (works once both Netlify sites + shared Supabase are configured)

1. User picks a plan on `/pricing` (landing).
2. Fills checkout, including a password. Confirms.
3. Building animation plays while `supabase.auth.signUp` creates the
   user with clinic metadata + `trial_end`.
4. Success page tells them to check email.
5. User clicks the Supabase confirmation email → email verified.
6. User installs/opens the clinic-app PWA → sees `/login`.
7. Signs in with the same email + password from checkout.
8. Lands in the dashboard. Trial is active for 14 days.
