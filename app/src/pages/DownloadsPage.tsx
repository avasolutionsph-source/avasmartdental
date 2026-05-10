import { useEffect } from "react";
import {
  Apple,
  Download,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Zap,
  Wifi,
  ShieldCheck,
} from "lucide-react";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";

type Platform = {
  icon: typeof Monitor;
  title: string;
  subtitle: string;
  variants: { label: string; size?: string; cta: string; primary?: boolean }[];
};

const platforms: Platform[] = [
  {
    icon: Monitor,
    title: "Computer",
    subtitle: "Windows · macOS · ChromeOS · Linux",
    variants: [
      { label: "Windows 10 / 11", size: "12 MB", cta: "Download .exe", primary: true },
      { label: "macOS (Apple Silicon + Intel)", size: "14 MB", cta: "Download .dmg" },
      { label: "ChromeOS / Linux", cta: "Install as PWA" },
    ],
  },
  {
    icon: Tablet,
    title: "Tablet",
    subtitle: "iPad · Android tablets · Surface",
    variants: [
      { label: "iPad (iPadOS 14+)", cta: "Get on App Store", primary: true },
      { label: "Android tablets", cta: "Get on Google Play" },
      { label: "Microsoft Surface", cta: "Install as PWA" },
    ],
  },
  {
    icon: Smartphone,
    title: "Phone",
    subtitle: "iPhone · Android",
    variants: [
      { label: "iPhone (iOS 14+)", cta: "Get on App Store", primary: true },
      { label: "Android phones", cta: "Get on Google Play" },
    ],
  },
  {
    icon: Tv,
    title: "Smart TV / Display",
    subtitle: "Android TV · Apple TV · webOS · Tizen",
    variants: [
      { label: "Android TV / Google TV", cta: "Coming soon" },
      { label: "Apple TV", cta: "Coming soon" },
      { label: "Any TV with a browser", cta: "Open in browser" },
    ],
  },
];

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3", "fade-in-d4"];

function notReady() {
  alert("Coming soon! We'll email you the moment downloads are live.");
}

export default function DownloadsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Downloads — Ava Smart Dental";
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main>
        {/* Page header */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="hero-glow absolute inset-0 -z-10 opacity-60" />
          <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
          <div aria-hidden className="brand-blob b1 left-1/4 top-1/2 h-72 w-72" />
          <div aria-hidden className="brand-blob b2 right-1/4 top-1/4 h-80 w-80" />

          <div className="relative mx-auto max-w-4xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pb-20 sm:pt-24">
            <p className="fade-in inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
              <Download className="h-3.5 w-3.5" />
              Downloads
            </p>
            <h1 className="fade-in fade-in-d1 mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Install Ava on{" "}
              <span className="text-gradient-brand">every device</span> in your
              clinic.
            </h1>
            <p className="fade-in fade-in-d2 mx-auto mt-4 max-w-xl text-base text-fg-muted sm:mt-5 sm:text-lg">
              Native installs for Windows, macOS, iPad and Android. Walang
              installer for Linux/ChromeOS — install as a PWA in one tap.
            </p>
          </div>
        </section>

        {/* Platform cards */}
        <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
          <div aria-hidden className="brand-blob b3 left-10 top-32 h-72 w-72" />
          <div aria-hidden className="brand-blob b1 right-10 bottom-20 h-80 w-80" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              {platforms.map((p, i) => {
                const Icon = p.icon;
                return (
                  <article
                    key={p.title}
                    className={`fade-in ${delays[i]} card-hover group relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-clinical hover:border-brand-300 sm:p-8`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="icon-spin inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 group-hover:bg-brand-600 group-hover:text-white">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
                          {p.title}
                        </h2>
                        <p className="mt-1 text-sm text-fg-muted">{p.subtitle}</p>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-2.5">
                      {p.variants.map((v) => (
                        <li
                          key={v.label}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-fg">
                              {v.label}
                            </p>
                            {v.size && (
                              <p className="text-[11px] text-fg-subtle">{v.size}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={notReady}
                            className={`shimmer-sweep group/btn inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all duration-300 ${
                              v.primary
                                ? "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-glow-brand"
                                : "border border-line-2 bg-white text-fg-2 hover:border-brand-300 hover:text-fg hover:shadow-md"
                            }`}
                          >
                            {/iOS|App Store/.test(v.cta) ? (
                              <Apple className="h-3.5 w-3.5" />
                            ) : v.cta.includes("Browser") || v.cta.includes("PWA") ? (
                              <Globe className="h-3.5 w-3.5" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            {v.cta}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            {/* Why install banner */}
            <div className="fade-in fade-in-d5 mt-10 grid gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 sm:grid-cols-3 sm:gap-6 sm:p-8">
              {[
                {
                  icon: Zap,
                  title: "Faster than the browser tab",
                  desc: "Native window, no browser chrome, opens with one click.",
                },
                {
                  icon: Wifi,
                  title: "Offline-tolerant",
                  desc: "Keep working through brief internet drops. Syncs when back.",
                },
                {
                  icon: ShieldCheck,
                  title: "Same data, every device",
                  desc: "Your clinic data syncs in real time via Supabase.",
                },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-brand-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[14px] font-bold text-brand-900">
                        {b.title}
                      </p>
                      <p className="mt-0.5 text-[13px] text-brand-900/70">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="fade-in fade-in-d6 mt-8 text-center text-xs text-fg-subtle">
              Downloads are coming soon. Sa ngayon, you can use Ava in any
              modern browser at <span className="font-semibold text-fg-2">app.avasmartdental.ph</span>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
