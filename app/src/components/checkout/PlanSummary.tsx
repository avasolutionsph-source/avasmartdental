import { Link } from "react-router-dom";
import { CalendarClock, ShieldCheck } from "lucide-react";
import type { Plan } from "../../lib/plans";
import { formatPeso } from "../../lib/plans";

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PlanSummary({ plan }: { plan: Plan }) {
  const trialEnd = addDays(new Date(), 18);
  // CheckoutPage redirects away before rendering this for a request-priced
  // (tier_6plus) plan, so `price` is always a real number here — the `?? 0`
  // is just to satisfy the type without an assertion.
  const price = plan.price ?? 0;

  return (
    <aside className="rounded-3xl border border-line bg-white p-6 shadow-clinical sm:p-7 lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">
          Order summary
        </h2>
        <Link
          to="/pricing"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Change plan
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              {plan.name} plan
            </p>
            <p className="mt-1 text-sm text-fg-muted">{plan.desc}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-fg">
              {formatPeso(price)}
            </p>
            <p className="text-xs text-fg-subtle">{plan.period}</p>
          </div>
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-fg-muted">Subtotal</dt>
          <dd className="tabular-nums text-fg-2">{formatPeso(price)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-fg-muted">18-day free trial</dt>
          <dd className="tabular-nums font-medium text-brand-700">
            −{formatPeso(price)}
          </dd>
        </div>
        <div className="border-t border-line pt-3" />
        <div className="flex items-baseline justify-between">
          <dt className="text-base font-semibold text-fg">Due today</dt>
          <dd className="text-2xl font-bold tabular-nums text-fg">₱0.00</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3 rounded-2xl bg-surface-2 p-4 text-xs text-fg-muted">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            First charge of{" "}
            <span className="font-semibold text-fg-2">
              {formatPeso(price)}
            </span>{" "}
            on{" "}
            <span className="font-semibold text-fg-2">
              {formatDate(trialEnd)}
            </span>
            . Cancel anytime before then and pay nothing.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            Card details are tokenized through NextPay — Ava never stores raw
            card numbers.
          </p>
        </div>
      </div>
    </aside>
  );
}
