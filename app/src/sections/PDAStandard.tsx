import { ShieldCheck, Stethoscope, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

export function PDAStandard() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            PDA-compliant
          </span>
          <h2 className="reveal mt-4 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Built to{" "}
            <span className="text-brand-600">
              Philippine Dental Association
            </span>{" "}
            standards.
          </h2>
          <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-fg-muted">
            Walang shortcut. Yung dental record chart at PDA forms namin —
            customized talaga para sa Philippine dental clinics, sundo sa
            PDA standards mismo.
          </p>
        </div>

        {/* Stacked full-width showcases */}
        <div className="mt-14 space-y-6">
          <PDAChartCard />
          <PDAFormsCard />
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
    <article className="reveal relative rounded-2xl border border-line bg-white p-6 shadow-clinical sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            Form 01 · PDA standard
          </p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-fg">
            Dental Record Chart
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg-muted">
            <ChevronLeft className="h-4 w-4" />
          </span>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-fg">Apr 18, 2026</p>
            <p className="text-[10px] text-fg-subtle">Latest · 1 total record</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg-muted">
            <ChevronRight className="h-4 w-4" />
          </span>
          <span className="ml-2 inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-bold text-white">
            + New Chart
          </span>
        </div>
      </div>

      {/* Chart body */}
      <div className="mt-6 overflow-x-auto">
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
      <div className="mt-7 border-t border-line pt-6">
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
      <div className="mt-7 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
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
    <article className="reveal relative rounded-2xl border border-line bg-white p-6 shadow-clinical sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            Form 02 · PDA standard
          </p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-fg">
            PDA Forms — Patient Information + Medical History
          </h3>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <ClipboardList className="h-5 w-5" />
        </span>
      </div>

      {/* Patient Information */}
      <div className="mt-6 rounded-xl border border-line bg-surface-2 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-fg">Patient Information</p>
          <span className="text-[11px] font-medium text-brand-600">Edit</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-4">
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
      <div className="mt-5 rounded-xl border border-line bg-surface-2 p-5 sm:p-6">
        <p className="text-[13px] font-bold text-fg">Medical History</p>
        <p className="mt-1 text-[11px] font-medium text-fg-muted">
          Medical Conditions (check all that apply)
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
