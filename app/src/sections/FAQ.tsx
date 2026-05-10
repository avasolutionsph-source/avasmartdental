import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Can I migrate my existing patient records?",
    a: "Yes — we'll handle migration as part of onboarding on the Clinic and Multi-branch tiers. We've already imported 1,800+ patients, 3,612 treatments and 398 appointments from real clinics into Ava.",
  },
  {
    q: "Does it work without internet?",
    a: "Ava is cloud-first via Supabase, so changes sync across all your devices instantly. You'll need internet for sync, but the UI stays responsive and editing keeps working through brief drops.",
  },
  {
    q: "Will my data be safe? Sino ang may access?",
    a: "Patient data is stored encrypted in Supabase (PostgreSQL) with row-level security. Only your clinic's authenticated users can read your data. Export everything to CSV or PDF anytime — your data is yours.",
  },
  {
    q: "What devices does it work on?",
    a: "Any modern browser on Smart TV, Windows, macOS, ChromeOS, Linux, iPad, Android tablet, iPhone, and Android phone. No installer, no IT setup. Install as a PWA for an app-like experience.",
  },
  {
    q: "Does it print Official Receipts (Resibo)?",
    a: "Yes. Ava prints Resibo from any invoice, including multi-page treatment receipts. PWD/Senior Citizen 20% discount is applied automatically with the proper breakdown.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "No credit card. You get the full Clinic tier for 14 days. If you don't continue, your data is exportable and your account simply pauses — nothing is deleted for 30 days.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="reveal divide-y divide-line rounded-2xl border border-line bg-white">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-start justify-between gap-6 px-6 py-5 text-left transition hover:bg-surface-2"
                  aria-expanded={isOpen}
                >
                  <span className="text-[17px] font-bold tracking-tight text-fg">
                    {f.q}
                  </span>
                  <span
                    className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isOpen
                        ? "bg-brand-600 text-white"
                        : "bg-surface-3 text-fg-muted"
                    }`}
                  >
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-[15px] leading-relaxed text-fg-muted">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
