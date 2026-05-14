import { useEffect } from "react";
import {
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Zap,
  Wifi,
  ShieldCheck,
  Check,
  Share,
  PlusSquare,
} from "lucide-react";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { usePwaInstall } from "../lib/usePwaInstall";

const platforms = [
  { icon: Monitor, label: "Windows · macOS · ChromeOS · Linux" },
  { icon: Tablet, label: "iPad · Android tablets · Surface" },
  { icon: Smartphone, label: "iPhone · Android phones" },
  { icon: Tv, label: "Smart TV with a browser" },
];

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3", "fade-in-d4"];

export default function DownloadsPage() {
  const { status, promptInstall } = usePwaInstall();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Download Ava — Ava Smart Dental";
  }, []);

  const buttonLabel =
    status === "installed"
      ? "Already installed"
      : status === "ios"
        ? "Add to Home Screen"
        : status === "unsupported"
          ? "Install in this browser"
          : "Install Ava";

  const buttonHint =
    status === "installed"
      ? "Open Ava from your home screen or app launcher."
      : status === "ios"
        ? "Tap Share, then Add to Home Screen — instructions below."
        : status === "unsupported"
          ? "Use Chrome, Edge, or Android Chrome to install. Otherwise, bookmark this page."
          : status === "loading"
            ? "Detecting your device…"
            : "Tap Install when your browser asks.";

  const showIosTip = status === "ios";
  const buttonDisabled = status === "loading" || status === "installed";

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main>
        {/* Hero — single install button */}
        <section className="relative overflow-hidden">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
          <div aria-hidden className="brand-blob b1 left-1/4 top-1/2 h-80 w-80" />
          <div aria-hidden className="brand-blob b2 right-1/4 top-1/4 h-96 w-96" />

          <div className="relative mx-auto max-w-4xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pb-20 sm:pt-24">
            <p className="fade-in inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
              <Download className="h-3.5 w-3.5" />
              Download
            </p>

            <h1 className="fade-in fade-in-d1 mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-5xl lg:text-7xl">
              One button.{" "}
              <span className="text-gradient-brand">Every device.</span>
            </h1>

            <p className="fade-in fade-in-d2 mx-auto mt-5 max-w-xl text-base text-fg-muted sm:text-lg">
              Ava is a Progressive Web App — auto-detects your device and
              installs natively. Walang installers, walang chos.
            </p>

            {/* The single big install button */}
            <div className="fade-in fade-in-d3 mt-10 flex flex-col items-center">
              <button
                type="button"
                onClick={promptInstall}
                disabled={buttonDisabled}
                className="group shimmer-sweep inline-flex items-center gap-3 rounded-full bg-brand-600 px-8 py-4 text-[16px] font-bold text-white shadow-glow-brand transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:px-10 sm:py-5 sm:text-[17px]"
              >
                <Download className="h-5 w-5" />
                {buttonLabel}
              </button>
              <p className="mt-3 text-xs text-fg-subtle">{buttonHint}</p>

              {showIosTip && (
                <div className="mt-6 max-w-md rounded-2xl border border-brand-200 bg-white p-4 text-left text-sm shadow-clinical">
                  <p className="font-semibold text-fg">On iPhone / iPad:</p>
                  <ol className="mt-2 space-y-1.5 text-fg-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                        1
                      </span>
                      <span>
                        Tap the <Share className="inline h-3.5 w-3.5" /> Share
                        button in Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                        2
                      </span>
                      <span>
                        Pick <PlusSquare className="inline h-3.5 w-3.5" /> Add
                        to Home Screen.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                        3
                      </span>
                      <span>Tap Add — Ava opens like a native app.</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Compatibility row — icons only, no buttons */}
            <div className="fade-in fade-in-d4 mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-fg-muted sm:gap-x-10">
              {platforms.map((p) => {
                const Icon = p.icon;
                return (
                  <span key={p.label} className="inline-flex items-center gap-2 text-[13px]">
                    <Icon className="h-4 w-4 text-brand-600" />
                    {p.label}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why install + how-it-works */}
        <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
          <div aria-hidden className="brand-blob b3 left-10 top-32 h-72 w-72" />
          <div aria-hidden className="brand-blob b1 right-10 bottom-20 h-80 w-80" />

          <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
            {/* Why install */}
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
              {[
                {
                  icon: Zap,
                  title: "Faster than a tab",
                  desc: "Opens in its own window, no browser chrome, launches instantly.",
                },
                {
                  icon: Wifi,
                  title: "Offline-tolerant",
                  desc: "Keep working through brief internet drops. Syncs when back.",
                },
                {
                  icon: ShieldCheck,
                  title: "One data set, everywhere",
                  desc: "Your clinic data syncs in real time across every install.",
                },
              ].map((b, i) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    className={`fade-in ${delays[i]} card-hover rounded-2xl border border-line bg-white p-6 hover:border-brand-300 hover:shadow-clinical`}
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight text-fg">
                      {b.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                      {b.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* How it works */}
            <div className="fade-in fade-in-d4 mt-10 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100 sm:inline-flex">
                  <Download className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold tracking-tight text-brand-900 sm:text-xl">
                    How the install works
                  </h3>
                  <ol className="mt-4 space-y-2.5 text-[14px] text-brand-900/85">
                    {[
                      "Tap the Install Ava button — your browser detects your device.",
                      "On phone/tablet: Ava installs as an app on your home screen.",
                      "On computer: Ava installs as a standalone window app.",
                      "Sign in once. Your clinic data syncs across every install.",
                    ].map((step, i) => (
                      <li key={step} className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* Compatibility detail list */}
            <div className="fade-in fade-in-d5 mt-10 rounded-2xl border border-line bg-white p-6 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
                Verified compatible
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                One PWA, every modern browser and OS. No separate builds.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] text-fg-2 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  "Windows 10 / 11",
                  "macOS 11+",
                  "ChromeOS",
                  "Linux",
                  "iPad (iPadOS 14+)",
                  "iPhone (iOS 14+)",
                  "Android phones",
                  "Android tablets",
                  "Samsung Galaxy Tab",
                  "Microsoft Surface",
                  "Android TV (browser)",
                  "Any TV with a browser",
                ].map((label) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" strokeWidth={3} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <p className="fade-in fade-in-d6 mt-8 text-center text-xs text-fg-subtle">
              Already installed? Open Ava from your home screen or Applications
              folder — it launches like a native app.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
