import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Field, TextInput } from "./fields";

export type AccountData = {
  clinicName: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
};

type Errors = Partial<Record<keyof AccountData, string>>;

function validate(data: AccountData): Errors {
  const errs: Errors = {};
  if (!data.clinicName.trim()) errs.clinicName = "Required";
  if (!data.contactName.trim()) errs.contactName = "Required";
  if (!data.email.trim()) errs.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errs.email = "Invalid email";
  const phoneDigits = data.phone.replace(/\D/g, "");
  if (!phoneDigits) errs.phone = "Required";
  else if (phoneDigits.length < 10) errs.phone = "Too short";
  if (!data.password) errs.password = "Required";
  else if (data.password.length < 8) errs.password = "At least 8 characters";
  return errs;
}

type Props = {
  initial: AccountData;
  onNext: (data: AccountData) => void;
};

export function AccountForm({ initial, onNext }: Props) {
  const [data, setData] = useState<AccountData>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);

  function update<K extends keyof AccountData>(key: K, value: AccountData[K]) {
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
          Clinic details
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          We'll use this to set up your workspace and send your receipts.
        </p>
      </div>

      <Field label="Clinic name" error={errors.clinicName}>
        <TextInput
          type="text"
          autoComplete="organization"
          placeholder="e.g. Bright Smile Dental"
          value={data.clinicName}
          onChange={(e) => update("clinicName", e.target.value)}
          invalid={!!errors.clinicName}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact name" error={errors.contactName}>
          <TextInput
            type="text"
            autoComplete="name"
            placeholder="Dr. Maria Santos"
            value={data.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            invalid={!!errors.contactName}
          />
        </Field>

        <Field label="Mobile" hint="For account recovery" error={errors.phone}>
          <TextInput
            type="tel"
            autoComplete="tel"
            placeholder="09xx xxx xxxx"
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            invalid={!!errors.phone}
          />
        </Field>
      </div>

      <Field
        label="Work email"
        hint="Login + receipts go here"
        error={errors.email}
      >
        <TextInput
          type="email"
          autoComplete="email"
          placeholder="you@clinic.com"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          invalid={!!errors.email}
        />
      </Field>

      <Field
        label="Password"
        hint="Use this to log into the app — min 8 chars"
        error={errors.password}
      >
        <div className="relative">
          <TextInput
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Pick a strong password"
            value={data.password}
            onChange={(e) => update("password", e.target.value)}
            invalid={!!errors.password}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg-2"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </Field>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="shimmer-sweep inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-700 hover:shadow-glow-brand"
        >
          Continue
          <ArrowRight className="h-4 w-4 arrow-nudge" />
        </button>
      </div>
    </form>
  );
}
