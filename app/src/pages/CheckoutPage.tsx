import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { useSpotlight } from "../lib/useSpotlight";
import { getPlan } from "../lib/plans";
import { StepIndicator } from "../components/checkout/StepIndicator";
import { PlanSummary } from "../components/checkout/PlanSummary";
import {
  AccountForm,
  type AccountData,
} from "../components/checkout/AccountForm";
import {
  PaymentForm,
  type PaymentData,
} from "../components/checkout/PaymentForm";
import { ReviewStep } from "../components/checkout/ReviewStep";

const steps = [
  { id: "account", label: "Account" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

const emptyAccount: AccountData = {
  clinicName: "",
  contactName: "",
  email: "",
  phone: "",
};

const emptyPayment: PaymentData = {
  cardholder: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

export default function CheckoutPage() {
  useSpotlight();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const plan = useMemo(() => getPlan(params.get("plan")), [params]);

  const [stepIdx, setStepIdx] = useState(0);
  const [account, setAccount] = useState<AccountData>(emptyAccount);
  const [payment, setPayment] = useState<PaymentData>(emptyPayment);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Checkout — ${plan.name} plan · Ava Smart Dental`;
  }, [plan.name]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIdx]);

  function handleAccountNext(data: AccountData) {
    setAccount(data);
    setStepIdx(1);
  }

  function handlePaymentNext(data: PaymentData) {
    setPayment(data);
    setStepIdx(2);
  }

  async function handleConfirm() {
    // Frontend-only: simulate the NextPay tokenization + intent confirmation.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    navigate("/checkout/success", {
      state: {
        plan: plan.id,
        email: account.email,
        clinicName: account.clinicName,
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
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
              14 days free. No charge today — cancel anytime before your trial
              ends.
            </p>
          </header>

          <div className="fade-in fade-in-d1 mt-8">
            <StepIndicator steps={steps} current={stepIdx} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
            <section
              key={stepIdx}
              className="fade-in fade-in-d2 rounded-3xl border border-line bg-white p-6 shadow-clinical sm:p-8"
            >
              {stepIdx === 0 && (
                <AccountForm initial={account} onNext={handleAccountNext} />
              )}
              {stepIdx === 1 && (
                <PaymentForm
                  initial={payment}
                  onBack={() => setStepIdx(0)}
                  onNext={handlePaymentNext}
                />
              )}
              {stepIdx === 2 && (
                <ReviewStep
                  plan={plan}
                  account={account}
                  payment={payment}
                  onBack={() => setStepIdx(1)}
                  onEditAccount={() => setStepIdx(0)}
                  onEditPayment={() => setStepIdx(1)}
                  onConfirm={handleConfirm}
                />
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
