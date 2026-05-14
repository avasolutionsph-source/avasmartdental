import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  FileDown, CalendarRange, Loader2, AlertTriangle,
  BarChart3, PhilippinePeso,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { Invoice, Patient, Payment, TreatmentRecord, Expense } from '@/types/models';
import { api } from '@/lib/api';
import { formatMoney, formatDate, getShortName, cn } from '@/lib/utils';
import { Card, Button, Badge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

const BillingPage = lazy(() => import('@/features/billing/BillingPage'));

// ─── Chart Colors ─────────────────────────────────────────────────
const CHART_BLUE = '#2563eb';
const CHART_BLUE_LIGHT = '#93c5fd';
const CHART_COLORS = [
  '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  '#1d4ed8', '#1e40af', '#6366f1', '#818cf8',
];

// ─── Custom Tooltip ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '' }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {prefix}{payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

// ─── ReportsPage ──────────────────────────────────────────────────

const REPORT_TABS = [
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'billing', label: 'Billing', icon: PhilippinePeso },
] as const;

export default function ReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'analytics' | 'billing'>('analytics');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Default date range: 6 months ago to today
  const [dateFrom, setDateFrom] = useState(() => {
    const d = monthsAgo(6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(todayStr);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [inv, pat, pay, tx] = await Promise.all([
          api.getInvoices(),
          api.getPatients(),
          api.getPayments(),
          api.getTreatments(),
        ]);
        // Expenses table may be empty / unmigrated — tolerate failure.
        let exp: Expense[] = [];
        try {
          exp = await api.getExpenses();
        } catch {
          exp = [];
        }

        if (!cancelled) {
          setInvoices(inv);
          setPatients(pat);
          setPayments(pay);
          setTreatments(tx);
          setExpenses(exp);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Filter by date range ──────────────────────────────────────
  const filteredPayments = useMemo(() =>
    payments.filter((p) => p.date >= dateFrom && p.date <= dateTo),
    [payments, dateFrom, dateTo],
  );

  const filteredTreatments = useMemo(() =>
    treatments.filter((t) => t.date >= dateFrom && t.date <= dateTo),
    [treatments, dateFrom, dateTo],
  );

  const filteredInvoices = useMemo(() =>
    invoices.filter((inv) => {
      const d = inv.created_at?.split('T')[0] || '';
      return d >= dateFrom && d <= dateTo;
    }),
    [invoices, dateFrom, dateTo],
  );

  // ─── Daily Collections (last 7 days from dateTo) ───────────────
  const dailyCollections = useMemo(() => {
    const end = new Date(dateTo);
    const days: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = payments
        .filter((p) => p.date === dateStr)
        .reduce((sum, p) => sum + (p.amount_int || 0), 0);
      days.push({ date: DAY_NAMES[d.getDay()], amount: Math.round(dayTotal / 100) });
    }
    return days;
  }, [payments, dateTo]);

  // ─── Monthly Income vs Expenses (last 6 months from dateTo) ────
  const monthlyIncomeVsExpenses = useMemo(() => {
    const months: { month: string; income: number; expenses: number }[] = [];
    const end = new Date(dateTo);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const income = payments
        .filter((p) => p.date.startsWith(yearMonth))
        .reduce((sum, p) => sum + (p.amount_int || 0), 0);
      const exp = expenses
        .filter((e) => e.date.startsWith(yearMonth))
        .reduce((sum, e) => sum + (e.amount_int || 0), 0);
      months.push({
        month: MONTH_NAMES[d.getMonth()],
        income: Math.round(income / 100),
        expenses: Math.round(exp / 100),
      });
    }
    return months;
  }, [payments, expenses, dateTo]);

  // ─── Top Procedures (from treatments in date range) ────────────
  const topProcedures = useMemo(() => {
    const counts = new Map<string, number>();
    filteredTreatments.forEach((t) => {
      const name = t.procedure_type || 'Unknown';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        // Short label fits the bar chart Y-axis without wrapping; full name
        // is preserved in `name` for tooltips.
        shortName: name.length > 28 ? `${name.slice(0, 27)}…` : name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredTreatments]);

  // ─── Outstanding Balances ──────────────────────────────────────
  const outstandingRows = invoices
    .filter((inv) => inv.balance_int > 0)
    .map((inv) => {
      const patient = patients.find((p) => p.patient_id === inv.patient_id);
      return {
        invoice_no: inv.invoice_no,
        patient_name: patient ? getShortName(patient) : 'Unknown',
        total: inv.total_int,
        paid: inv.amount_paid_int,
        balance: inv.balance_int,
        status: inv.status,
        due_date: inv.due_date,
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const handleExport = (type: 'pdf' | 'excel') => {
    toast.info(`Export to ${type.toUpperCase()} feature coming soon`);
  };

  // ─── Expenses in date range ────────────────────────────────────
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= dateFrom && e.date <= dateTo),
    [expenses, dateFrom, dateTo],
  );

  // ─── Summary stats ─────────────────────────────────────────────
  const totalCollected = filteredPayments.reduce((s, p) => s + (p.amount_int || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount_int || 0), 0);
  const netProfit = totalCollected - totalExpenses;
  const totalTreatmentsDone = filteredTreatments.length;
  const totalOutstanding = invoices.reduce((s, inv) => s + Math.max(0, inv.balance_int || 0), 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Analytics, billing, and financial reports for your clinic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5">
            <CalendarRange className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-0 bg-transparent text-sm text-gray-700 outline-none w-28"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-0 bg-transparent text-sm text-gray-700 outline-none w-28"
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} leftIcon={<FileDown className="h-4 w-4" />}>
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} leftIcon={<FileDown className="h-4 w-4" />}>
            Export Excel
          </Button>
        </div>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── Billing Tab ───────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>}>
          <BillingPage />
        </Suspense>
      )}

      {/* ─── Analytics Tab ─────────────────────────────────────── */}
      {activeTab === 'analytics' && <>

      {/* ─── Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Income</p>
          <p className="mt-1 text-xl lg:text-2xl font-bold text-success-600">{formatMoney(totalCollected)}</p>
          <p className="mt-0.5 text-xs text-gray-400">collected in range</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Expenses</p>
          <p className="mt-1 text-xl lg:text-2xl font-bold text-warning-600">{formatMoney(totalExpenses)}</p>
          <p className="mt-0.5 text-xs text-gray-400">spent in range</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Net Profit</p>
          <p className={cn(
            'mt-1 text-xl lg:text-2xl font-bold',
            netProfit >= 0 ? 'text-gray-900' : 'text-danger-600',
          )}>
            {formatMoney(netProfit)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">income − expenses</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Treatments</p>
          <p className="mt-1 text-xl lg:text-2xl font-bold text-gray-900">{totalTreatmentsDone}</p>
          <p className="mt-0.5 text-xs text-gray-400">done in range</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Outstanding</p>
          <p className="mt-1 text-xl lg:text-2xl font-bold text-danger-600">{formatMoney(totalOutstanding)}</p>
          <p className="mt-0.5 text-xs text-gray-400">all unpaid</p>
        </Card>
      </div>

      {/* ─── Charts Row 1 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Collections */}
        <Card title="Daily Collections" headerAction={<Badge variant="info">Last 7 days</Badge>}>
          <div className="h-72">
            {dailyCollections.every((d) => d.amount === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No payment data in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCollections} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip prefix="PHP " />} />
                  <Bar dataKey="amount" fill={CHART_BLUE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Monthly Income vs Expenses */}
        <Card title="Income vs Expenses" headerAction={<Badge variant="info">6-month trend</Badge>}>
          <div className="h-72">
            {monthlyIncomeVsExpenses.every((d) => d.income === 0 && d.expenses === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No data in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyIncomeVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value, name) => [
                      `PHP ${Number(value || 0).toLocaleString()}`,
                      name === 'income' ? 'Income' : 'Expenses',
                    ]}
                    labelStyle={{ fontSize: 12, fontWeight: 500 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600 capitalize">{value}</span>
                    )}
                  />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#10b981' }} />
                  <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Charts Row 2 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Procedures */}
        <Card title="Top Procedures" headerAction={<Badge variant="info">In date range</Badge>}>
          <div style={{ height: Math.max(320, topProcedures.length * 36 + 40) }}>
            {topProcedures.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No treatments in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProcedures} layout="vertical" barSize={20} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={210}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg max-w-xs">
                          <p className="text-xs font-medium text-gray-700">{row.name}</p>
                          <p className="text-sm font-bold text-gray-900">
                            {row.count} treatment{row.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_BLUE_LIGHT} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Procedure Distribution - Pie Chart */}
        <Card title="Procedure Distribution" headerAction={<Badge variant="info">Percentage</Badge>}>
          <div className="h-80">
            {topProcedures.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProcedures}
                    dataKey="count"
                    nameKey="shortName"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    label={({ percent }: any) =>
                      `${((percent || 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {topProcedures.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${value} treatment${value !== 1 ? 's' : ''}`,
                      item?.payload?.name ?? '',
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Outstanding Balances Table ─────────────────────────── */}
      <Card
        title="Outstanding Balances"
        headerAction={
          outstandingRows.length > 0 ? (
            <Badge variant="warning">{outstandingRows.length} patient{outstandingRows.length !== 1 ? 's' : ''}</Badge>
          ) : undefined
        }
      >
        {outstandingRows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No outstanding balances. All invoices are settled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {outstandingRows.map((row) => (
                  <tr key={row.invoice_no} className="border-b border-gray-100 transition hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.status === 'overdue' && <AlertTriangle className="h-4 w-4 text-danger-500" />}
                        <span className="font-medium text-gray-900">{row.patient_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.invoice_no}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.total)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-danger-600">{formatMoney(row.balance)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === 'overdue' ? 'danger' : row.status === 'partial' ? 'warning' : 'info'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.due_date)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Outstanding:</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-danger-600">
                    {formatMoney(outstandingRows.reduce((s, r) => s + r.balance, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      </>}
    </div>
  );
}
