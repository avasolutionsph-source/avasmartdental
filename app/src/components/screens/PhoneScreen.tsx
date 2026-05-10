// Phone — today's appointments (light + violet, fits 9:19.5 frame cleanly)
import { Home, Search, Plus } from "lucide-react";

const appts = [
  { t: "9:00", n: "Maria R.", p: "Cleaning", s: "Done", c: "bg-emerald-100 text-emerald-700" },
  { t: "10:30", n: "Juan dlC.", p: "Composite #36", s: "Now", c: "bg-[#7c3aed] text-white" },
  { t: "13:00", n: "Sofia L.", p: "Ortho", s: "Set", c: "bg-sky-100 text-sky-700" },
  { t: "15:30", n: "Mark V.", p: "Extraction", s: "Wait", c: "bg-amber-100 text-amber-700" },
];

export function PhoneScreen() {
  return (
    <div className="flex aspect-[9/19.5] w-full flex-col bg-white text-[#1c1530]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 pt-6 text-[7px] font-semibold text-[#1c1530]">
        <span>9:41</span>
        <span className="text-[#847ba0]">•••</span>
      </div>

      {/* Header */}
      <div className="px-3 pt-2">
        <p className="text-[8px] font-semibold uppercase tracking-wider text-[#7c3aed]">
          Today · May 10
        </p>
        <h4 className="text-[14px] font-bold leading-tight">Schedule</h4>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1 px-3 pt-2">
        <div className="rounded-md bg-[#f6f3fc] p-1.5">
          <p className="text-[6px] font-semibold uppercase tracking-wider text-[#847ba0]">Today</p>
          <p className="mt-0.5 text-[12px] font-bold leading-none">14</p>
        </div>
        <div className="rounded-md bg-[#ece4ff] p-1.5 ring-1 ring-[#bfa3ff]">
          <p className="text-[6px] font-semibold uppercase tracking-wider text-[#6d28d9]">Done</p>
          <p className="mt-0.5 text-[12px] font-bold leading-none text-[#6d28d9]">3</p>
        </div>
      </div>

      {/* List — fills remaining space, scrolls if needed */}
      <ul className="flex-1 space-y-1 overflow-hidden px-3 pt-2">
        {appts.map((a) => (
          <li
            key={a.n}
            className="flex items-center gap-1.5 rounded-md bg-[#faf8ff] p-1.5 ring-1 ring-[#ebe6f5]"
          >
            <span className="w-7 shrink-0 text-[7px] font-bold tabular-nums leading-none text-[#7c3aed]">
              {a.t}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[8px] font-semibold leading-tight">{a.n}</p>
              <p className="truncate text-[6px] leading-tight text-[#847ba0]">{a.p}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[6px] font-bold leading-none ${a.c}`}
            >
              {a.s}
            </span>
          </li>
        ))}
      </ul>

      {/* Bottom nav — in-flow, not absolute */}
      <div className="mx-2 mb-2 mt-2 flex items-center justify-around rounded-full border border-[#ebe6f5] bg-white py-1.5 shadow-sm">
        <span className="flex flex-col items-center gap-0.5 text-[#7c3aed]">
          <Home className="h-2.5 w-2.5" strokeWidth={2.5} />
          <span className="text-[6px] font-bold leading-none">Home</span>
        </span>
        <span className="flex flex-col items-center gap-0.5 text-[#847ba0]">
          <Search className="h-2.5 w-2.5" />
          <span className="text-[6px] font-medium leading-none">Search</span>
        </span>
        <span className="flex flex-col items-center gap-0.5 text-[#847ba0]">
          <Plus className="h-2.5 w-2.5" />
          <span className="text-[6px] font-medium leading-none">Add</span>
        </span>
      </div>
    </div>
  );
}
