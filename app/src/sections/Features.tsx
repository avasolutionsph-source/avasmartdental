import {
  Users,
  Calendar,
  Stethoscope,
  Wallet,
  Receipt,
  PieChart,
  Pill,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, stagger, inViewProps } from "../lib/motion";

const features = [
  { icon: Users, title: "Patients", desc: "1,800+ records, tagged, searchable in milliseconds." },
  { icon: Calendar, title: "Appointments", desc: "Calendar + list views with one-tap status changes." },
  { icon: Stethoscope, title: "Dental chart", desc: "Interactive FDI 11–85 chart that auto-saves silently." },
  { icon: Wallet, title: "Billing", desc: "Invoices, installments, GCash, Resibo printing in ₱." },
  { icon: Pill, title: "Prescriptions", desc: "Editable Rx pad, full drug catalog, print and re-print." },
  { icon: Receipt, title: "Expenses", desc: "Track clinic spending by category with breakdown bars." },
  { icon: PieChart, title: "Reports", desc: "Income, expenses, net profit, top procedures, outstanding." },
  { icon: FileText, title: "PDA forms", desc: "Patient Info, Medical History, Consent — all paperless." },
];

export function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          variants={stagger(0, 0.12)}
          {...inViewProps}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl"
          >
            Everything a clinic needs.
            <br />
            <span className="text-brand-600">Nothing it doesn't.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base text-fg-muted sm:text-lg">
            Eight modules. One quiet workspace. No upsells, no per-feature gates.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger(0.1, 0.07)}
          {...inViewProps}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.article
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-6 transition-shadow duration-300 hover:border-brand-300 hover:shadow-clinical"
              >
                {/* Hover glow */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-50/0 via-brand-50/0 to-brand-100/0 transition-colors duration-500 group-hover:from-brand-50 group-hover:to-brand-100/40"
                />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-fg">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {f.desc}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
