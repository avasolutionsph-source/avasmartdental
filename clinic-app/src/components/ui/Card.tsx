import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
interface CardProps {
  title?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

// ─── Component ────────────────────────────────────────────────────
function Card({ title, headerAction, children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden',
        className,
      )}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          {title && (
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h3>
          )}
          {headerAction && <div className="shrink-0 ml-2">{headerAction}</div>}
        </div>
      )}

      <div className={cn(padding && 'p-4 sm:p-6')}>{children}</div>
    </div>
  );
}

export { Card };
export type { CardProps };
