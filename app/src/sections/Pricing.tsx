import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { plans } from "../lib/plans";

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3"];

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-12 sm:py-20 lg:py-24">
      <div aria-hidden className="brand-blob b2 left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-4">
          {plans.map((t, i) => {
            const btnClass = `shimmer-sweep relative z-10 mt-9 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-all duration-300 ${
              t.featured
                ? "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-[0_8px_24px_-6px_rgba(124,58,237,0.45)]"
                : "bg-fg text-white hover:bg-fg-2 hover:shadow-md"
            }`;
            return (
              <article
                key={t.id}
                className={`fade-in ${delays[i]} group spotlight card-hover relative flex flex-col rounded-3xl p-6 sm:p-7 lg:p-8 ${
                  t.featured
                    ? "border-2 border-brand-600 bg-gradient-to-b from-brand-50 to-white text-fg shadow-glow-brand hover:-translate-y-2"
                    : "border border-line bg-white text-fg hover:border-brand-300 hover:shadow-clinical"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-600/30">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                )}
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold tracking-tight">{t.name}</h3>
                  <p className="mt-1 text-sm text-fg-muted">{t.desc}</p>
                </div>

                <div className="relative z-10 mt-7">
                  {t.price === null ? (
                    <span className="text-4xl font-bold tabular-nums">{t.priceLabel}</span>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-brand-600">₱</span>
                        <span className="text-5xl font-bold tabular-nums">{t.priceLabel}</span>
                        <span className="text-sm text-fg-subtle">{t.period}</span>
                      </div>
                      {t.annualPriceLabel && (
                        <p className="mt-1.5 text-sm text-fg-subtle">
                          or <span className="font-semibold text-fg-2">₱{t.annualPriceLabel}</span> / year
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="relative z-10 mt-7 space-y-3 text-sm">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform duration-300 group-hover:scale-110">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-fg-2">{b}</span>
                    </li>
                  ))}
                </ul>

                {t.ctaKind === "checkout" ? (
                  <Link to={`/checkout?plan=${t.id}`} className={btnClass}>
                    {t.cta}
                  </Link>
                ) : (
                  <a
                    href={`mailto:hello@avasmartdental.ph?subject=${encodeURIComponent(
                      `${t.name} plan — multi-branch enquiry`,
                    )}`}
                    className={btnClass}
                  >
                    {t.cta}
                  </a>
                )}
              </article>
            );
          })}
        </div>

        <p className="fade-in fade-in-d4 mt-8 text-center text-sm text-fg-subtle">
          18-day free trial on every plan. No charge today — your card is only
          billed after the trial. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
