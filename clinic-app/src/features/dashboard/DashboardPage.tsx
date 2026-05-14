import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, TrendingUp, AlertTriangle,
  Clock, UserPlus, CalendarPlus, FileText, BarChart3,
  Loader2, ChevronRight, BellRing,
} from 'lucide-react';
import type { Patient, Appointment, Invoice, Dentist } from '@/types/models';
import { api } from '@/lib/api';
import { formatMoney, getShortName, getInitials, formatDate, todayISO } from '@/lib/utils';
import { Stat, Card, Badge, Avatar, Button, EmptyState } from '@/components/ui';

// ─── Helpers ──────────────────────────────────────────────────────

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function daysOverdue(dueDate: string): number {
  // Parse YYYY-MM-DD as local-midnight to avoid UTC/local TZ drift.
  const [y, m, d] = dueDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return 0;
  const due = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diff = Math.floor((todayLocal - due) / 86_400_000);
  return diff > 0 ? diff : 0;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

function statusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    scheduled: 'info',
    confirmed: 'purple',
    done: 'success',
    no_show: 'danger',
    cancelled: 'default',
  };
  return map[status] || 'default';
}

// ─── DashboardPage ────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [p, a, i, d] = await Promise.all([
          api.getPatients(),
          api.getAppointments(),
          api.getInvoices(),
          api.getDentists(),
        ]);
        if (!cancelled) {
          setPatients(p);
          setAppointments(a);
          setInvoices(i);
          setDentists(d);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Derived Data ────────────────────────────────────────────

  const today = todayISO();

  const todayAppointments = appointments
    .filter((a) => a.date === today && a.status !== 'cancelled')
    .sort((a, b) => a.time_start.localeCompare(b.time_start));

  const recentPatients = [...patients]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  // Patients whose recall is today or earlier — sort soonest-overdue first.
  const recallDue = patients
    .filter((p) => p.recall_date && p.recall_date <= today)
    .sort((a, b) => (a.recall_date || '').localeCompare(b.recall_date || ''))
    .slice(0, 6);

  // Revenue this month = sum of payments made (via invoice.amount_paid_int) on invoices
  // created in the current month. Outstanding = sum of all unpaid balances (all-time).
  const monthPrefix = today.slice(0, 7); // YYYY-MM
  const invoicesThisMonth = invoices.filter((inv) => (inv.created_at || '').startsWith(monthPrefix));
  const revenueThisMonth = invoicesThisMonth.reduce((sum, inv) => sum + inv.amount_paid_int, 0);
  const outstandingBalance = invoices.reduce((sum, inv) => sum + inv.balance_int, 0);

  const overdueInvoices = invoices
    .filter((inv) => inv.status === 'overdue')
    .map((inv) => ({
      ...inv,
      patient: patients.find((p) => p.patient_id === inv.patient_id),
      days: daysOverdue(inv.due_date),
    }));

  const getDentistName = (id: number) => {
    const d = dentists.find((dt) => dt.dentist_id === id);
    return d ? `Dr. ${d.last_name}` : 'Unassigned';
  };

  // ─── Loading State ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
          Welcome back! Here is your clinic overview for today.
        </p>
      </div>

      {/* ─── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          change={`${todayAppointments.filter((a) => a.status === 'confirmed').length} confirmed`}
          trend="up"
        />
        <Stat
          label="Total Patients"
          value={patients.length}
          icon={Users}
          change="Active records"
          trend="up"
        />
        <Stat
          label="Revenue This Month"
          value={formatMoney(revenueThisMonth)}
          icon={TrendingUp}
          change={`${invoicesThisMonth.length} invoice${invoicesThisMonth.length !== 1 ? 's' : ''}`}
          trend={revenueThisMonth > 0 ? 'up' : 'neutral'}
        />
        <Stat
          label="Outstanding Balance"
          value={formatMoney(outstandingBalance)}
          icon={AlertTriangle}
          change={`${overdueInvoices.length} overdue`}
          trend={overdueInvoices.length > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* ─── Middle Section ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card
          title="Today's Schedule"
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          }
        >
          {todayAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments today"
              description="Your schedule is clear for today."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {todayAppointments.map((appt) => {
                const patient = patients.find((p) => p.patient_id === appt.patient_id);
                return (
                  <div key={appt.appointment_id} className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs sm:text-sm font-medium text-gray-900">
                        {patient ? getShortName(patient) : 'Unknown Patient'}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500">
                        {formatTime12h(appt.time_start)} &ndash; {formatTime12h(appt.time_end)}
                        <span className="hidden sm:inline">{' '}&middot;{' '}{getDentistName(appt.dentist_id)}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] sm:text-xs text-gray-500 hidden sm:block">{appt.notes || 'General'}</p>
                      <Badge variant={statusBadgeVariant(appt.status)} className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs">
                        {appt.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Patients */}
        <Card
          title="Recent Patients"
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          }
        >
          {recentPatients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients yet"
              description="Add your first patient to get started."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentPatients.map((patient) => (
                <div key={patient.patient_id} className="flex items-center gap-2.5 sm:gap-3 py-2.5 sm:py-3">
                  <Avatar
                    name={getShortName(patient)}
                    initials={getInitials(patient.first_name, patient.last_name)}
                    size="md"
                    className="h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-medium text-gray-900">
                      {getShortName(patient)}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500">{patient.mobile_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] sm:text-xs text-gray-500 hidden sm:block">Last updated</p>
                    <p className="text-[11px] sm:text-xs font-medium text-gray-700">
                      {formatDate(patient.updated_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Patients Due for Recall ────────────────────────────── */}
      <Card
        title="Patients Due for Recall"
        headerAction={
          recallDue.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          ) : undefined
        }
      >
        {recallDue.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No recalls due today"
            description="Set a recall date on a patient profile to get reminders here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recallDue.map((p) => {
              const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(p.recall_date as string).getTime()) / 86_400_000));
              return (
                <button
                  key={p.patient_id}
                  type="button"
                  onClick={() => navigate(`/patients/${p.patient_id}`)}
                  className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50/40 px-3 py-2.5 text-left transition-colors hover:border-warning-300 hover:bg-warning-50 active:scale-[0.99]"
                >
                  <Avatar
                    name={getShortName(p)}
                    initials={getInitials(p.first_name, p.last_name)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{getShortName(p)}</p>
                    <p className="text-[11px] text-warning-700">
                      Due {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-warning-400" />
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Bottom Section ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Overdue Payments */}
        <Card
          title="Overdue Payments"
          headerAction={
            overdueInvoices.length > 0 ? (
              <Badge variant="danger">{overdueInvoices.length} overdue</Badge>
            ) : undefined
          }
        >
          {overdueInvoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No overdue payments"
              description="All invoices are up to date. Great job!"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {overdueInvoices.map((inv) => (
                <div key={inv.invoice_id} className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-500">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-medium text-gray-900">
                      {inv.patient ? getShortName(inv.patient) : 'Unknown'}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500">{inv.invoice_no}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-semibold text-danger-600">
                      {formatMoney(inv.balance_int)}
                    </p>
                    <p className="text-[11px] sm:text-xs text-danger-500">
                      {inv.days} day{inv.days !== 1 ? 's' : ''} overdue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/patients?action=new')}
              className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-5 transition-all hover:border-primary-200 hover:bg-primary-50 hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">New Patient</span>
            </button>

            <button
              onClick={() => navigate('/appointments?action=new')}
              className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-5 transition-all hover:border-primary-200 hover:bg-primary-50 hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <CalendarPlus className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">New Appointment</span>
            </button>

            <button
              onClick={() => navigate('/billing?action=new')}
              className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-5 transition-all hover:border-primary-200 hover:bg-primary-50 hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">Create Invoice</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-5 transition-all hover:border-primary-200 hover:bg-primary-50 hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">View Reports</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
