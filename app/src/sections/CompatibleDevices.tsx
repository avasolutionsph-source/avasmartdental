import { Monitor, Tablet, Smartphone, Tv } from "lucide-react";

const groups = [
  {
    icon: Tv,
    title: "Smart TV / Display",
    items: ["Android TV", "Apple TV", "Chromecast", "LG TV (webOS)", "Samsung Tizen", "Any TV with a browser"],
  },
  {
    icon: Monitor,
    title: "Computer",
    items: ["Windows PC", "macOS", "ChromeOS", "Linux"],
  },
  {
    icon: Tablet,
    title: "Tablet",
    items: ["iPad (iPadOS 14+)", "Android tablets", "Samsung Galaxy Tab", "Microsoft Surface"],
  },
  {
    icon: Smartphone,
    title: "Phone",
    items: ["iPhone (iOS 14+)", "Android phones", "Add to home screen as PWA"],
  },
];

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3", "fade-in-d4"];

export function CompatibleDevices() {
  return (
    <section id="devices" className="relative overflow-hidden border-y border-line bg-surface-2 py-16 sm:py-24 lg:py-28">
      <div aria-hidden className="brand-blob b1 -left-24 -top-20 h-72 w-72" />
      <div aria-hidden className="brand-blob b2 -right-32 -bottom-20 h-80 w-80" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="fade-in text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Compatible devices
          </h2>
          <p className="fade-in fade-in-d1 mt-4 text-base text-fg-muted sm:text-lg">
            Web-based, runs in any modern browser. Walang installer. Walang IT
            setup. Mag-login ka lang.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 sm:mt-14 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-6">
          {groups.map((g, i) => {
            const Icon = g.icon;
            return (
              <article
                key={g.title}
                className={`fade-in ${delays[i]} group text-center`}
              >
                <div className="card-hover mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-100 bg-white shadow-sm group-hover:shadow-lg group-hover:shadow-brand-200/40">
                  <Icon
                    className="icon-spin h-9 w-9 text-brand-600 group-hover:text-brand-700"
                    strokeWidth={1.4}
                  />
                </div>
                <h3 className="mt-5 text-lg font-bold text-fg">{g.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="fade-in fade-in-d6 mx-auto mt-10 max-w-xl text-center text-xs text-fg-subtle sm:mt-14">
          Built as a Progressive Web App — installable on any device, with
          offline-tolerant editing and instant sync via Supabase.
        </p>
      </div>
    </section>
  );
}
