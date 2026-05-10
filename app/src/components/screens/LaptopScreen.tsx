// Laptop screen — patients list (light + violet)
import { Search, Plus, Bell } from "lucide-react";

const patients = [
  { n: "Maria Reyes", b: "₱ 0", v: "Today", t: "Senior", recall: true, ini: "MR" },
  { n: "Juan dela Cruz", b: "₱ 1,800", v: "May 8", t: "Regular", recall: false, ini: "JC" },
  { n: "Sofia Lim", b: "₱ 0", v: "May 7", t: "Ortho", recall: false, ini: "SL" },
  { n: "Mark Velasco", b: "₱ 4,200", v: "May 3", t: "Regular", recall: true, ini: "MV" },
  { n: "Arianne Santos", b: "₱ 0", v: "Apr 28", t: "VIP", recall: false, ini: "AS" },
  { n: "Kim Chiu Aquino", b: "₱ 950", v: "Apr 21", t: "Pedia", recall: true, ini: "KA" },
];

const tagColor: Record<string, string> = {
  Senior: "bg-amber-100 text-amber-700",
  Regular: "bg-[#ece8f6] text-[#5b5176]",
  Ortho: "bg-[#ece4ff] text-[#6d28d9]",
  VIP: "bg-yellow-100 text-yellow-700",
  Pedia: "bg-pink-100 text-pink-700",
};

export function LaptopScreen() {
  return (
    <div className="aspect-[16/10] w-full bg-white text-[#1c1530]">
      <div className="grid h-full grid-cols-[140px_1fr]">
        {/* Sidebar */}
        <aside className="border-r border-[#ebe6f5] bg-[#faf8ff] p-3 text-[11px]">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#7c3aed] text-[9px] font-bold text-white">A</span>
            <span className="text-[12px] font-semibold">Ava</span>
          </div>
          <ul className="space-y-0.5 text-[#5b5176]">
            <li className="rounded px-2 py-1">Dashboard</li>
            <li className="rounded bg-white px-2 py-1 font-semibold text-[#1c1530] ring-1 ring-[#ebe6f5]">Patients</li>
            <li className="rounded px-2 py-1">Appointments</li>
            <li className="rounded px-2 py-1">Treatments</li>
            <li className="rounded px-2 py-1">Billing</li>
            <li className="rounded px-2 py-1">Reports</li>
          </ul>
        </aside>

        {/* Main */}
        <div className="flex min-h-0 flex-col p-3">
          {/* Top bar */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md bg-[#f6f3fc] px-2 py-1.5">
              <Search className="h-3 w-3 text-[#847ba0]" />
              <span className="text-[10px] text-[#847ba0]">Search 1,801 patients…</span>
            </div>
            <Bell className="h-3.5 w-3.5 text-[#847ba0]" />
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-[9px] font-bold text-white">DS</span>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex items-center gap-1.5 text-[10px]">
            {["All", "Recall Due", "Senior", "Pedia", "Ortho", "VIP"].map((t, i) => (
              <span
                key={t}
                className={`rounded-full px-2 py-1 ${
                  i === 0
                    ? "bg-[#ece4ff] text-[#6d28d9] ring-1 ring-[#bfa3ff]"
                    : "bg-[#f6f3fc] text-[#5b5176]"
                }`}
              >
                {t}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#7c3aed] px-2 py-1 text-[10px] font-semibold text-white">
              <Plus className="h-3 w-3" /> Patient
            </span>
          </div>

          {/* Table */}
          <div className="mt-3 flex-1 overflow-hidden rounded-md border border-[#ebe6f5] bg-white">
            <div className="grid grid-cols-[1fr_60px_60px_50px] gap-2 border-b border-[#ebe6f5] bg-[#faf8ff] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#847ba0]">
              <span>Patient</span>
              <span className="text-right">Balance</span>
              <span className="text-right">Last visit</span>
              <span className="text-right">Tag</span>
            </div>
            <ul>
              {patients.map((p) => (
                <li
                  key={p.n}
                  className="grid grid-cols-[1fr_60px_60px_50px] items-center gap-2 border-b border-[#ebe6f5] px-3 py-1.5 text-[10px] last:border-b-0"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#ece4ff] text-[8px] font-semibold text-[#6d28d9]">
                      {p.ini}
                    </span>
                    <span className="truncate font-semibold">{p.n}</span>
                    {p.recall && (
                      <span className="rounded-sm bg-amber-100 px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-amber-700">
                        Recall
                      </span>
                    )}
                  </span>
                  <span className={`text-right tabular-nums ${p.b === "₱ 0" ? "text-[#847ba0]" : "text-[#1c1530]"}`}>{p.b}</span>
                  <span className="text-right text-[#847ba0]">{p.v}</span>
                  <span className="text-right">
                    <span className={`rounded-sm px-1.5 py-0.5 text-[8px] font-semibold ${tagColor[p.t]}`}>{p.t}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
