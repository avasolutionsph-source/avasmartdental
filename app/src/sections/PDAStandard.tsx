import { ShieldCheck, Stethoscope, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

export function PDAStandard() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div aria-hidden className="brand-blob b3 left-10 top-32 h-72 w-72" />
      <div aria-hidden className="brand-blob b1 right-10 bottom-20 h-80 w-80" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="fade-in inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            PDA-compliant
          </span>
          <h2 className="fade-in fade-in-d1 mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Built to{" "}
            <span className="text-brand-600">
              Philippine Dental Association
            </span>{" "}
            standards.
          </h2>
          <p className="fade-in fade-in-d2 mx-auto mt-4 max-w-2xl text-base text-fg-muted sm:text-lg">
            Walang shortcut. Yung dental record chart at PDA forms namin —
            customized talaga para sa Philippine dental clinics, sundo sa
            PDA standards mismo.
          </p>
        </div>

        {/* Stacked full-width showcases — plain divs, always visible */}
        <div className="mt-10 space-y-5 sm:mt-14 sm:space-y-6">
          <div className="fade-in fade-in-d3">
            <PDAChartCard />
          </div>
          <div className="fade-in fade-in-d4">
            <PDAFormsCard />
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   PDA Dental Record Chart — full-width replica
   ===================================================================== */

const upperPerm = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerPerm = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const upperTemp = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const lowerTemp = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

// Caries marks on permanent upper teeth (matching the screenshot pattern)
const cariesUpperPerm = [18, 11, 25];

// Status row top: certain cells filled with C
const statusTopRight: Record<number, string> = { 0: "C" };
const statusTopLeft: Record<number, string> = { 0: "C", 3: "C" };

function PDAChartCard() {
  return (
    <article className="card-hover relative rounded-2xl border border-line bg-white p-4 shadow-clinical hover:shadow-glow-brand sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 sm:text-[11px]">
            Form 01 · PDA standard
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-tight text-fg sm:text-2xl">
            Dental Record Chart
          </h3>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-line text-fg-muted sm:inline-flex">
            <ChevronLeft className="h-4 w-4" />
          </span>
          <div className="text-center">
            <p className="text-[12px] font-semibold text-fg sm:text-[13px]">Apr 18, 2026</p>
            <p className="text-[9px] text-fg-subtle sm:text-[10px]">Latest · 1 total record</p>
          </div>
          <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-line text-fg-muted sm:inline-flex">
            <ChevronRight className="h-4 w-4" />
          </span>
          <span className="ml-1 inline-flex items-center justify-center rounded-md bg-brand-600 px-2.5 py-1.5 text-[11px] font-bold text-white sm:ml-2 sm:px-3 sm:text-xs">
            + New Chart
          </span>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-fg-subtle sm:hidden">
        ← scroll to see full chart →
      </p>

      {/* Chart body */}
      <div className="mt-3 overflow-x-auto sm:mt-6">
        <div className="min-w-[640px]">
          {/* STATUS top row */}
          <div className="grid grid-cols-[80px_1fr_24px_1fr_60px] items-center gap-2 py-1">
            <div className="text-right text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
              <p>STATUS</p>
              <p>RIGHT</p>
            </div>
            <StatusBoxes count={10} marks={statusTopRight} />
            <span />
            <StatusBoxes count={10} marks={statusTopLeft} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle">LEFT</span>
          </div>

          {/* Upper temporary */}
          <ChartRow
            label="TEMPORARY"
            label2="TEETH"
            leftTeeth={upperTemp.slice(0, 5)}
            rightTeeth={upperTemp.slice(5)}
            top
          />

          {/* Upper permanent */}
          <div className="grid grid-cols-[80px_1fr_24px_1fr_60px] items-center gap-2 py-1">
            <div className="text-right text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
              <p>PERMANENT</p>
              <p>TEETH</p>
            </div>
            <ToothRow teeth={upperPerm.slice(0, 8)} top cariesSet={cariesUpperPerm} />
            <span className="h-7 w-px self-center bg-line-2" />
            <ToothRow teeth={upperPerm.slice(8)} top cariesSet={cariesUpperPerm} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle">TMD</span>
          </div>

          {/* RIGHT / LEFT divider */}
          <div className="grid grid-cols-[80px_1fr_24px_1fr_60px] items-center gap-2 py-0.5">
            <span />
            <p className="text-right text-[9px] font-bold uppercase tracking-wider text-fg-subtle">RIGHT</p>
            <span />
            <p className="text-left text-[9px] font-bold uppercase tracking-wider text-fg-subtle">LEFT</p>
            <span />
          </div>

          {/* Lower permanent */}
          <ChartRow
            label="PERMANENT"
            label2="TEETH"
            leftTeeth={lowerPerm.slice(0, 8)}
            rightTeeth={lowerPerm.slice(8)}
          />

          {/* Lower temporary */}
          <ChartRow
            label="TEMPORARY"
            label2="TEETH"
            leftTeeth={lowerTemp.slice(0, 5)}
            rightTeeth={lowerTemp.slice(5)}
          />

          {/* STATUS bottom row */}
          <div className="grid grid-cols-[80px_1fr_24px_1fr_60px] items-center gap-2 py-1">
            <div className="text-right text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
              <p>STATUS</p>
              <p>RIGHT</p>
            </div>
            <StatusBoxes count={10} />
            <span />
            <StatusBoxes count={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle">LEFT</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 border-t border-line pt-5 sm:mt-7 sm:pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg">Legend</p>
          <a className="text-[11px] font-medium text-brand-600 hover:underline">Edit Legend</a>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <LegendGroup
            title="Condition"
            items={[
              ["C", "Caries", "text-rose-600"],
              ["M", "Missing", "text-fg-subtle"],
              ["CF", "Composite Filling", "text-sky-600"],
              ["TF", "Temporary Filling", "text-indigo-500"],
              ["RF", "Root Fragment", "text-amber-600"],
              ["Im", "Impacted Tooth", "text-brand-600"],
            ]}
          />
          <LegendGroup
            title="Restoration & Prosthetics"
            items={[
              ["J", "Jacket Crown", "text-amber-500"],
              ["Am", "Amalgam Filling", "text-fg-2"],
              ["AB", "Abutment", "text-sky-600"],
              ["P", "Pontic", "text-emerald-600"],
              ["In", "Inlay", "text-indigo-500"],
              ["Rm", "Removable Denture", "text-rose-500"],
            ]}
          />
          <LegendGroup
            title="Surgery"
            items={[
              ["X", "Extraction", "text-rose-600"],
              ["✓", "Present Teeth", "text-emerald-600"],
              ["Cm", "Congenitally Missing", "text-fg-subtle"],
              ["Sp", "Supernumerary", "text-brand-600"],
            ]}
          />
        </div>
      </div>

      {/* Lower checklists */}
      <div className="mt-6 grid grid-cols-2 gap-5 border-t border-line pt-5 sm:mt-7 sm:gap-6 sm:pt-6 lg:grid-cols-4">
        <CheckGroup
          title="Periodontal Screening"
          items={["Gingivitis", "Early Periodontitis", "Moderate Periodontitis", "Advanced Periodontitis"]}
        />
        <CheckGroup
          title="Occlusion"
          items={["Class (Molar)", "Overjet", "Overbite", "Midline Deviation", "Crossbite"]}
        />
        <CheckGroup title="Appliances" items={["Orthodontic", "Stayplate", "Others"]} />
        <CheckGroup title="TMD" items={["Clenching", "Clicking", "Trismus", "Muscle Spasm"]} />
      </div>
    </article>
  );
}

function ChartRow({
  label,
  label2,
  leftTeeth,
  rightTeeth,
  top,
}: {
  label: string;
  label2: string;
  leftTeeth: number[];
  rightTeeth: number[];
  top?: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_24px_1fr_60px] items-center gap-2 py-1">
      <div className="text-right text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
        <p>{label}</p>
        <p>{label2}</p>
      </div>
      <ToothRow teeth={leftTeeth} top={top} />
      <span className="h-6 w-px self-center bg-line-2" />
      <ToothRow teeth={rightTeeth} top={top} />
      <span />
    </div>
  );
}

function ToothRow({
  teeth,
  top,
  cariesSet = [],
}: {
  teeth: number[];
  top?: boolean;
  cariesSet?: number[];
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${teeth.length}, minmax(0, 1fr))` }}
    >
      {teeth.map((n) => {
        const isCaries = cariesSet.includes(n);
        return (
          <div key={n} className="flex flex-col items-center">
            {top && (
              <span className="text-[9px] tabular-nums leading-none text-fg-subtle">{n}</span>
            )}
            <span
              className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${
                isCaries
                  ? "border-rose-400 bg-rose-500 text-white shadow-sm"
                  : "border-line-2 bg-white text-fg-subtle"
              }`}
            >
              {isCaries ? "C" : ""}
            </span>
            {!top && (
              <span className="mt-0.5 text-[9px] tabular-nums leading-none text-fg-subtle">{n}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBoxes({ count, marks = {} }: { count: number; marks?: Record<number, string> }) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-6 items-center justify-center rounded-sm border border-line-2 bg-white text-[10px] font-bold text-rose-600"
        >
          {marks[i] ?? ""}
        </div>
      ))}
    </div>
  );
}

