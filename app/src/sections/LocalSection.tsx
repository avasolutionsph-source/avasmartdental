import { Wallet, BadgePercent, Printer, Smartphone, MapPin, Globe, Stethoscope } from "lucide-react";

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
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(700px 360px at 80% 20%, rgba(139,92,246,0.10), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="reveal text-[12px] font-semibold uppercase tracking-[0.22em] text-brand-700">
            Engineered by a real dentist
          </p>
          <h2 className="reveal mt-3 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Built by a dentist,{" "}
            <span className="text-brand-600">for dentists.</span>
          </h2>
          <p className="reveal mt-5 text-lg leading-relaxed text-fg-muted">
            Foreign clinic software is built for US clinics by US engineers. Ava
            is engineered by a practicing Filipino dentist — every screen
            started from the operatory, not from a product spec. What you
            actually charge. What you actually print. How patients actually pay.
          </p>

          <div className="reveal mt-8 grid gap-2.5 sm:grid-cols-2">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <Stethoscope className="h-4 w-4 shrink-0 text-brand-600" />
              <span>
                <span className="font-semibold">Engineered</span> by a real
                dentist
              </span>
            </div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span aria-hidden className="text-base">🇵🇭</span>
              <span>
                <span className="font-semibold">Made</span> in the Philippines
              </span>
            </div>
          </div>
        </div>

        <ul className="reveal grid gap-3 sm:grid-cols-2 lg:col-span-7">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li
                key={it.title}
                className="rounded-2xl border border-line bg-white p-5 transition hover:border-brand-300"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-fg">
                  {it.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {it.desc}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
