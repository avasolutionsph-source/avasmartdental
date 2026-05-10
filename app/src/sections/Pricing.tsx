import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, stagger, inViewProps } from "../lib/motion";

const tiers = [
  {
    name: "Solo",
    desc: "For single-dentist clinics.",
    price: "1,499",
    period: "/ month",
    cta: "Start free trial",
    featured: false,
    bullets: [
      "1 dentist · 1 branch",
      "Up to 3,000 patient records",
      "Full feature set — every module",
      "Cloud sync via Supabase",
      "Email support",
    ],
  },
  {
    name: "Clinic",
    desc: "Most chosen — for growing clinics.",
    price: "2,999",
    period: "/ month",
    cta: "Start free trial",
    featured: true,
    bullets: [
      "Up to 5 dentists · 1 branch",
      "Unlimited patient records",
      "Full feature set + advanced reports",
      "Priority chat support",
      "Free migration of existing patient data",
    ],
  },
  {
    name: "Multi-branch",
    desc: "For chains and multi-location clinics.",
    price: "4,999",
    period: "/ month",
    cta: "Talk to us",
    featured: false,
    bullets: [
      "Unlimited dentists · up to 5 branches",
      "Per-branch reporting + roll-up",
      "Custom roles + audit log",
      "Dedicated account manager",
      "Onboarding + staff training session",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-12 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          className="grid gap-5 lg:grid-cols-3 lg:gap-4"
          variants={stagger(0, 0.12)}
          {...inViewProps}
        >
          {tiers.map((t) => (
            <motion.article
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className={`group relative flex flex-col rounded-3xl p-6 transition-shadow duration-300 sm:p-7 lg:p-8 ${
                t.featured
                  ? "border-2 border-brand-600 bg-gradient-to-b from-brand-50 to-white text-fg shadow-clinical hover:shadow-[0_24px_60px_-20px_rgba(124,58,237,0.45)]"
                  : "border border-line bg-white text-fg hover:border-brand-300 hover:shadow-clinical"
              }`}
            >
              {t.featured && (
                <motion.span
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-600/30"
                >
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </motion.span>
              )}
              <div>
                <h3 className="text-2xl font-bold tracking-tight">{t.name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{t.desc}</p>
              </div>

              <div className="mt-7 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-brand-600">₱</span>
                <span className="text-5xl font-bold tabular-nums">{t.price}</span>
                <span className="text-sm text-fg-subtle">{t.period}</span>
              </div>

              <ul className="mt-7 space-y-3 text-sm">
                {t.bullets.map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.25 + i * 0.05 }}
                    className="flex items-start gap-2.5"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform duration-300 group-hover:scale-110">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-fg-2">{b}</span>
                  </motion.li>
                ))}
              </ul>

              <a
                href="mailto:hello@avasmartdental.ph?subject=Start%20free%20trial"
                className={`group/btn mt-9 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-all duration-300 ${
                  t.featured
                    ? "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-[0_8px_24px_-6px_rgba(124,58,237,0.45)]"
                    : "bg-fg text-white hover:bg-fg-2 hover:shadow-md"
                }`}
              >
                {t.cta}
              </a>
            </motion.article>
          ))}
        </motion.div>

        <motion.p
          variants={fadeUp}
          {...inViewProps}
          className="mt-8 text-center text-sm text-fg-subtle"
        >
          14-day free trial on every plan. No credit card. Annual billing saves
          2 months — switch anytime.
        </motion.p>
      </div>
    </section>
  );
}
