import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Active-clinic store ────────────────────────────────────────────
// Holds which clinic (branch) of the signed-in account is "active" — its id
// is sent as the `x-clinic-id` header on every Supabase request (see
// lib/supabase.ts) so Postgres's current_clinic_id() / RLS knows which
// clinic's rows to return.
//
// Kept standalone (zustand + its middleware only) so lib/supabase.ts can
// import this store without creating an import cycle: supabase.ts needs
// the store to build its custom fetch, and nothing here needs the supabase
// client back.
type ActiveClinicState = {
  activeClinicId: string | null;
  setActiveClinic: (id: string | null) => void;
};

export const useActiveClinic = create<ActiveClinicState>()(
  persist(
    (set) => ({
      activeClinicId: null,
      setActiveClinic: (id) => set({ activeClinicId: id }),
    }),
    {
      name: 'ava.activeClinicId',
      partialize: (state) => ({ activeClinicId: state.activeClinicId }),
    },
  ),
);

/** Synchronous read of the current active clinic id (outside React). */
export function getActiveClinicId(): string | null {
  return useActiveClinic.getState().activeClinicId;
}
