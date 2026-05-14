import { useCallback, useEffect, useState } from "react";

// Chrome/Edge/Android fire this; Safari (desktop + iOS) never does.
type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type InstallStatus =
  | "loading"
  | "ready"
  | "ios"
  | "installed"
  | "unsupported"
  | "redirect";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS 13+ reports as Mac; check touch + Safari for the iPad case.
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (
    navigator.platform === "MacIntel" &&
    (navigator.maxTouchPoints ?? 0) > 1 &&
    /Safari/.test(ua) &&
    !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua)
  ) {
    return true;
  }
  return false;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari sets this non-standard property when launched from home screen.
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

// If the clinic-app PWA lives on a different origin (configured via
// VITE_APP_URL), the install button on the landing site should send users
// there instead of trying to install the landing site itself.
// Build-time constant + window.location.origin doesn't change in an SPA
// session, so compute once and cache.
let cachedClinicAppUrl: string | null | undefined;
function getClinicAppUrl(): string | null {
  if (cachedClinicAppUrl !== undefined) return cachedClinicAppUrl;
  const raw = import.meta.env.VITE_APP_URL as string | undefined;
  if (!raw) return (cachedClinicAppUrl = null);
  try {
    const target = new URL(raw);
    if (typeof window === "undefined")
      return (cachedClinicAppUrl = target.toString());
    const here = new URL(window.location.href);
    if (target.origin === here.origin) return (cachedClinicAppUrl = null);
    return (cachedClinicAppUrl = target.toString());
  } catch {
    return (cachedClinicAppUrl = null);
  }
}

export function usePwaInstall() {
  const [status, setStatus] = useState<InstallStatus>("loading");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const clinicAppUrl = getClinicAppUrl();

  useEffect(() => {
    if (isStandalone()) {
      setStatus("installed");
      return;
    }

    if (clinicAppUrl) {
      setStatus("redirect");
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setStatus("ready");
    }

    function onInstalled() {
      setDeferredPrompt(null);
      setStatus("installed");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // If beforeinstallprompt never fires within a couple of seconds, fall
    // back to an OS-aware status so the UI can show the right guidance.
    const t = window.setTimeout(() => {
      setStatus((prev) => {
        if (prev !== "loading") return prev;
        if (isIos()) return "ios";
        return "unsupported";
      });
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(t);
    };
  }, [clinicAppUrl]);

  const promptInstall = useCallback(async () => {
    if (clinicAppUrl) {
      window.location.assign(clinicAppUrl);
      return { outcome: "redirected" as const };
    }
    if (!deferredPrompt) return { outcome: "dismissed" as const };
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
      setStatus("installed");
    }
    return result;
  }, [deferredPrompt, clinicAppUrl]);

  return { status, promptInstall };
}
