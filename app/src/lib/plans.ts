export type PlanId = "tier_1" | "tier_2_6" | "tier_6plus";

export type Plan = {
  id: PlanId;
  name: string;
  desc: string;
  price: number | null;
  priceLabel: string;
  period: string;
  annualPrice: number | null;
  annualPriceLabel: string | null;
  cta: string;
  ctaKind: "checkout" | "sales";
  featured: boolean;
  bullets: string[];
  comingSoon: boolean;
};

export const plans: Plan[] = [
  {
    id: "tier_1",
    name: "1 clinic",
    desc: "For single-location clinics.",
    price: 699,
    priceLabel: "699",
    period: "/ month",
    annualPrice: 7000,
    annualPriceLabel: "7,000",
    cta: "Start free trial",
    ctaKind: "checkout",
    featured: false,
    bullets: [
      "1 clinic location",
      "Unlimited patient records",
      "Full feature set — every module",
      "Cloud sync via Supabase",
      "Email support",
    ],
    comingSoon: false,
  },
  {
    id: "tier_2_6",
    name: "2–6 clinics",
    desc: "Most chosen — for growing multi-location practices.",
    price: 1499,
    priceLabel: "1,499",
    period: "/ month",
    annualPrice: 15000,
    annualPriceLabel: "15,000",
    cta: "Start free trial",
    ctaKind: "checkout",
    featured: true,
    bullets: [
      "Up to 6 clinic locations",
      "Unlimited patient records",
      "Full feature set + advanced reports",
      "Priority chat support",
      "Free migration of existing patient data",
    ],
    comingSoon: true,
  },
  {
    id: "tier_6plus",
    name: "6+ clinics",
    desc: "For chains and multi-location networks.",
    price: null,
    priceLabel: "Contact us",
    period: "",
    annualPrice: null,
    annualPriceLabel: null,
    cta: "Talk to us",
    ctaKind: "sales",
    featured: false,
    bullets: [
      "7+ clinic locations",
      "Per-branch reporting + roll-up",
      "Custom roles + audit log",
      "Dedicated account manager",
      "Onboarding + staff training session",
    ],
    comingSoon: true,
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return plans.find((p) => p.id === id) ?? plans[0];
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}
