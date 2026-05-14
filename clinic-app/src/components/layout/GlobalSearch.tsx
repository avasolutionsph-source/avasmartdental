import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, PhilippinePeso, CalendarDays, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { globalSearch } from '@/lib/api';
import type { SearchResults, SearchResultItem } from '@/lib/api';

// ─── Recent Searches (mock) ──────────────────────────────────────
const recentSearches = [
  { label: 'Juan Dela Cruz', url: '/patients/1' },
  { label: 'INV-100234', url: '/billing' },
  { label: 'Root Canal', url: '/appointments' },
];

// ─── Section Icon Map ─────────────────────────────────────────────
const sectionConfig = {
  patients: { label: 'Patients', icon: Users, color: 'text-primary-500' },
  invoices: { label: 'Invoices', icon: PhilippinePeso, color: 'text-accent-500' },
  appointments: { label: 'Appointments', icon: CalendarDays, color: 'text-success-500' },
} as const;

// ─── GlobalSearch Component ───────────────────────────────────────
export function GlobalSearch() {
  const open = useAppStore((s) => s.searchOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const data = await globalSearch(query);
      setResults(data);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, setSearchOpen]);

  const handleNavigate = useCallback(
    (url: string) => {
      setSearchOpen(false);
      navigate(url);
    },
    [setSearchOpen, navigate],
  );

  const totalResults = results
    ? results.patients.length + results.invoices.length + results.appointments.length
    : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-2 sm:pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-2 sm:mx-4 bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients, invoices..."
            className="flex-1 text-base text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-h-[36px]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setSearchOpen(false)}
            className="sm:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <span className="text-xs font-medium">Cancel</span>
          </button>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              Searching...
            </div>
          )}

          {/* No query - show recent searches */}
          {!query.trim() && !loading && (
            <div className="py-3">
              <div className="px-5 py-2 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Recent Searches
              </div>
              {recentSearches.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigate(item.url)}
                  className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Search className="h-4 w-4 text-gray-300" />
                  <span>{item.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {query.trim() && !loading && results && totalResults > 0 && (
            <div className="py-2">
              {(Object.keys(sectionConfig) as Array<keyof typeof sectionConfig>).map(
                (key) => {
                  const items = results[key];
                  if (items.length === 0) return null;
                  const config = sectionConfig[key];
                  const SectionIcon = config.icon;

                  return (
                    <div key={key}>
                      <div className="px-5 py-2 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <SectionIcon className={cn('h-3.5 w-3.5', config.color)} />
                        {config.label}
                      </div>
                      {items.map((item: SearchResultItem) => (
                        <button
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleNavigate(item.url)}
                          className="flex items-center gap-3 w-full px-5 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  );
                },
              )}
            </div>
          )}

          {/* No results */}
          {query.trim() && !loading && results && totalResults === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-500">
                No results found for "<span className="font-medium">{query}</span>"
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          )}
        </div>

        {/* Footer - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium">
              ↑↓
            </kbd>{' '}
            Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium">
              Enter
            </kbd>{' '}
            Open
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium">
              Esc
            </kbd>{' '}
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