function LegendGroup({ title, items }: { title: string; items: [string, string, string][] }) {
  return (
    <div>
      <p className="text-[11px] font-bold underline underline-offset-2 text-fg">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map(([code, label, color]) => (
          <li key={code} className="flex items-center gap-2 text-[12px] text-fg-2">
            <span className={`inline-flex w-7 shrink-0 font-bold ${color}`}>{code}</span>
            <span className="text-fg-subtle">·</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-fg">{title}</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 text-[12px] text-fg-2">
            <span className="inline-block h-3 w-3 rounded-[3px] border border-line-2 bg-white" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =====================================================================
   PDA Forms — PIR + Medical History
   ===================================================================== */

const pir: [string, string][] = [
  ["FULL NAME", "Dela Cruz, Juana"],
  ["BIRTHDATE / AGE", "Mar 12, 1985 (40 yrs old)"],
  ["SEX", "Female"],
  ["ADDRESS", "Sample St., Quezon City"],
  ["MOBILE", "0917-XXX-XXXX"],
  ["EMAIL", "—"],
  ["OCCUPATION", "Teacher"],
  ["EMERGENCY CONTACT", "—"],
  ["INSURANCE", "—"],
  ["RELIGION", "—"],
  ["RECALL DATE", "Sep 18, 2026"],
];

const medConditions = [
  "Heart Disease",
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Bleeding Disorder",
  "Hepatitis",
  "HIV/AIDS",
  "Kidney Disease",
  "Thyroid Disease",
  "Epilepsy",
  "Cancer",
  "Tuberculosis",
  "Allergies to Anesthesia",
  "Allergies to Antibiotics",
  "Pregnancy / Nursing",
];

function PDAFormsCard() {
  return (
    <article className="card-hover relative rounded-2xl border border-line bg-white p-4 shadow-clinical hover:shadow-glow-brand sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 sm:text-[11px]">
            Form 02 · PDA standard
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight tracking-tight text-fg sm:text-2xl">
            PDA Forms — Patient Info + Medical History
          </h3>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 sm:h-10 sm:w-10">
          <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>

      {/* Patient Information */}
      <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-fg sm:text-[13px]">Patient Information</p>
          <span className="text-[11px] font-medium text-brand-600">Edit</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:mt-4 sm:gap-x-6 sm:gap-y-4 sm:grid-cols-3 md:grid-cols-4">
          {pir.map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                {label}
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold text-fg">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Medical History */}
      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4 sm:mt-5 sm:p-6">
        <p className="text-[12px] font-bold text-fg sm:text-[13px]">Medical History</p>
        <p className="mt-1 text-[10px] font-medium text-fg-muted sm:text-[11px]">
          Medical Conditions (check all that apply)
        </p>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:mt-4 sm:grid-cols-3 sm:gap-2">
          {medConditions.map((c, i) => (
            <label
              key={c}
              className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-[12px] text-fg-2"
            >
              <span
                className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
                  i === 1 || i === 2
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-line-2 bg-white"
                }`}
              >
                {(i === 1 || i === 2) && <span className="text-[8px] font-bold">✓</span>}
              </span>
              <span className="truncate">{c}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg">Allergies</p>
            <div className="mt-1.5 rounded-md border border-line bg-white px-3 py-2 text-[11px] italic text-fg-subtle">
              List any known allergies…
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg">
              Current Medications
            </p>
            <div className="mt-1.5 rounded-md border border-line bg-white px-3 py-2 text-[11px] italic text-fg-subtle">
              List medications currently being taken…
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg">Physician Name</p>
            <div className="mt-1.5 rounded-md border border-line bg-white px-3 py-2 text-[11px] italic text-fg-subtle">
              Dr. Juan Dela Cruz
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg">
              Physician Contact
            </p>
            <div className="mt-1.5 rounded-md border border-line bg-white px-3 py-2 text-[11px] italic text-fg-subtle">
              09XX XXX XXXX
            </div>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <p className="mt-5 flex items-center gap-2 text-xs text-fg-subtle">
        <Stethoscope className="h-3.5 w-3.5 text-brand-600" />
        Includes Consent Form (print-ready) and full medical history fields per
        PDA standard. Sample data shown.
      </p>
    </article>
  );
}
