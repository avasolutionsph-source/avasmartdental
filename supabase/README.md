# Supabase

SQL migrations for the Ava Smart Dental Supabase project. The **same**
Supabase project backs both the landing-site checkout and the clinic-app
PWA — see `../NEXT_STEPS.md` step 2.

## Applying migrations

Pick one of:

**Dashboard (quickest, one-off):**
SQL Editor → paste each `migrations/*.sql` file in order → Run.

**Supabase CLI (preferred for ongoing work):**

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## What's here

- `migrations/0001_clinics.sql` — `public.clinics` table, indexes, RLS
  policies, and `set_updated_at` trigger.
- `migrations/0002_handle_new_user.sql` — trigger on `auth.users` insert
  that reads the `raw_user_meta_data` written by `signupClinic()` in
  `app/src/lib/supabase.ts` and creates the matching `clinics` row.

## Still TODO (see `../NEXT_STEPS.md`)

- RLS on every existing table from the clinic app (`patients`,
  `appointments`, etc.) — scope to the signed-in user's clinic.
- NextPay webhook handler that flips `subscription_status` to
  `active` / `past_due` / `canceled`.
- Scheduled job (Supabase pg_cron or Netlify Scheduled Function) to
  charge on `trial_end` and on each monthly anniversary.
