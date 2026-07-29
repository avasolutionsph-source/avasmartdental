// Where the installable clinic-app PWA lives (login / dashboard). Existing
// users "Sign in" there; signup itself happens on THIS marketing site at
// /checkout (the clinic app has no public signup route).
//
// Set VITE_APP_URL in the marketing site's production env to the clinic app's
// canonical URL. Falls back to the live custom domain so "Sign in" still works
// even if the env var is missing.
const FALLBACK_CLINIC_APP_URL = "https://smartdentalapp.avasolutions.ph";

export function clinicAppUrl(): string {
  const raw = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  return (raw || FALLBACK_CLINIC_APP_URL).replace(/\/+$/, "");
}

/** The clinic app's login page — for existing users. */
export function clinicLoginUrl(): string {
  return `${clinicAppUrl()}/login`;
}
