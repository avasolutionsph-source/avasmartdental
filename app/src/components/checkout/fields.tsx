import { type InputHTMLAttributes, type ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-fg-2">{label}</span>
        {hint && !error && (
          <span className="text-xs text-fg-subtle">{hint}</span>
        )}
        {error && (
          <span className="text-xs font-medium text-red-600">{error}</span>
        )}
      </span>
      {children}
    </label>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function TextInput({ invalid, className = "", ...rest }: TextInputProps) {
  return (
    <input
      {...rest}
      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-fg shadow-sm outline-none transition-colors placeholder:text-fg-faint focus:ring-2 focus:ring-brand-200 ${
        invalid
          ? "border-red-300 focus:border-red-500"
          : "border-line focus:border-brand-400"
      } ${className}`}
    />
  );
}
