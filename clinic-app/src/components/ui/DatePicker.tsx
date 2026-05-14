import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
}

// ─── Component ────────────────────────────────────────────────────
function DatePicker({ label, error, value, onChange, min, max, className, id, ...rest }: DatePickerProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <input
        type="date"
        id={inputId}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        min={min}
        max={max}
        className={cn(
          'block w-full rounded-lg border bg-white px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 min-h-[44px]',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
          error
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
            : 'border-gray-300',
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />

      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
}

export { DatePicker };
export type { DatePickerProps };
