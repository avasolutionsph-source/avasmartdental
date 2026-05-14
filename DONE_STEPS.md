# Done — what's already shipped

Two repos make up Ava Smart Dental:

- **Landing site / checkout** — this repo (`avasolutionsph-source/avasmartdental`).
  React + Vite + Tailwind, deployed on Netlify at `sage-cassata-3c02a4.netlify.app`.
- **Clinic app (PWA)** — sibling repo (`avasolutionsph-source/Smart-Dental`).
  React + Vite + Tailwind + Supabase, not deployed yet at time of writing.

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
  `promptInstall()` function.
- `DownloadsPage` "Install Ava" button is real now — fires the native
  install dialog on Chrome/Edge/Android, shows a 3-step Share→Add-to-Home
  walkthrough on iOS, falls back to a Bookmark hint elsewhere, and
  collapses to "Already installed" once installed.

### Env vars (Netlify → Environment variables)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — optional; without them
  signup is simulated.
- `VITE_APP_REDIRECT_URL` — where Supabase's confirmation-email link
  should land users.
- `VITE_APP_URL` — public URL of the clinic-app PWA.

---

## Clinic app — `mgv-app/` (sanitized clone) → pushed to `Smart-Dental` repo

### Sanitization
- Cloned from `~/Desktop/mgv/Smart-Dental` into `mgv-app/`. Confirmed
  zero hardcoded credentials — everything reads from env. Added a
  `.env.example` template.

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

## Cross-repo end-to-end flow (works once both Netlifies are configured)

1. User picks a plan on `/pricing` (landing).
2. Fills checkout, including a password. Confirms.
3. Building animation plays while `supabase.auth.signUp` creates the
   user with clinic metadata + `trial_end`.
4. Success page tells them to check email.
5. User clicks the Supabase confirmation email → email verified.
6. User installs/opens the clinic-app PWA → sees `/login`.
7. Signs in with the same email + password from checkout.
8. Lands in the dashboard. Trial is active for 14 days.
