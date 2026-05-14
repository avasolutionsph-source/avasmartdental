# Deploy — full flow from scratch

One repo, two apps, one Supabase. Follow in order — each step depends on
the previous.

---

## 0. Repo structure

```
avasmartdental/
├── app/                       Landing site (marketing, /pricing, /checkout, /downloads)
│   └── netlify.toml? (uses top-level netlify.toml at the moment)
├── clinic-app/                Clinic app PWA (login, /dashboard, /patients, etc.)
│   └── netlify.toml           Already configured for clinic-app
├── supabase/migrations/       SQL: clinics table + handle_new_user trigger (layered on top)
├── clinic-app/supabase/       SQL: base schema for patients, appointments, billing, etc.
└── netlify.toml               Top-level — builds app/ (landing site) by default
```

**Both apps live in this single `avasmartdental` repo.** The
`Smart-Dental` repo (the original clinic-app remote) is no longer the
source of truth — everything has been copied here.

---

## 1. Pick ONE Supabase project for both apps

Without this, signups on the landing site won't be able to log into the
clinic app.

### Recommendation: use Smart-Dental's existing Supabase

You said the clinic app already has its own Supabase (with patients,
appointments, billing, etc. tables already populated or schema-ready).
Easiest path: point the **landing site** at that same Supabase.

You'll need from the Supabase Dashboard → Project Settings → API:

- Project URL (`https://xxxxxx.supabase.co`)
- Publishable key (`sb_publishable_...`) or legacy `anon` JWT

The new Supabase project (`ehirqsqkfnjuuvzthsrx`) we created earlier is
no longer needed — you can leave it idle or delete it.

---

## 2. Apply SQL migrations to the chosen Supabase

In Supabase Dashboard → SQL Editor, paste and run **in this order**:

**A. Clinic-app base schema (if not already applied):**
- `clinic-app/supabase/migration.sql`
- `clinic-app/supabase/migration-002-expenses.sql`
- `clinic-app/supabase/migration-003-recall-date.sql`
- `clinic-app/supabase/migration-004-tooth-photos.sql`
- `clinic-app/supabase/migration-005-logo-size.sql`
- `clinic-app/supabase/migration-006-logo-align.sql`
- `clinic-app/supabase/migration-007-logo-position.sql`

Skip whichever are already applied. Most projects already have these.

**B. Landing-site signup + multi-tenant layer (NEW — needs to be applied):**
- `supabase/migrations/0001_clinics.sql` — `clinics` table + RLS
- `supabase/migrations/0002_handle_new_user.sql` — trigger that
  creates a `clinics` row from checkout signup metadata
- `supabase/migrations/0003_multi_tenant.sql` — adds `clinic_id` to
  every clinic-data table, tenant-scoped RLS, auto-provisioning of
  per-clinic settings/payment_terms

⚠️ **Apply 0003 before letting more than one clinic sign up.** Without
it, any signed-in user can read every clinic's patients, billing, etc.

After this, a checkout signup creates: auth user → clinics row →
clinic_settings row → default payment_terms — all atomically via
triggers.

---

## 3. Deploy the LANDING SITE (smartdental.avasolutions.ph)

### A. Netlify Site settings

- Repository: `avasolutionsph-source/avasmartdental`
- Branch: `main`
- **Base directory: `app/`** ← important
- Build command: `npm run build` (auto-detected from `app/netlify.toml` or root `netlify.toml`)
- Publish directory: `dist`

### B. Environment variables

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | (from Step 1 — clinic-app's Supabase URL) |
| `VITE_SUPABASE_ANON_KEY` | (from Step 1 — publishable/anon key) |
| `VITE_APP_URL` | `https://smartdentalapp.avasolutions.ph` |
| `VITE_APP_REDIRECT_URL` | `https://smartdentalapp.avasolutions.ph/login` |

⚠️ Common typos to avoid: `VITE_APP_UR` (missing L), trailing slashes,
extra spaces.

### C. Deploy
Deploys → Trigger deploy → **Clear cache and deploy site**.

### D. Verify
Open `https://smartdental.avasolutions.ph/downloads` → button should say
**"Open the Ava app"** (not "Install in this browser").

---

## 4. Deploy the CLINIC APP (smartdentalapp.avasolutions.ph)

### A. Netlify Site settings

If you already have a Netlify site for this subdomain (currently mis-
configured to build the landing site), reconfigure it. Otherwise create
a new one.

- Repository: `avasolutionsph-source/avasmartdental` (yes, same repo as
  the landing site — both apps live in the monorepo now)
- Branch: `main`
- **Base directory: `clinic-app/`** ← critical, this is what makes
  Netlify build the right app
- Build command: `npm run build` (auto-detected from
  `clinic-app/netlify.toml`)
- Publish directory: `dist`

### B. Environment variables

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | (same value as landing site) |
| `VITE_SUPABASE_ANON_KEY` | (same value as landing site) |

⚠️ Both apps **must point at the same Supabase project** or accounts
created on landing won't exist for clinic app login.

### C. Custom domain
- Domain management → Add `smartdentalapp.avasolutions.ph`
- Follow Netlify's DNS instructions (CNAME / Netlify DNS)

### D. Deploy
Trigger deploy → Clear cache and deploy site.

### E. Verify
Open `https://smartdentalapp.avasolutions.ph` → should show the
**Login page** (NOT the "One button. Every device." marketing copy).

---

## 5. Smoke test end-to-end

1. Incognito → `https://smartdental.avasolutions.ph/pricing`
2. Pick a plan → fill checkout (use a real email you can check)
3. Confirm → wait for the building animation → success page
4. Check email for the Supabase confirmation link
5. Click link → lands on `https://smartdentalapp.avasolutions.ph/login`
6. Sign in with same email + password from step 2
7. Lands on `/dashboard`
8. Supabase Dashboard → Table Editor → `clinics` → confirm row exists
   for the new signup

If any step breaks, check:
- Step 4 missing email → Supabase Dashboard → Authentication →
  Email Templates / Providers → "Confirm email" setting
- Step 5 lands on wrong page → `VITE_APP_REDIRECT_URL` env var
- Step 6 wrong password → password not captured at checkout (this
  shouldn't happen post-`ef8630f`)
- Step 8 no `clinics` row → trigger from `0002_handle_new_user.sql`
  not applied to the right Supabase

---

## 6. Supabase auth configuration (one-time)

In Supabase Dashboard:

- **Authentication → URL Configuration → Site URL:**
  `https://smartdentalapp.avasolutions.ph`
- **Authentication → URL Configuration → Redirect URLs:** add
  `https://smartdentalapp.avasolutions.ph/**` and
  `https://smartdental.avasolutions.ph/**`
- **Authentication → Email Templates:** rebrand Confirmation /
  Magic Link / Recovery emails with Ava copy.
- **Authentication → Providers → Email:** keep "Confirm email" ON for
  prod (turn off only during testing).

---

## Recap of the install flow

Once everything's deployed:

```
1. Dentist visits smartdental.avasolutions.ph
2. /pricing → /checkout → enters details + password + card → confirms
3. Building animation → Supabase signUp() → /checkout/success
4. Email confirmation → clicks link → lands on smartdentalapp/login
5. Signs in → /dashboard
6. From browser menu (Chrome/Edge/Android), prompted to install the PWA
7. (Or from landing site /downloads → "Open the Ava app" button →
   redirects to clinic app → browser prompts install there)
```
