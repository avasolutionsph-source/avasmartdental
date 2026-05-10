import { Wallet, BadgePercent, Printer, Smartphone, MapPin, Globe, Stethoscope } from "lucide-react";

const items = [
  { icon: Wallet, title: "Peso-aware everywhere", desc: "All currency in ₱. Receipts, totals and exports use PH formatting." },
  { icon: BadgePercent, title: "Auto PWD / Senior discount", desc: "Apply 20% discount with one toggle — math, breakdown and OR handled." },
  { icon: Smartphone, title: "GCash · Bank · Card · Cash", desc: "Record payments how Filipino patients actually pay. Mark partial." },
  { icon: Printer, title: "Resibo + multi-page receipts", desc: "Print Official Receipts and treatment receipts that span pages cleanly." },
  { icon: MapPin, title: "PH address fields built-in", desc: "Street · Barangay · City · Province as first-class fields." },
  { icon: Globe, title: "Taglish where it helps", desc: "Greetings and helper text switch to Taglish where it sounds natural." },
];

const delays = ["fade-in-d1", "fade-in-d2", "fade-in-d3", "fade-in-d4", "fade-in-d5", "fade-in-d6"];

export function LocalSection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div aria-hidden className="brand-blob b3 right-0 top-10 h-80 w-80" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(700px 360px at 80% 20%, rgba(139,92,246,0.10), transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:gap-12 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="fade-in text-[12px] font-semibold uppercase tracking-[0.22em] text-brand-700">
            Engineered by a real dentist
          </p>
          <h2 className="fade-in fade-in-d1 mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Built by a dentist,{" "}
            <span className="text-brand-600">for dentists.</span>
          </h2>
          <p className="fade-in fade-in-d2 mt-5 text-base leading-relaxed text-fg-muted sm:text-lg">
            Foreign clinic software is built for US clinics by US engineers. Ava
            is engineered by a practicing Filipino dentist — every screen
            started from the operatory, not from a product spec. What you
            actually charge. What you actually print. How patients actually pay.
          </p>

          <div className="fade-in fade-in-d3 mt-8 grid gap-2.5 sm:grid-cols-2">
            <div className="card-hover inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 hover:border-brand-400 hover:shadow-md">
              <Stethoscope className="h-4 w-4 shrink-0 text-brand-600" />
              <span>
                <span className="font-semibold">Engineered</span> by a real
                dentist
              </span>
            </div>
            <div className="card-hover inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 hover:border-brand-400 hover:shadow-md">
              <span aria-hidden className="text-base">🇵🇭</span>
              <span>
                <span className="font-semibold">Made</span> in the Philippines
              </span>
            </div>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li
                key={it.title}
                className={`fade-in ${delays[i]} group spotlight card-hover rounded-2xl border border-line bg-white p-5 hover:border-brand-300 hover:shadow-md`}
              >
                <span className="icon-spin relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="relative z-10 mt-4 text-lg font-bold tracking-tight text-fg">
                  {it.title}
                </h3>
                <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-fg-muted">
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
