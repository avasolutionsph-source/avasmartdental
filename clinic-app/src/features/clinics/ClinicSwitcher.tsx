import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useActiveClinic } from './activeClinic';
import { useClinics } from './useClinics';
import { AddClinicModal } from './AddClinicModal';

/**
 * Nav dropdown for the account's clinics (branches). Always renders — even
 * for a 1-clinic account — because "Add clinic" lives inside it and that's
 * the only path from tier_1 into tier_2_6.
 */
export function ClinicSwitcher() {
  const { data: clinics = [], isLoading } = useClinics();
  const activeClinicId = useActiveClinic((s) => s.activeClinicId);
  const setActiveClinic = useActiveClinic((s) => s.setActiveClinic);
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const active = clinics.find((c) => c.id === activeClinicId);

  function selectClinic(id: string) {
    setOpen(false);
    if (id === activeClinicId) return;
    setActiveClinic(id);
    queryClient.invalidateQueries();
  }

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[180px] items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-100"
      >
        <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="truncate">
          {active?.name ?? (isLoading ? 'Loading…' : 'Select clinic')}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
          <div className="mb-1 border-b border-gray-100 px-3 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Clinics</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {clinics.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No clinics yet</p>
            ) : (
              clinics.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClinic(c.id)}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50',
                    c.id === activeClinicId
                      ? 'bg-primary-50/60 font-medium text-primary-700'
                      : 'text-gray-700',
                  )}
                >
                  <span className="truncate">{c.name}</span>
                </button>
              ))
            )}
          </div>

          <div className="mt-1 border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAddOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
            >
              <Plus className="h-4 w-4" />
              Add clinic
            </button>
          </div>
        </div>
      )}

      <AddClinicModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
