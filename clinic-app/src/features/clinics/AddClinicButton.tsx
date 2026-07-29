import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui';
import { useActiveClinic } from './activeClinic';

/**
 * Adds a branch/clinic under the caller's account via the `add-clinic` edge
 * function — same auth pattern as PayInvoiceCard (Bearer session token +
 * anon apikey). The function re-derives the caller's account server-side
 * from the JWT, so a client can never insert a clinic under an account it
 * doesn't own.
 *
 * On success: switch to the new clinic and invalidate every query so the
 * whole app refetches under it (clinic list included).
 */
export function AddClinicButton({ onDone }: { onDone?: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const setActiveClinic = useActiveClinic((s) => s.setActiveClinic);
  const toast = useToast();

  async function handleAdd() {
    const name = window.prompt('Name this branch (e.g. "Makati Branch")');
    if (!name || !name.trim()) return;

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const base = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${base}/functions/v1/add-clinic`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(`request_failed_${res.status}`);
      const { clinicId, accountTier } = (await res.json()) as {
        clinicId: string;
        accountTier: string | null;
      };

      // Switch first, then invalidate everything — so the clinic-list
      // refetch and every other tenant query that fires as a result already
      // carries the new x-clinic-id header.
      setActiveClinic(clinicId);
      await queryClient.invalidateQueries();

      toast.success(`"${name.trim()}" added.`);
      if (accountTier === 'tier_6plus') {
        toast.info('At 7+ clinics, pricing moves to "contact us" — we\'ll follow up about your plan.');
      }
      onDone?.();
    } catch {
      toast.error("Couldn't add clinic. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={submitting}
      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
      {submitting ? 'Adding…' : 'Add clinic'}
    </button>
  );
}
