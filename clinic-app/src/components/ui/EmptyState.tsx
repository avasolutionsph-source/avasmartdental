import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 sm:py-16 px-4 text-center', className)}>
      <div className="mb-3 sm:mb-4 rounded-full bg-gray-100 p-3 sm:p-4">
        <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs sm:text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4 sm:mt-6 w-full sm:w-auto">{action}</div>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
