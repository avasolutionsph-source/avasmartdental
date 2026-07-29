import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { accessTier } from '@/lib/access';
import { useClinicBilling, useRefetchClinicBilling } from '@/features/billing/useClinicBilling';
import { PayInvoiceCard } from '@/features/billing/PayInvoiceCard';
import { Button } from '@/components/ui';

const GRACE_DAYS = 7;

/**
 * App-wide "redirect to payment" interstitial for a DEFINITE 'read_only'
 * access tier (subscription lapsed past the grace window).
 *
 * Patient-safe by design: `children` are always rendered underneath — this
 * component only ever adds a dismissible overlay on top, it never removes
 * routes or swaps them out. An explicit "Continue to view records" action
 * dismisses the overlay for the rest of the session so reads/exports stay
 * reachable; the QR to unlock is embedded right there via <PayInvoiceCard>.
 *
 * accessTier() fails open (unknown/unparseable paid_until -> 'full'), so
 * this only ever engages on a genuinely lapsed, past-grace account — never
 * on a loading/error/ambiguous billing state.
 */
export function ReadOnlyGate({ children }: { children: ReactNode }) {
  const { data: billing } = useClinicBilling();
  const refetch = useRefetchClinicBilling();
  const tier = accessTier(billing?.paid_until, GRACE_DAYS, billing?.subscription_status);
  const [dismissed, setDismissed] = useState(false);

  const showInterstitial = tier === 'read_only' && !dismissed;

  return (
    <>
      {children}
      {showInterstitial && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-gray-900/60 p-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Subscription lapsed"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-3 rounded-t-2xl bg-danger-50 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-100">
                <Lock className="h-5 w-5 text-danger-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-danger-600">Subscription lapsed</h2>
                <p className="text-xs text-danger-600/80">New entries are paused until payment</p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
                <p className="text-sm text-success-600">
                  Your patient records are safe. You can still <strong>view and export</strong>{' '}
                  everything — nothing has been deleted or hidden.
                </p>
              </div>

              <PayInvoiceCard onPaid={refetch} />

              <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
                <Button variant="outline" fullWidth onClick={() => setDismissed(true)}>
                  Continue to view records (read-only)
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Prefer to pay later?{' '}
                <Link
                  to="/settings?tab=billing"
                  className="font-medium text-primary-600 underline"
                  onClick={() => setDismissed(true)}
                >
                  Find this anytime in Settings → Billing
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
