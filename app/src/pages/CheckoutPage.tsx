import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { useSpotlight } from "../lib/useSpotlight";
import { getPlan } from "../lib/plans";
import { signupClinic } from "../lib/supabase";
import { StepIndicator } from "../components/checkout/StepIndicator";
import { PlanSummary } from "../components/checkout/PlanSummary";
import {
  AccountForm,
  type AccountData,
} from "../components/checkout/AccountForm";
import { ReviewStep } from "../components/checkout/ReviewStep";
import { BuildingAnimation } from "../components/checkout/BuildingAnimation";

const steps = [
  { id: "account", label: "Account" },
  { id: "review", label: "Review" },
];

const emptyAccount: AccountData = {
  clinicName: "",
  contactName: "",
  email: "",
  phone: "",
  password: "",
};

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export default function CheckoutPage() {
  useSpotlight();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const plan = useMemo(() => getPlan(params.get("plan")), [params]);

  // Only tier_1 is buyable today — tier_2_6 and tier_6plus are marked
  // `comingSoon` (multi-clinic isn't live yet) and their CTAs everywhere
  // else (Pricing.tsx) render as a disabled "Coming soon" badge, never a
  // link here. A stray/manual ?plan=tier_2_6 or ?plan=tier_6plus shouldn't
  // render a checkout for a plan that isn't sellable yet, so bounce back to
  // pricing. Also guards the (currently unreachable) case of a plan that is
  // neither comingSoon nor checkout-able.
  useEffect(() => {
    if (plan.comingSoon || plan.ctaKind !== "checkout") {
      navigate("/pricing", { replace: true });
    }
  }, [plan, navigate]);

  const [stepIdx, setStepIdx] = useState(0);
  const [account, setAccount] = useState<AccountData>(emptyAccount);

  const [building, setBuilding] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const signupResult = useRef<{ simulated: boolean } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Checkout — ${plan.name} plan · Ava Smart Dental`;
  }, [plan.name]);

  useEffect(() => {
    if (building) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIdx, building]);

  function handleAccountNext(data: AccountData) {
    setAccount(data);
    setStepIdx(1);
  }

  async function handleConfirm() {
    setSignupError(null);
    setBuilding(true);

    // Kick off the real signup call in parallel with the visual animation.
    // The animation calls `onAnimationDone` when it finishes; we wait for
    // both before navigating.
    // Cosmetic only — the server (handle_new_user, 0012) computes the real
    // 18-day trial end and forces plan=tier_1 regardless of what's sent here.
    const trialEnd = addDays(new Date(), 18);
    const result = await signupClinic({
      email: account.email,
      password: account.password,
      clinicName: account.clinicName,
      contactName: account.contactName,
      phone: account.phone,
      plan: plan.id,
      trialEndIso: trialEnd.toISOString(),
    });

    if (!result.ok) {
      setBuilding(false);
      setSignupError(result.reason);
      return;
    }
    signupResult.current = { simulated: result.simulated };
  }

  function handleAnimationDone() {
    // If signup is still in flight (shouldn't happen — Supabase signUp is
    // usually <500ms and animation is ~3.3s), bail out and let the await
    // above redirect when ready. In practice the result is always set.
    if (!signupResult.current) return;
    navigate("/checkout/success", {
      state: {
        plan: plan.id,
        email: account.email,
        clinicName: account.clinicName,
        simulated: signupResult.current.simulated,
      },
      replace: true,
    });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main className="relative">
        <div aria-hidden className="brand-blob b1 right-0 top-20 h-72 w-72 opacity-30" />
        <div aria-hidden className="brand-blob b2 left-0 top-1/3 h-80 w-80 opacity-30" />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-12">
          <Link
            to="/pricing"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
              building
                ? "pointer-events-none text-fg-faint"
                : "text-fg-muted hover:text-fg"
            }`}
            aria-disabled={building}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to pricing
          </Link>

          <header className="fade-in mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-brand-700 sm:text-[12px] sm:tracking-[0.22em]">
              Checkout
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl">
              Start your <span className="text-gradient-brand">{plan.name}</span> trial
            </h1>
            <p className="mt-2 max-w-xl text-sm text-fg-muted sm:text-base">
              18 days free. No charge today — cancel anytime before your trial
              ends.
            </p>
          </header>

          <div className="fade-in fade-in-d1 mt-8">
            <StepIndicator steps={steps} current={stepIdx} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
            <section
              key={building ? "building" : `step-${stepIdx}`}
              className="fade-in fade-in-d2 rounded-3xl border border-line bg-white p-6 shadow-clinical sm:p-8"
            >
              {building ? (
                <BuildingAnimation
                  active={building}
                  onComplete={handleAnimationDone}
                />
              ) : (
                <>
                  {signupError && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <strong className="font-semibold">
                        Couldn't finish signup:
                      </strong>{" "}
                      {signupError}
                    </div>
                  )}
                  {stepIdx === 0 && (
                    <AccountForm initial={account} onNext={handleAccountNext} />
                  )}
                  {stepIdx === 1 && (
                    <ReviewStep
                      plan={plan}
                      account={account}
                      onBack={() => setStepIdx(0)}
                      onEditAccount={() => setStepIdx(0)}
                      onConfirm={handleConfirm}
                    />
                  )}
                </>
              )}
            </section>

            <div className="fade-in fade-in-d3">
              <PlanSummary plan={plan} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
