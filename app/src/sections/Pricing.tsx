import { Check, Sparkles } from "lucide-react";

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
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-4">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={`reveal relative flex flex-col rounded-3xl p-6 sm:p-7 lg:p-8 ${
                t.featured
                  ? "border-2 border-brand-600 bg-gradient-to-b from-brand-50 to-white text-fg shadow-clinical"
                  : "border border-line bg-white text-fg"
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </span>
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
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-fg-2">{b}</span>
                  </li>
                ))}
              </ul>

              <a
                href="mailto:hello@avasmartdental.ph?subject=Start%20free%20trial"
                className={`mt-9 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition ${
                  t.featured
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "bg-fg text-white hover:bg-fg-2"
                }`}
              >
                {t.cta}
              </a>
            </article>
          ))}
        </div>

        <p className="reveal mt-8 text-center text-sm text-fg-subtle">
          14-day free trial on every plan. No credit card. Annual billing saves
          2 months — switch anytime.
        </p>
      </div>
    </section>
  );
}
