# Ava Smart Dental

Clinic management for Filipino dental practices — patients, dental charting,
appointments, billing, prescriptions, and reports. Built as a Progressive Web
App so it installs on any device with no separate native builds.

## Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 4** for styling
- **Supabase** for auth + Postgres data + row-level security
- **vite-plugin-pwa** + Workbox for offline + installable app shell
- **TanStack Query** for server state
- **Zustand** for local UI state

## Getting started

```bash
npm install
cp .env.example .env       # fill in your Supabase URL + anon key
npm run dev
```

Then open http://localhost:5173 — Chrome/Edge will show an Install button in
the address bar once the manifest loads.

## Scripts

- `npm run dev` — Vite dev server (PWA disabled in dev for fast HMR)
- `npm run build` — TypeScript check + production build with SW + manifest
- `npm run preview` — serve the built `dist/` (use this to test the PWA)
- `npm run lint` — ESLint pass

## PWA behavior

`vite-plugin-pwa` runs in `autoUpdate` mode — new deploys silently activate on
the next reload. Supabase responses use a `NetworkFirst` cache so data stays
fresh but the app survives brief offline gaps. Images use
`StaleWhileRevalidate`.

## Deployment

The app is Netlify-friendly (`netlify.toml` is shipped; SPA fallback in
`public/_redirects`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
in the Netlify environment variables panel.
