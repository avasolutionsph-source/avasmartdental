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

export function CompatibleDevices() {
  return (
    <section id="devices" className="relative border-y border-line bg-surface-2 py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="reveal text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Compatible devices
          </h2>
          <p className="reveal mt-4 text-base text-fg-muted sm:text-lg">
            Web-based, runs in any modern browser. Walang installer. Walang IT
            setup. Mag-login ka lang.
          </p>
        </div>

        <div className="reveal mx-auto mt-10 grid max-w-5xl gap-8 sm:mt-14 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-6">
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <article key={g.title} className="text-center">
                <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-100 bg-white shadow-sm">
                  <Icon className="h-9 w-9 text-brand-600" strokeWidth={1.4} />
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

        <p className="reveal mx-auto mt-10 max-w-xl text-center text-xs text-fg-subtle sm:mt-14">
          Built as a Progressive Web App — installable on any device, with
          offline-tolerant editing and instant sync via Supabase.
        </p>
      </div>
    </section>
  );
}
