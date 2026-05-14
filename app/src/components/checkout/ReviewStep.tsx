import { useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Lock, Pencil } from "lucide-react";
import type { Plan } from "../../lib/plans";
import { formatPeso } from "../../lib/plans";
import type { AccountData } from "./AccountForm";
import type { PaymentData } from "./PaymentForm";

type Props = {
  plan: Plan;
  account: AccountData;
  payment: PaymentData;
  onBack: () => void;
  onEditAccount: () => void;
  onEditPayment: () => void;
  onConfirm: () => Promise<void> | void;
};

function maskCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 4) return "•••• ••••";
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

export function ReviewStep({
  plan,
  account,
  payment,
  onBack,
  onEditAccount,
  onEditPayment,
  onConfirm,
}: Props) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!agreed || submitting) return;
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

      <ReviewRow title="Payment method" onEdit={onEditPayment}>
        <p className="font-medium tabular-nums text-fg">
          {maskCard(payment.cardNumber)}
        </p>
        <p className="text-sm text-fg-muted">
          {payment.cardholder} · exp {payment.expiry}
        </p>
      </ReviewRow>

      <ReviewRow title="Plan">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="font-medium text-fg">{plan.name}</p>
            <p className="text-sm text-fg-muted">14-day free trial</p>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums text-fg">
              {formatPeso(plan.price)}
              <span className="text-sm font-normal text-fg-subtle">
                {plan.period}
              </span>
            </p>
            <p className="text-xs text-brand-700">₱0.00 due today</p>
          </div>
        </div>
      </ReviewRow>

      <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm text-fg-2">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
        />
        <span>
          I authorize NextPay to charge my card{" "}
          <span className="font-semibold">{formatPeso(plan.price)}</span>{" "}
          {plan.period} after the 14-day free trial. I can cancel anytime from
          my account settings to avoid the charge.
        </span>
      </label>

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
          disabled={!agreed || submitting}
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
