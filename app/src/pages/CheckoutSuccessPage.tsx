import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Download, Mail } from "lucide-react";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { useSpotlight } from "../lib/useSpotlight";
import { getPlan, type PlanId } from "../lib/plans";

type LocationState = {
  plan?: PlanId;
  email?: string;
  clinicName?: string;
  simulated?: boolean;
};

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CheckoutSuccessPage() {
  useSpotlight();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: LocationState | null };

  useEffect(() => {
    if (!state?.email) {
      navigate("/pricing", { replace: true });
      return;
    }
    window.scrollTo(0, 0);
    document.title = "You're in — Ava Smart Dental";
  }, [state, navigate]);

  const plan = useMemo(() => getPlan(state?.plan), [state]);
  const trialEnd = useMemo(() => addDays(new Date(), 14), []);

  if (!state?.email) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main className="relative">
        <div aria-hidden className="brand-blob b1 left-1/4 top-20 h-72 w-72 opacity-40" />
        <div aria-hidden className="brand-blob b2 right-1/4 top-1/3 h-80 w-80 opacity-40" />

        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="fade-in fade-in-scale text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow-brand">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.20em] text-brand-700 sm:text-[12px] sm:tracking-[0.22em]">
              Trial started
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl">
              You're in,{" "}
              <span className="text-gradient-brand">
                {state.clinicName || "doctor"}
              </span>
              .
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-fg-muted sm:text-lg">
              Your {plan.name} trial is live. We've sent a confirmation link
              and receipt to{" "}
              <span className="font-semibold text-fg-2">{state.email}</span> —
              click it to set your password and open your workspace.
            </p>
            {state.simulated && (
              <p className="mx-auto mt-4 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                Demo mode: Supabase isn't configured yet, so no real email was
                sent. Add <code className="font-mono">VITE_SUPABASE_URL</code>{" "}
                and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>{" "}
                to enable the live signup.
              </p>
            )}
          </div>

          <div className="fade-in fade-in-d2 mt-10 rounded-3xl border border-line bg-white p-6 shadow-clinical sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              <Step
                n={1}
                title="Confirm your email"
                body="We sent a confirmation link to your inbox. Click it to set your password and open your new clinic workspace."
              />
              <Step
                n={2}
                title="Import your patients"
                body="Bring over existing records anytime in the first week — Ava can migrate from Excel, Google Sheets, or your old PMS."
              />
              <Step
                n={3}
                title={`First charge on ${formatDate(trialEnd)}`}
                body="You'll pay by GCash/Maya QR after your 18-day trial ends — nothing is charged today. Cancel from Settings → Billing anytime before then."
              />
            </ol>
          </div>

          <div className="fade-in fade-in-d3 mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              to="/downloads"
              className="shimmer-sweep inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-700 hover:shadow-glow-brand"
            >
              <Download className="h-4 w-4" />
              Download the desktop app
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`mailto:hello@avasmartdental.ph?subject=${encodeURIComponent(
                `Help setting up ${state.clinicName || "my clinic"}`,
              )}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-fg-2 transition-colors hover:border-line-2 hover:bg-surface-2"
            >
              <Mail className="h-4 w-4" />
              Talk to onboarding
            </a>
          </div>

          <p className="fade-in fade-in-d4 mt-8 text-center text-xs text-fg-subtle">
            Didn't get the email? Check spam, or{" "}
            <a
              href="mailto:hello@avasmartdental.ph"
              className="text-brand-600 underline-offset-2 hover:underline"
            >
              contact support
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
        {n}
      </span>
      <div>
        <p className="font-semibold text-fg">{title}</p>
        <p className="mt-0.5 text-sm text-fg-muted">{body}</p>
      </div>
    </li>
  );
}
