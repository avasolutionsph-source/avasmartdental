// Desktop monitor dashboard — full Ava interface, light + violet.
import {
  Calendar,
  Users,
  Wallet,
  Stethoscope,
  TrendingUp,
  Bell,
  Search,
  PieChart,
  Pill,
  Settings,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { PesoReceipt } from "../icons/PesoReceipt";

export function DesktopScreen() {
  return (
    <div className="aspect-[16/10] w-full bg-white text-[#1c1530]">
      <div className="grid h-full grid-cols-[160px_1fr]">
        {/* Sidebar */}
        <aside className="border-r border-[#ebe6f5] bg-[#faf8ff] p-3 text-[11px]">
          <div className="mb-4 flex items-center gap-2 px-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed] text-[10px] font-bold text-white">
              A
            </span>
            <span className="text-[12px] font-bold tracking-tight">Ava</span>
          </div>
          <ul className="space-y-0.5 text-[#5b5176]">
            {[
              { i: <TrendingUp className="h-3 w-3" />, l: "Dashboard", active: true },
              { i: <Users className="h-3 w-3" />, l: "Patients" },
              { i: <Calendar className="h-3 w-3" />, l: "Appointments" },
              { i: <Stethoscope className="h-3 w-3" />, l: "Treatments" },
              { i: <Wallet className="h-3 w-3" />, l: "Billing" },
              { i: <Pill className="h-3 w-3" />, l: "Prescriptions" },
              { i: <PesoReceipt className="h-3 w-3" />, l: "Expenses" },
              { i: <PieChart className="h-3 w-3" />, l: "Reports" },
            ].map((it) => (
              <li
                key={it.l}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                  it.active
                    ? "bg-white font-semibold text-[#1c1530] ring-1 ring-[#ebe6f5]"
                    : ""
                }`}
              >
                <span className={it.active ? "text-[#7c3aed]" : ""}>{it.i}</span>
                {it.l}
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-[#ebe6f5] pt-3 text-[#847ba0]">
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
              <Settings className="h-3 w-3" />
              Settings
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-h-0 flex-col p-4">
          {/* Top bar */}
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-[#f6f3fc] px-2.5 py-1.5">
              <Search className="h-3 w-3 text-[#847ba0]" />
              <span className="text-[10px] text-[#847ba0]">
                Search patients, invoices, appointments…
              </span>
              <span className="ml-auto rounded border border-[#ebe6f5] bg-white px-1 py-0.5 text-[8px] text-[#5b5176]">
                ⌘K
              </span>
            </div>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-white ring-1 ring-[#ebe6f5]">
              <Bell className="h-3 w-3 text-[#5b5176]" />
              <span className="pulse-ring absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500 text-rose-500" />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#7c3aed] text-[9px] font-bold text-white">
              DS
            </span>
          </div>

          {/* Greeting */}
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7c3aed]">
              Magandang umaga, Dr. Santos
            </p>
            <h3 className="text-[18px] font-bold leading-tight">Today's clinic</h3>
          </div>

          {/* Stat cards */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { l: "Today's appts", v: "14", c: "text-[#7c3aed]" },
              { l: "Patients", v: "1,801", c: "text-[#1c1530]" },
              { l: "MTD revenue", v: "₱248K", c: "text-[#7c3aed]" },
              { l: "Outstanding", v: "₱42K", c: "text-rose-600" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-lg border border-[#ebe6f5] bg-white p-2.5"
              >
                <p className="text-[8px] font-semibold uppercase tracking-wide text-[#847ba0]">
                  {s.l}
                </p>
                <p className={`mt-1 text-[14px] font-bold tabular-nums ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Two-col content */}
          <div className="mt-3 grid flex-1 grid-cols-[1.4fr_1fr] gap-2">
            {/* Schedule */}
            <div className="rounded-lg border border-[#ebe6f5] bg-[#faf8ff] p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#1c1530]">
                  Today's schedule
                </p>
                <p className="text-[9px] text-[#847ba0]">May 10 · Sat</p>
              </div>
              <ul className="space-y-1">
                {[
                  { t: "9:00", n: "Maria Reyes", p: "Cleaning + Polish", s: "Done", c: "bg-emerald-100 text-emerald-700" },
                  { t: "10:30", n: "Juan dela Cruz", p: "Composite #36", s: "In chair", c: "bg-[#7c3aed] text-white" },
                  { t: "13:00", n: "Sofia Lim", p: "Ortho adjust.", s: "Confirmed", c: "bg-sky-100 text-sky-700" },
                  { t: "15:30", n: "Mark Velasco", p: "Extraction #46", s: "Pending", c: "bg-amber-100 text-amber-700" },
                ].map((a) => (
                  <li
                    key={a.n}
                    className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 ring-1 ring-[#ebe6f5]"
                  >
                    <span className="w-7 text-[9px] font-semibold tabular-nums text-[#7c3aed]">
                      {a.t}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold">{a.n}</p>
                      <p className="truncate text-[8px] text-[#847ba0]">{a.p}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${a.c}`}
                    >
                      {a.s}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-200 text-amber-700">
                    <AlertCircle className="h-3 w-3" />
                  </span>
                  <p className="text-[10px] font-bold text-amber-800">
                    Recall due this week
                  </p>
                </div>
                <p className="mt-1.5 text-[18px] font-bold tabular-nums text-amber-900">
                  12 patients
                </p>
                <p className="text-[9px] text-amber-700">Tap to send reminders</p>
              </div>

              <div className="flex-1 rounded-lg border border-[#ebe6f5] bg-white p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#847ba0]">
                  This month
                </p>
                <p className="mt-1 text-[16px] font-bold tabular-nums text-[#7c3aed]">
                  ₱ 248,920
                </p>
                <div className="mt-2 flex h-8 items-end gap-0.5">
                  {[40, 55, 30, 70, 65, 80, 60, 90, 75, 85].map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, delay: 0.8 + i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-[#bfa3ff] to-[#7c3aed]"
                    />
                  ))}
                </div>
                <p className="mt-1 text-[8px] text-[#847ba0]">+18% vs last month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
