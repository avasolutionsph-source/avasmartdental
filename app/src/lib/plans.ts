export type PlanId = "solo" | "clinic" | "multibranch";

export type Plan = {
  id: PlanId;
  name: string;
  desc: string;
  price: number;
  priceLabel: string;
  period: string;
  cta: string;
  ctaKind: "checkout" | "sales";
  featured: boolean;
  bullets: string[];
};

export const plans: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    desc: "For single-dentist clinics.",
    price: 1499,
    priceLabel: "1,499",
    period: "/ month",
    cta: "Start free trial",
    ctaKind: "checkout",
    featured: false,
    bullets: [
      "1 dentist · 1 branch",
      "Up to 3,000 patient records",
      "Full feature set — every module",
      "Cloud sync via Supabase",
      "Email support",
    ],
  },
  {
    id: "clinic",
    name: "Clinic",
    desc: "Most chosen — for growing clinics.",
    price: 2999,
    priceLabel: "2,999",
    period: "/ month",
    cta: "Start free trial",
    ctaKind: "checkout",
    featured: true,
    bullets: [
      "Up to 5 dentists · 1 branch",
      "Unlimited patient records",
      "Full feature set + advanced reports",
      "Priority chat support",
      "Free migration of existing patient data",
    ],
  },
  {
    id: "multibranch",
    name: "Multi-branch",
    desc: "For chains and multi-location clinics.",
    price: 4999,
    priceLabel: "4,999",
    period: "/ month",
    cta: "Talk to us",
    ctaKind: "sales",
    featured: false,
    bullets: [
      "Unlimited dentists · up to 5 branches",
      "Per-branch reporting + roll-up",
      "Custom roles + audit log",
      "Dedicated account manager",
      "Onboarding + staff training session",
    ],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return plans.find((p) => p.id === id) ?? plans[1];
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}
