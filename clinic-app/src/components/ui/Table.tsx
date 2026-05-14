import { forwardRef } from 'react';
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ─── Table ────────────────────────────────────────────────────────
const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 overscroll-x-contain">
      <table
        ref={ref}
        className={cn('w-full text-sm min-w-0', className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = 'Table';

// ─── Thead ────────────────────────────────────────────────────────
const Thead = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b border-gray-200 bg-gray-50/80', className)}
    {...props}
  />
));
Thead.displayName = 'Thead';

// ─── Tbody ────────────────────────────────────────────────────────
const Tbody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&>tr:last-child]:border-0', className)} {...props} />
));
Tbody.displayName = 'Tbody';

// ─── Tr ───────────────────────────────────────────────────────────
const Tr = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-gray-50/50',
        className,
      )}
      {...props}
    />
  ),
);
Tr.displayName = 'Tr';

// ─── Th ───────────────────────────────────────────────────────────
const Th = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap',
        className,
      )}
      {...props}
    />
  ),
);
Th.displayName = 'Th';

// ─── Td ───────────────────────────────────────────────────────────
const Td = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'border-b border-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700',
        className,
      )}
      {...props}
    />
  ),
);
Td.displayName = 'Td';

export { Table, Thead, Tbody, Tr, Th, Td };
