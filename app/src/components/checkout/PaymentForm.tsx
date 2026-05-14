import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CreditCard, Lock } from "lucide-react";
import { Field, TextInput } from "./fields";

export type PaymentData = {
  cardholder: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

type Errors = Partial<Record<keyof PaymentData, string>>;

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(35|65)/.test(digits)) return "JCB";
  return "Card";
}

function luhnValid(digits: string): boolean {
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function validate(data: PaymentData): Errors {
  const errs: Errors = {};
  if (!data.cardholder.trim()) errs.cardholder = "Required";

  const cardDigits = data.cardNumber.replace(/\D/g, "");
  if (!cardDigits) errs.cardNumber = "Required";
  else if (!luhnValid(cardDigits)) errs.cardNumber = "Invalid card";

  const expDigits = data.expiry.replace(/\D/g, "");
  if (expDigits.length !== 4) errs.expiry = "MM/YY";
  else {
    const mm = parseInt(expDigits.slice(0, 2), 10);
    const yy = parseInt(expDigits.slice(2), 10);
    if (mm < 1 || mm > 12) errs.expiry = "Invalid month";
    else {
      const now = new Date();
      const year = 2000 + yy;
      const expDate = new Date(year, mm, 0, 23, 59, 59);
      if (expDate < now) errs.expiry = "Expired";
    }
  }

  if (!/^\d{3,4}$/.test(data.cvc)) errs.cvc = "3–4 digits";

  return errs;
}

type Props = {
  initial: PaymentData;
  onBack: () => void;
  onNext: (data: PaymentData) => void;
};

export function PaymentForm({ initial, onBack, onNext }: Props) {
  const [data, setData] = useState<PaymentData>(initial);
  const [errors, setErrors] = useState<Errors>({});

  const cardDigits = data.cardNumber.replace(/\D/g, "");
  const brand = cardDigits.length >= 2 ? detectBrand(cardDigits) : "";

  function update<K extends keyof PaymentData>(key: K, value: PaymentData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
          Payment method
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          We won't charge anything today — your card is held by NextPay and only
          billed when your trial ends.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-xs text-fg-muted">
        <Lock className="h-3.5 w-3.5 text-brand-600" />
        <span className="font-medium text-fg-2">
          Secured by NextPay
        </span>
        <span aria-hidden>·</span>
        <span>Visa</span>
        <span aria-hidden>·</span>
        <span>Mastercard</span>
        <span aria-hidden>·</span>
        <span>JCB</span>
        <span aria-hidden>·</span>
        <span>Amex</span>
      </div>

      <Field label="Name on card" error={errors.cardholder}>
        <TextInput
          type="text"
          autoComplete="cc-name"
          placeholder="As printed on the card"
          value={data.cardholder}
          onChange={(e) => update("cardholder", e.target.value)}
          invalid={!!errors.cardholder}
        />
      </Field>

      <Field
        label="Card number"
        hint={brand && !errors.cardNumber ? brand : undefined}
        error={errors.cardNumber}
      >
        <div className="relative">
          <TextInput
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            value={data.cardNumber}
            onChange={(e) => update("cardNumber", formatCardNumber(e.target.value))}
            invalid={!!errors.cardNumber}
            className="pr-11"
          />
          <CreditCard className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-faint" />
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Expiry (MM/YY)" error={errors.expiry}>
          <TextInput
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={data.expiry}
            onChange={(e) => update("expiry", formatExpiry(e.target.value))}
            invalid={!!errors.expiry}
          />
        </Field>

        <Field label="CVC" hint="Back of card" error={errors.cvc}>
          <TextInput
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={data.cvc}
            onChange={(e) =>
              update("cvc", e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            invalid={!!errors.cvc}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-fg-2 transition-colors hover:border-line-2 hover:bg-surface-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          className="shimmer-sweep inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-700 hover:shadow-glow-brand"
        >
          Review order
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
