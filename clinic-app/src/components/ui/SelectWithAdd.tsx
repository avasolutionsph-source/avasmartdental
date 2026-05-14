import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectWithAddProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  addLabel?: string;
  onAdd?: () => void;
  disabled?: boolean;
}

export function SelectWithAdd({
  label,
  error,
  options,
  placeholder = 'Select...',
  value,
  onChange,
  addLabel = '+ Add New',
  onAdd,
  disabled,
}: SelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen(!open); setSearch(''); }}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 sm:py-2 text-left text-base sm:text-sm min-h-[44px]',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error ? 'border-danger-500' : open ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300',
          )}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Search */}
            {options.length > 5 && (
              <div className="border-b border-gray-100 p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none"
                />
              </div>
            )}

            {/* Options */}
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">No results</div>
              )}
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50',
                    opt.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Add button */}
            {onAdd && (
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSearch('');
                    onAdd();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                >
                  <Plus className="h-4 w-4" />
                  {addLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-danger-500">{error}</p>
      )}
    </div>
  );
}
