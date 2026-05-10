import { Wallet, BadgePercent, Printer, Smartphone, MapPin, Globe, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, stagger, inViewProps } from "../lib/motion";

const items = [
  { icon: Wallet, title: "Peso-aware everywhere", desc: "All currency in ₱. Receipts, totals and exports use PH formatting." },
  { icon: BadgePercent, title: "Auto PWD / Senior discount", desc: "Apply 20% discount with one toggle — math, breakdown and OR handled." },
  { icon: Smartphone, title: "GCash · Bank · Card · Cash", desc: "Record payments how Filipino patients actually pay. Mark partial." },
  { icon: Printer, title: "Resibo + multi-page receipts", desc: "Print Official Receipts and treatment receipts that span pages cleanly." },
  { icon: MapPin, title: "PH address fields built-in", desc: "Street · Barangay · City · Province as first-class fields." },
  { icon: Globe, title: "Taglish where it helps", desc: "Greetings and helper text switch to Taglish where it sounds natural." },
];

export function LocalSection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(700px 360px at 80% 20%, rgba(139,92,246,0.10), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:gap-12 sm:px-8 lg:grid-cols-12">
        <motion.div
          className="lg:col-span-5"
          variants={stagger(0, 0.12)}
          {...inViewProps}
        >
          <motion.p
            variants={fadeUp}
            className="text-[12px] font-semibold uppercase tracking-[0.22em] text-brand-700"
          >
            Engineered by a real dentist
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl"
          >
            Built by a dentist,{" "}
            <span className="text-brand-600">for dentists.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 text-base leading-relaxed text-fg-muted sm:text-lg"
          >
            Foreign clinic software is built for US clinics by US engineers. Ava
            is engineered by a practicing Filipino dentist — every screen
            started from the operatory, not from a product spec. What you
            actually charge. What you actually print. How patients actually pay.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 grid gap-2.5 sm:grid-cols-2">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition-all duration-300 hover:border-brand-400 hover:shadow-md">
              <Stethoscope className="h-4 w-4 shrink-0 text-brand-600" />
              <span>
                <span className="font-semibold">Engineered</span> by a real
                dentist
              </span>
            </div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition-all duration-300 hover:border-brand-400 hover:shadow-md">
              <span aria-hidden className="text-base">🇵🇭</span>
              <span>
                <span className="font-semibold">Made</span> in the Philippines
              </span>
            </div>
          </motion.div>
        </motion.div>

        <motion.ul
          className="grid gap-3 sm:grid-cols-2 lg:col-span-7"
          variants={stagger(0.1, 0.06)}
          {...inViewProps}
        >
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <motion.li
                key={it.title}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group rounded-2xl border border-line bg-white p-5 transition-shadow duration-300 hover:border-brand-300 hover:shadow-md"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-fg">
                  {it.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {it.desc}
                </p>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
