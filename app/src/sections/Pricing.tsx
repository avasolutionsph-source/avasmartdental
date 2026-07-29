import { useState } from "react";
import { Check, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { plans } from "../lib/plans";

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3"];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="relative overflow-hidden py-12 sm:py-20 lg:py-24">
      <div aria-hidden className="brand-blob b2 left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Monthly / Yearly toggle — DISPLAY ONLY. The actual billing cadence is
            still chosen on the pay screen; this doesn't touch billing logic. */}
        <div className="fade-in mb-8 flex justify-center sm:mb-10">
          <div className="inline-flex items-center rounded-full border border-line bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setYearly(false)}
              aria-pressed={!yearly}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                !yearly ? "bg-fg text-white" : "text-fg-muted hover:text-fg"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              aria-pressed={yearly}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                yearly ? "bg-fg text-white" : "text-fg-muted hover:text-fg"
              }`}
            >
              Yearly
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  yearly ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700"
                }`}
              >
                Save ~2 months
              </span>
            </button>
          </div>
        </div>

        {/* pt-3 leaves room for the featured card's badge that pokes above it. */}
        <div className="grid gap-5 pt-3 lg:grid-cols-3 lg:gap-4">
          {plans.map((t, i) => {
            const btnClass = `shimmer-sweep relative z-10 mt-9 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-all duration-300 ${
              t.featured
                ? "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-[0_8px_24px_-6px_rgba(124,58,237,0.45)]"
                : "bg-fg text-white hover:bg-fg-2 hover:shadow-md"
            }`;
            return (
              // Wrapper carries the badge so the card's `overflow:hidden`
              // (spotlight effect) can't clip it.
              <div key={t.id} className={`fade-in ${delays[i]} relative`}>
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-600/30">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                )}
                <article
                  className={`group spotlight card-hover relative flex h-full flex-col rounded-3xl p-6 sm:p-7 lg:p-8 ${
                    t.featured
                      ? "border-2 border-brand-600 bg-gradient-to-b from-brand-50 to-white text-fg shadow-glow-brand hover:-translate-y-2"
                      : "border border-line bg-white text-fg hover:border-brand-300 hover:shadow-clinical"
                  }`}
                >
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold tracking-tight">{t.name}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{t.desc}</p>
                  </div>

                  <div className="relative z-10 mt-7">
                    {t.price === null ? (
                      <span className="text-4xl font-bold tabular-nums">{t.priceLabel}</span>
                    ) : yearly && t.annualPriceLabel ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-brand-600">₱</span>
                          <span className="text-5xl font-bold tabular-nums">{t.annualPriceLabel}</span>
                          <span className="text-sm text-fg-subtle">/ year</span>
                        </div>
                        <p className="mt-1.5 text-sm text-fg-subtle">
                          or <span className="font-semibold text-fg-2">₱{t.priceLabel}</span> / month
                        </p>
                      </>
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

                  {t.comingSoon ? (
                    <span
                      aria-disabled="true"
                      className="relative z-10 mt-9 inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-line bg-surface-2 px-5 py-3 text-sm font-bold text-fg-subtle"
                    >
                      <Clock className="h-4 w-4" />
                      Coming soon
                    </span>
                  ) : t.ctaKind === "checkout" ? (
                    <Link to={`/checkout?plan=${t.id}`} className={btnClass}>
                      {t.cta}
                    </Link>
                  ) : (
                    <a
                      href={`mailto:avasolutionsph@gmail.com?subject=${encodeURIComponent(
                        `${t.name} plan — multi-branch enquiry`,
                      )}`}
                      className={btnClass}
                    >
                      {t.cta}
                    </a>
                  )}
                </article>
              </div>
            );
          })}
        </div>

        <p className="fade-in fade-in-d4 mt-8 text-center text-sm text-fg-subtle">
          18-day free trial on every plan. No charge today — pay by GCash/Maya
          QR after your trial. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
