import {
  Users,
  Calendar,
  Stethoscope,
  Wallet,
  PieChart,
  Pill,
  FileText,
} from "lucide-react";
import { PesoReceipt } from "../components/icons/PesoReceipt";

const features = [
  { icon: Users, title: "Patients", desc: "1,800+ records, tagged, searchable in milliseconds." },
  { icon: Calendar, title: "Appointments", desc: "Calendar + list views with one-tap status changes." },
  { icon: Stethoscope, title: "Dental chart", desc: "Interactive FDI 11–85 chart that auto-saves silently." },
  { icon: Wallet, title: "Billing", desc: "Invoices, installments, GCash, Resibo printing in ₱." },
  { icon: Pill, title: "Prescriptions", desc: "Editable Rx pad, full drug catalog, print and re-print." },
  { icon: PesoReceipt, title: "Expenses", desc: "Track clinic spending by category with breakdown bars." },
  { icon: PieChart, title: "Reports", desc: "Income, expenses, net profit, top procedures, outstanding." },
  { icon: FileText, title: "PDA forms", desc: "Patient Info, Medical History, Consent — all paperless." },
];

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3", "fade-in-d4", "fade-in-d5", "fade-in-d6", "fade-in-d7", "fade-in-d8"];

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div aria-hidden className="brand-blob b1 -left-32 top-32 h-72 w-72" />
      <div aria-hidden className="brand-blob b2 -right-40 bottom-32 h-96 w-96" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="fade-in text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Everything a clinic needs.
            <br />
            <span className="text-brand-600">Nothing it doesn't.</span>
          </h2>
          <p className="fade-in fade-in-d1 mt-4 text-base text-fg-muted sm:text-lg">
            Eight modules. One quiet workspace. No upsells, no per-feature gates.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <article
                key={f.title}
                className={`fade-in ${delays[i]} group spotlight card-hover relative flex flex-col rounded-2xl border border-line bg-white p-6 hover:border-brand-300 hover:shadow-clinical`}
              >
                <span className="icon-spin relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="relative z-10 mt-5 text-lg font-bold tracking-tight text-fg">
                  {f.title}
                </h3>
                <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {f.desc}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
