import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Modal, Input, Button, useToast } from '@/components/ui';
import { useActiveClinic } from './activeClinic';

/**
 * Styled "Add Clinic" modal — same design language as the app's other add
 * dialogs (e.g. Add New Dentist), replacing the old native window.prompt().
 *
 * The add-clinic BACKEND is unchanged: same edge-function call (Bearer session
 * token + anon apikey). The function re-derives the caller's account from the
 * JWT server-side, so a client can never insert a clinic under an account it
 * doesn't own. On success: switch to the new clinic and invalidate every query
 * so the whole app refetches under the new x-clinic-id.
 */
export function AddClinicModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const setActiveClinic = useActiveClinic((s) => s.setActiveClinic);
  const toast = useToast();

  function close() {
    if (submitting) return;
    setName('');
    onClose();
  }

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;

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
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`request_failed_${res.status}`);
      const { clinicId, accountTier } = (await res.json()) as {
        clinicId: string;
        accountTier: string | null;
      };

      // Switch first, then invalidate everything — so the clinic-list refetch
      // and every other tenant query that fires already carries the new
      // x-clinic-id header.
      setActiveClinic(clinicId);
      await queryClient.invalidateQueries();

      toast.success(`"${trimmed}" added.`);
      if (accountTier === 'tier_6plus') {
        toast.info('At 7+ clinics, pricing moves to "contact us" — we\'ll follow up about your plan.');
      }
      setName('');
      onClose();
    } catch {
      toast.error("Couldn't add clinic. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Add Clinic"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={submitting || !name.trim()}>
            {submitting ? 'Adding…' : 'Add Clinic'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Input
          label="Clinic / branch name"
          placeholder="e.g. Makati Branch"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim() && !submitting) handleAdd();
          }}
        />
        <p className="text-xs text-gray-500">
          A new branch under your account. Adding branches may change your plan tier.
        </p>
      </div>
    </Modal>
  );
}
