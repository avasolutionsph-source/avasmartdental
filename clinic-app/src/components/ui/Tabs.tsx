import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────
function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-gray-200 -mx-3 sm:mx-0', className)}>
      <nav className="-mb-px flex gap-1 sm:gap-6 overflow-x-auto overscroll-x-contain px-3 sm:px-0 scrollbar-none" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap border-b-2 px-2 sm:px-1 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors shrink-0',
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 active:text-gray-900',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium',
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { Tabs };
export type { TabsProps, Tab };
