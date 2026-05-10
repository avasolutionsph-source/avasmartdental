// Tablet — dental chart (light + violet)
import { Save } from "lucide-react";

const upper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const states: Record<number, string> = {
  16: "#fbbf24",
  14: "#fbbf24",
  12: "#7c3aed",
  22: "#7c3aed",
  24: "#34d399",
  28: "#94a3b8",
  46: "#fb7185",
  34: "#34d399",
};

export function TabletScreen() {
  return (
    <div className="aspect-[3/4] w-full bg-white p-3 text-[#1c1530]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-wider text-[#7c3aed]">
            Patient · Maria Reyes · 32
          </p>
          <h4 className="text-[14px] font-bold">Dental chart</h4>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#ece4ff] px-2 py-1 text-[8px] font-semibold text-[#6d28d9]">
          <Save className="h-2.5 w-2.5" /> Saved
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-[#faf8ff] p-3 ring-1 ring-[#ebe6f5]">
        <ToothRow teeth={upper} top />
        <div className="my-2 h-px w-full bg-[#ebe6f5]" />
        <ToothRow teeth={lower} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-1.5 text-[9px]">
        {[
          ["#7c3aed", "Caries"],
          ["#94a3b8", "Missing"],
          ["#34d399", "Composite"],
          ["#fb7185", "Extraction"],
          ["#fbbf24", "Sealant"],
          ["#ffffff", "Healthy"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5 text-[#5b5176]">
            <span className="h-2 w-2 rounded-sm border border-[#d9d2eb]" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-lg bg-[#faf8ff] p-2.5 ring-1 ring-[#ebe6f5]">
        <p className="text-[8px] font-semibold uppercase tracking-wider text-[#847ba0]">Notes · #36</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#2c2447]">
          Composite filling, occlusal. Used A2 shade. Patient tolerated well.
        </p>
      </div>
    </div>
  );
}

function ToothRow({ teeth, top }: { teeth: number[]; top?: boolean }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
      {teeth.map((n) => (
        <div key={n} className="flex flex-col items-center gap-0.5">
          {top && <span className="text-[7px] tabular-nums text-[#847ba0]">{n}</span>}
          <span
            className="h-4 w-full rounded-sm border border-[#d9d2eb]"
            style={{ background: states[n] ?? "#ffffff" }}
          />
          {!top && <span className="text-[7px] tabular-nums text-[#847ba0]">{n}</span>}
        </div>
      ))}
    </div>
  );
}
