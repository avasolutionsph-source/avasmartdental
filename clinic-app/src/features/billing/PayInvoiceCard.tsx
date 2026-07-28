import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';

type Invoice = {
  invoiceId: string;
  qrImageDataUrl: string | null;
  expiresAt: string;
  amountCentavos: number;
};

/**
 * Settings → Billing "pay now" card. Generates a QRPh payment intent via
 * the create-invoice edge function, renders the returned QR code, and
 * polls invoice-status until it flips to 'paid'.
 *
 * NextPay reports the underlying payment intent as 'pending' for ~15s
 * after the customer actually pays, so the poll keeps going — it does
 * not stop on the first non-paid response.
 */
export function PayInvoiceCard({ onPaid }: { onPaid: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'waiting' | 'paid' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<number | null>(null);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const base = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${base}/functions/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`request_failed_${res.status}`);
    return res.json();
  }, []);

  async function generate() {
    setState('loading');
    setError(null);
    try {
      const inv = await call('create-invoice', { method: 'POST' });
      if (inv.alreadyPaid) {
        setState('paid');
        onPaid();
        return;
      }
      setInvoice(inv);
      setState('waiting');
    } catch {
      setError("Couldn't generate a QR code. Please try again.");
      setState('error');
    }
  }

  // Poll until succeeded — NextPay reports pending for ~15s after payment.
  useEffect(() => {
    if (state !== 'waiting' || !invoice) return;
    const id = window.setInterval(async () => {
      try {
        const r = await call(`invoice-status?invoice_id=${invoice.invoiceId}`);
        if (r.status === 'paid') {
          window.clearInterval(id);
          setState('paid');
          onPaid();
        }
      } catch {
        /* transient — keep polling */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [state, invoice, call, onPaid]);

  // Expiry countdown
  useEffect(() => {
    if (!invoice) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((Date.parse(invoice.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && state === 'waiting') setState('idle');
    };
    tick();
    timer.current = window.setInterval(tick, 1000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [invoice, state]);

  if (state === 'paid') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
        <p className="text-sm font-medium text-success-600">Payment received — thank you!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
      {state === 'waiting' && invoice?.qrImageDataUrl ? (
        <>
          <img
            src={invoice.qrImageDataUrl}
            alt="QR code for payment"
            className="mx-auto h-56 w-56 rounded-lg border border-gray-100"
          />
          <p className="mt-3 text-center text-sm text-gray-600">
            Scan with GCash, Maya, or any QRPh bank app to pay{' '}
            <strong className="text-gray-900">
              {(invoice.amountCentavos / 100).toLocaleString('en-PH', {
                style: 'currency',
                currency: 'PHP',
              })}
            </strong>
            .
          </p>
          <p className="mt-1 text-center text-xs text-gray-400">
            Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}{' '}
            &middot; keep this page open, confirmation takes a few seconds.
          </p>
        </>
      ) : (
        <Button
          onClick={generate}
          loading={state === 'loading'}
          fullWidth
        >
          {state === 'loading' ? 'Generating QR…' : 'Show payment QR code'}
        </Button>
      )}
    </div>
  );
}
