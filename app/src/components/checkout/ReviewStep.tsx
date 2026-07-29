import { useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Lock, Pencil } from "lucide-react";
import type { Plan } from "../../lib/plans";
import { formatPeso } from "../../lib/plans";
import type { AccountData } from "./AccountForm";

type Props = {
  plan: Plan;
  account: AccountData;
  onBack: () => void;
  onEditAccount: () => void;
  onConfirm: () => Promise<void> | void;
};

export function ReviewStep({
  plan,
  account,
  onBack,
  onEditAccount,
  onConfirm,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  // CheckoutPage redirects away before rendering this for a request-priced
  // (tier_6plus) plan, so `price` is always a real number here — the `?? 0`
  // is just to satisfy the type without an assertion.
  const price = plan.price ?? 0;

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
          Review &amp; confirm
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Double-check everything below. Your trial starts the moment you
          confirm.
        </p>
      </div>

      <ReviewRow title="Clinic details" onEdit={onEditAccount}>
        <p className="font-medium text-fg">{account.clinicName}</p>
        <p className="text-sm text-fg-muted">{account.contactName}</p>
        <p className="text-sm text-fg-muted">{account.email}</p>
        <p className="text-sm text-fg-muted">{account.phone}</p>
      </ReviewRow>

      <ReviewRow title="Plan">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="font-medium text-fg">{plan.name}</p>
            <p className="text-sm text-fg-muted">18-day free trial</p>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums text-fg">
              {formatPeso(price)}
              <span className="text-sm font-normal text-fg-subtle">
                {plan.period}
              </span>
            </p>
            <p className="text-xs text-brand-700">₱0.00 due today</p>
          </div>
        </div>
      </ReviewRow>

      <p className="text-sm text-fg-muted">
        Your 18-day trial starts now — no payment needed. We'll show you a
        GCash/Maya QR code before it ends.
      </p>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-fg-2 transition-colors hover:border-line-2 hover:bg-surface-2 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="shimmer-sweep inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-700 hover:shadow-glow-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-600 disabled:hover:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Start free trial
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ReviewRow({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
