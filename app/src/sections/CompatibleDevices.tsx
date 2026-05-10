import { Monitor, Tablet, Smartphone, Tv } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, stagger, inViewProps } from "../lib/motion";

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
        <motion.div
          className="mx-auto max-w-2xl text-center"
          variants={stagger(0, 0.12)}
          {...inViewProps}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl"
          >
            Compatible devices
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base text-fg-muted sm:text-lg">
            Web-based, runs in any modern browser. Walang installer. Walang IT
            setup. Mag-login ka lang.
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto mt-10 grid max-w-5xl gap-8 sm:mt-14 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-6"
          variants={stagger(0.1, 0.1)}
          {...inViewProps}
        >
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <motion.article
                key={g.title}
                variants={fadeUp}
                className="group text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.08, rotate: -4 }}
                  transition={{ type: "spring", stiffness: 280, damping: 16 }}
                  className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-100 bg-white shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-brand-200/40"
                >
                  <Icon className="h-9 w-9 text-brand-600 transition-colors duration-300 group-hover:text-brand-700" strokeWidth={1.4} />
                </motion.div>
                <h3 className="mt-5 text-lg font-bold text-fg">{g.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.p
          className="mx-auto mt-10 max-w-xl text-center text-xs text-fg-subtle sm:mt-14"
          variants={fadeUp}
          {...inViewProps}
        >
          Built as a Progressive Web App — installable on any device, with
          offline-tolerant editing and instant sync via Supabase.
        </motion.p>
      </div>
    </section>
  );
}
