import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import {
  Plus,
  PhilippinePeso,
  AlertTriangle,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Eye,
  Printer,
  Trash2,
  Search,
  FileText,
  X,
} from 'lucide-react';
import type { Invoice, Payment, Patient, InstallmentPlan, InvoiceItem } from '@/types/models';
import {
  formatMoney,
  formatDate,
  cn,
  getShortName,
  getFullName,
  todayISO,
  generateId,
  pesosToCentavos,
  centavosToPesos,
} from '@/lib/utils';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { Stat } from '@/components/ui/Stat';
import { useToast } from '@/components/ui/Toast';
import {
  format,
  addMonths,
  parseISO,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

// ─── Local Types ─────────────────────────────────────────────────

type BillingTab = 'all' | 'due_this_week' | 'overdue' | 'paid';
type BadgeVar = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface LineItemForm {
  key: string;
  description: string;
  qty: number;
  unitPrice: string;
}

interface CreateInvoiceForm {
  patientId: string;
  patientSearch: string;
  items: LineItemForm[];
  discount: string;
  paymentTerms: 'full' | 'installment';
  dueDate: string;
  downpayment: string;
  months: string;
  dueDay: string;
}

interface RecordPaymentForm {
  invoiceId: number;
  amount: string;
  method: string;
  referenceNo: string;
  date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function statusBadgeVariant(status: string): BadgeVar {
  const map: Record<string, BadgeVar> = {
    draft: 'default',
    sent: 'info',
    partial: 'warning',
    paid: 'success',
    overdue: 'danger',
  };
  return map[status] ?? 'default';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    partial: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
  };
  return map[status] ?? status;
}

function resolvePatientName(patients: Patient[], id: number): string {
  const p = patients.find((pt) => pt.patient_id === id);
  return p ? getShortName(p) : `Patient #${id}`;
}

function isDueThisWeek(inv: Invoice): boolean {
  if (inv.status === 'paid') return false;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const due = parseISO(inv.due_date);
  return !isBefore(due, weekStart) && !isAfter(due, weekEnd);
}

function lineKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function BillingPage() {
  const toast = useToast();

  // ─── Data ────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [paymentsMap, setPaymentsMap] = useState<Record<number, Payment[]>>({});
  const [plansMap, setPlansMap] = useState<Record<number, InstallmentPlan>>({});
  const [loading, setLoading] = useState(true);

  // ─── Filters ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<BillingTab>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ─── Expanded rows ──────────────────────────────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // ─── Modals ─────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  // ─── Patient autocomplete ──────────────────────────────────────
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const patientDropRef = useRef<HTMLDivElement>(null);

  // ─── Fetch data ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [invs, pts] = await Promise.all([api.getInvoices(), api.getPatients()]);
        if (cancelled) return;
        setInvoices(invs);
        setPatients(pts);

        const pmMap: Record<number, Payment[]> = {};
        const plMap: Record<number, InstallmentPlan> = {};
        await Promise.all(
          invs.map(async (inv) => {
            const [pmts, plan] = await Promise.all([
              api.getInvoicePayments(inv.invoice_id),
              inv.payment_terms === 'installment'
                ? api.getInstallmentPlan(inv.invoice_id)
                : Promise.resolve(undefined),
            ]);
            pmMap[inv.invoice_id] = pmts;
            if (plan) plMap[inv.invoice_id] = plan;
          }),
        );
        if (cancelled) return;
        setPaymentsMap(pmMap);
        setPlansMap(plMap);
      } catch {
        toast.error('Failed to load billing data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Close dropdown on outside click ────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (patientDropRef.current && !patientDropRef.current.contains(e.target as Node))
        setPatientDropOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + i.total_int, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.amount_paid_int, 0);
    return {
      totalInvoiced,
      totalCollected,
      outstanding: totalInvoiced - totalCollected,
      overdueCount: invoices.filter((i) => i.status === 'overdue').length,
    };
  }, [invoices]);

  // ─── Tab counts ─────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      all: invoices.length,
      due_this_week: invoices.filter(isDueThisWeek).length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
    }),
    [invoices],
  );

  // ─── Filtered invoices ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (activeTab === 'due_this_week') list = list.filter(isDueThisWeek);
    else if (activeTab === 'overdue') list = list.filter((i) => i.status === 'overdue');
    else if (activeTab === 'paid') list = list.filter((i) => i.status === 'paid');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((inv) => {
        const name = resolvePatientName(patients, inv.patient_id).toLowerCase();
        return inv.invoice_no.toLowerCase().includes(q) || name.includes(q);
      });
    }
    if (dateFrom) {
      const from = parseISO(dateFrom);
      list = list.filter((inv) => !isBefore(parseISO(inv.created_at.slice(0, 10)), from));
    }
    if (dateTo) {
      const to = parseISO(dateTo);
      list = list.filter((inv) => !isAfter(parseISO(inv.created_at.slice(0, 10)), to));
    }
    return list;
  }, [invoices, activeTab, search, patients, dateFrom, dateTo]);

  // ─── Toggle row ─────────────────────────────────────────────────
  const toggleRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openPayModal = useCallback((inv: Invoice) => {
    setPayInvoice(inv);
    setShowPayment(true);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CREATE INVOICE FORM
  // ═══════════════════════════════════════════════════════════════

  const freshForm = useCallback(
    (): CreateInvoiceForm => ({
      patientId: '',
      patientSearch: '',
      items: [{ key: lineKey(), description: '', qty: 1, unitPrice: '' }],
      discount: '0',
      paymentTerms: 'full',
      dueDate: '',
      downpayment: '0',
      months: '6',
      dueDay: '15',
    }),
    [],
  );

  const [form, setForm] = useState<CreateInvoiceForm>(freshForm);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setForm(freshForm());
    setFormErr({});
  }, [freshForm]);

  // Filtered patients for autocomplete
  const filteredPatients = useMemo(() => {
    if (!form.patientSearch.trim()) return patients;
    const q = form.patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        getFullName(p).toLowerCase().includes(q),
    );
  }, [patients, form.patientSearch]);

  // Calculated totals
  const calc = useMemo(() => {
    const subtotal = form.items.reduce(
      (s, it) => s + (parseFloat(it.unitPrice) || 0) * it.qty,
      0,
    );
    const discount = parseFloat(form.discount) || 0;
    return { subtotal, discount, total: Math.max(subtotal - discount, 0) };
  }, [form.items, form.discount]);

  // Installment preview
  const instPreview = useMemo(() => {
    if (form.paymentTerms !== 'installment') return [];
    const dp = parseFloat(form.downpayment) || 0;
    const months = parseInt(form.months) || 6;
    const dueDay = parseInt(form.dueDay) || 15;
    const remaining = calc.total - dp;
    if (remaining <= 0) return [];
    const monthly = remaining / months;

    const start = new Date();
    start.setDate(dueDay);
    if (start <= new Date()) start.setMonth(start.getMonth() + 1);

    return Array.from({ length: months }, (_, i) => {
      const d = addMonths(start, i);
      const isLast = i === months - 1;
      return {
        month: i + 1,
        dueDate: format(d, 'yyyy-MM-dd'),
        amount: isLast ? remaining - monthly * (months - 1) : monthly,
      };
    });
  }, [form.paymentTerms, form.downpayment, form.months, form.dueDay, calc.total]);

  // Line item CRUD
  const addItem = () =>
    setForm((p) => ({
      ...p,
      items: [...p.items, { key: lineKey(), description: '', qty: 1, unitPrice: '' }],
    }));
  const removeItem = (key: string) =>
    setForm((p) => ({ ...p, items: p.items.filter((i) => i.key !== key) }));
  const updateItem = (key: string, field: keyof LineItemForm, value: string | number) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((i) => (i.key === key ? { ...i, [field]: value } : i)),
    }));

  // Save invoice
  const handleCreate = async () => {
    const err: Record<string, string> = {};
    if (!form.patientId) err.patientId = 'Patient is required';
    if (!form.dueDate) err.dueDate = 'Due date is required';
    if (form.items.length === 0) err.items = 'At least one item is required';
    form.items.forEach((it, idx) => {
      if (!it.description.trim()) err[`desc_${idx}`] = 'Required';
      if (!it.unitPrice || parseFloat(it.unitPrice) <= 0) err[`price_${idx}`] = 'Required';
    });
    if (calc.total <= 0) err.total = 'Total must be greater than 0';
    if (form.paymentTerms === 'installment') {
      const dp = parseFloat(form.downpayment) || 0;
      if (dp < 0) err.downpayment = 'Cannot be negative';
      if (dp >= calc.total) err.downpayment = 'Must be less than total';
    }
    if (Object.keys(err).length) {
      setFormErr(err);
      return;
    }

    setSaving(true);
    try {
      const items: InvoiceItem[] = form.items.map((it) => ({
        item_id: generateId(),
        description: it.description,
        treatment_id: null,
        qty: it.qty,
        unit_price_int: pesosToCentavos(parseFloat(it.unitPrice) || 0),
        line_total_int: pesosToCentavos((parseFloat(it.unitPrice) || 0) * it.qty),
      }));
      const subtotalInt = items.reduce((s, i) => s + i.line_total_int, 0);
      const discountInt = pesosToCentavos(parseFloat(form.discount) || 0);
      const totalInt = Math.max(0, subtotalInt - discountInt);

      const invoice = await api.createInvoice({
        patient_id: parseInt(form.patientId),
        items,
        subtotal_int: subtotalInt,
        discount_int: discountInt,
        total_int: totalInt,
        payment_terms: form.paymentTerms,
        due_date: form.dueDate,
      });

      // Create installment plan if needed
      if (form.paymentTerms === 'installment') {
        const dpInt = pesosToCentavos(parseFloat(form.downpayment) || 0);
        const months = parseInt(form.months) || 6;
        const dueDay = parseInt(form.dueDay) || 15;

        const plan = await api.createInstallmentPlan({
          invoice_id: invoice.invoice_id,
          patient_id: parseInt(form.patientId),
          total_amount_int: totalInt,
          downpayment_int: dpInt,
          months,
          due_day_of_month: dueDay,
        });
        setPlansMap((prev) => ({ ...prev, [invoice.invoice_id]: plan }));
      }

      setInvoices((prev) => [...prev, invoice]);
      setPaymentsMap((prev) => ({ ...prev, [invoice.invoice_id]: [] }));
      setShowCreate(false);
      resetForm();
      toast.success('Invoice created successfully');
    } catch {
      toast.error('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RECORD PAYMENT FORM
  // ═══════════════════════════════════════════════════════════════

  const [payForm, setPayForm] = useState<RecordPaymentForm>({
    invoiceId: 0,
    amount: '',
    method: 'cash',
    referenceNo: '',
    date: todayISO(),
  });
  const [payErr, setPayErr] = useState<Record<string, string>>({});
  const [paySaving, setPaySaving] = useState(false);

  useEffect(() => {
    if (payInvoice) {
      setPayForm({
        invoiceId: payInvoice.invoice_id,
        amount: '',
        method: 'cash',
        referenceNo: '',
        date: todayISO(),
      });
      setPayErr({});
    }
  }, [payInvoice]);

  const handlePay = async () => {
    const err: Record<string, string> = {};
    const amt = parseFloat(payForm.amount);
    if (!payForm.amount || amt <= 0) err.amount = 'Amount must be greater than 0';
    if (payInvoice && amt > centavosToPesos(payInvoice.balance_int))
      err.amount = `Cannot exceed ${formatMoney(payInvoice.balance_int)}`;
    if (
      (payForm.method === 'gcash' || payForm.method === 'bank_transfer') &&
      !payForm.referenceNo.trim()
    )
      err.referenceNo = 'Reference number is required';
    if (!payForm.date) err.date = 'Date is required';
    if (Object.keys(err).length) {
      setPayErr(err);
      return;
    }

    setPaySaving(true);
    try {
      const payment = await api.createPayment({
        invoice_id: payForm.invoiceId,
        patient_id: payInvoice!.patient_id,
        amount_int: pesosToCentavos(amt),
        method: payForm.method as Payment['method'],
        reference_no: payForm.referenceNo,
        date: payForm.date,
      });

      const updatedInvoices = await api.getInvoices();
      setInvoices(updatedInvoices);
      setPaymentsMap((prev) => ({
        ...prev,
        [payForm.invoiceId]: [...(prev[payForm.invoiceId] || []), payment],
      }));
      setShowPayment(false);
      setPayInvoice(null);
      toast.success('Payment recorded successfully');
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaySaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            Manage invoices, payments, and installment plans
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="w-full sm:w-auto"
        >
          Create Invoice
        </Button>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Total Invoiced" value={formatMoney(stats.totalInvoiced)} icon={FileText} />
        <Stat
          label="Total Collected"
          value={formatMoney(stats.totalCollected)}
          icon={PhilippinePeso}
        />
        <Stat
          label="Outstanding Balance"
          value={formatMoney(stats.outstanding)}
          icon={PhilippinePeso}
        />
        <Stat
          label="Overdue Count"
          value={String(stats.overdueCount)}
          icon={AlertTriangle}
          className={stats.overdueCount > 0 ? 'border-danger-200 bg-danger-50/30' : ''}
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="space-y-3 sm:space-y-4">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: tabCounts.all },
            { key: 'due_this_week', label: 'Due', count: tabCounts.due_this_week },
            { key: 'overdue', label: 'Overdue', count: tabCounts.overdue },
            { key: 'paid', label: 'Paid', count: tabCounts.paid },
          ]}
          activeTab={activeTab}
          onTabChange={(k) => setActiveTab(k as BillingTab)}
        />
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-2 sm:gap-3">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search patient or invoice..."
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 sm:flex-none">
              <DatePicker label="From" value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="flex-1 sm:flex-none">
              <DatePicker label="To" value={dateTo} onChange={setDateTo} />
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear dates
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={PhilippinePeso}
            title="No invoices found"
            description={
              search
                ? 'Try adjusting your search or filters.'
                : 'Create your first invoice to get started.'
            }
            action={
              !search ? (
                <Button
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    resetForm();
                    setShowCreate(true);
                  }}
                >
                  Create Invoice
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th className="w-8" />
                <Th>Invoice #</Th>
                <Th>Patient</Th>
                <Th>Date</Th>
                <Th>Items</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Balance</Th>
                <Th>Terms</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((inv) => {
                const expanded = expandedRows.has(inv.invoice_id);
                const pmts = paymentsMap[inv.invoice_id] ?? [];
                const plan = plansMap[inv.invoice_id];

                return (
                  <Fragment key={inv.invoice_id}>
                    <Tr
                      className="cursor-pointer"
                      onClick={() => toggleRow(inv.invoice_id)}
                    >
                      <Td className="w-8">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </Td>
                      <Td className="font-mono text-sm font-medium">
                        {inv.invoice_no}
                      </Td>
                      <Td>{resolvePatientName(patients, inv.patient_id)}</Td>
                      <Td>{formatDate(inv.created_at)}</Td>
                      <Td>
                        <span className="text-gray-500">
                          {inv.items.length} item{inv.items.length !== 1 && 's'}
                        </span>
                      </Td>
                      <Td className="text-right font-medium">
                        {formatMoney(inv.total_int)}
                      </Td>
                      <Td className="text-right">
                        {formatMoney(inv.amount_paid_int)}
                      </Td>
                      <Td className="text-right font-medium">
                        <span
                          className={
                            inv.balance_int > 0
                              ? 'text-danger-600'
                              : 'text-success-600'
                          }
                        >
                          {formatMoney(inv.balance_int)}
                        </span>
                      </Td>
                      <Td>
                        {inv.payment_terms === 'installment' ? (
                          <Badge variant="purple">Hulugan</Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Full</span>
                        )}
                      </Td>
                      <Td>
                        <Badge variant={statusBadgeVariant(inv.status)}>
                          {statusLabel(inv.status)}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(inv.invoice_id)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {inv.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPayModal(inv)}
                              title="Record payment"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReceiptInvoice(inv)}
                            title="Print Resibo"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>

                    {/* ── Expanded details ────────────────────────── */}
                    {expanded && (
                      <Tr>
                        <Td colSpan={11} className="bg-gray-50/50 p-0">
                          <div className="px-6 py-4 space-y-4">
                            {/* Line Items */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Line Items
                              </h4>
                              <div className="rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                        Description
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">
                                        Qty
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">
                                        Unit Price
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">
                                        Total
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((it) => (
                                      <tr
                                        key={it.item_id}
                                        className="border-t border-gray-100"
                                      >
                                        <td className="px-4 py-2">
                                          {it.description}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          {it.qty}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          {formatMoney(it.unit_price_int)}
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium">
                                          {formatMoney(it.line_total_int)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="border-t border-gray-200 bg-gray-50">
                                    <tr>
                                      <td
                                        colSpan={3}
                                        className="px-4 py-2 text-right text-xs font-medium text-gray-500"
                                      >
                                        Subtotal
                                      </td>
                                      <td className="px-4 py-2 text-right font-medium">
                                        {formatMoney(inv.subtotal_int)}
                                      </td>
                                    </tr>
                                    {inv.discount_int > 0 && (
                                      <tr>
                                        <td
                                          colSpan={3}
                                          className="px-4 py-2 text-right text-xs font-medium text-gray-500"
                                        >
                                          Discount
                                        </td>
                                        <td className="px-4 py-2 text-right text-danger-600">
                                          -{formatMoney(inv.discount_int)}
                                        </td>
                                      </tr>
                                    )}
                                    <tr className="font-bold">
                                      <td
                                        colSpan={3}
                                        className="px-4 py-2 text-right text-sm"
                                      >
                                        Total
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatMoney(inv.total_int)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {/* Payment History */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Payment History
                              </h4>
                              {pmts.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">
                                  No payments recorded yet.
                                </p>
                              ) : (
                                <div className="rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          Date
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">
                                          Amount
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          Method
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          Reference
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pmts.map((pm) => (
                                        <tr
                                          key={pm.payment_id}
                                          className="border-t border-gray-100"
                                        >
                                          <td className="px-4 py-2">
                                            {formatDate(pm.date)}
                                          </td>
                                          <td className="px-4 py-2 text-right font-medium text-success-600">
                                            {formatMoney(pm.amount_int)}
                                          </td>
                                          <td className="px-4 py-2 capitalize">
                                            {pm.method.replace('_', ' ')}
                                          </td>
                                          <td className="px-4 py-2 font-mono text-xs">
                                            {pm.reference_no || '--'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Installment Schedule */}
                            {plan && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  Installment Schedule (Hulugan)
                                </h4>
                                <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
                                  <span>
                                    Downpayment:{' '}
                                    <strong className="text-gray-700">
                                      {formatMoney(plan.downpayment_int)}
                                    </strong>
                                  </span>
                                  <span>
                                    Months:{' '}
                                    <strong className="text-gray-700">
                                      {plan.months}
                                    </strong>
                                  </span>
                                  <span>
                                    Due Day:{' '}
                                    <strong className="text-gray-700">
                                      {plan.due_day_of_month}
                                    </strong>
                                  </span>
                                </div>
                                {/* Progress */}
                                <div className="mb-3">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Progress</span>
                                    <span>
                                      {
                                        plan.schedule.filter(
                                          (s) => s.status === 'paid',
                                        ).length
                                      }
                                      /{plan.schedule.length} paid
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-success-500 transition-all"
                                      style={{
                                        width: `${
                                          (plan.schedule.filter(
                                            (s) => s.status === 'paid',
                                          ).length /
                                            plan.schedule.length) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          #
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          Due Date
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">
                                          Amount
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          Status
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                                          Paid Date
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {plan.schedule.map((s, idx) => (
                                        <tr
                                          key={s.schedule_id}
                                          className="border-t border-gray-100"
                                        >
                                          <td className="px-4 py-2">
                                            {idx + 1}
                                          </td>
                                          <td className="px-4 py-2">
                                            {formatDate(s.due_date)}
                                          </td>
                                          <td className="px-4 py-2 text-right font-medium">
                                            {formatMoney(s.amount_int)}
                                          </td>
                                          <td className="px-4 py-2">
                                            <Badge
                                              variant={
                                                s.status === 'paid'
                                                  ? 'success'
                                                  : s.status === 'overdue'
                                                    ? 'danger'
                                                    : 'warning'
                                              }
                                            >
                                              {s.status === 'paid'
                                                ? 'Paid'
                                                : s.status === 'overdue'
                                                  ? 'Overdue'
                                                  : 'Pending'}
                                            </Badge>
                                          </td>
                                          <td className="px-4 py-2 text-gray-500">
                                            {s.paid_date
                                              ? formatDate(s.paid_date)
                                              : '--'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    )}
                  </Fragment>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          CREATE INVOICE MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Invoice"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Create Invoice
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Patient autocomplete */}
          <div ref={patientDropRef}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Patient <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={
                    form.patientId
                      ? resolvePatientName(patients, parseInt(form.patientId))
                      : form.patientSearch
                  }
                  onChange={(e) => {
                    setForm((p) => ({
                      ...p,
                      patientSearch: e.target.value,
                      patientId: '',
                    }));
                    setPatientDropOpen(true);
                  }}
                  onFocus={() => setPatientDropOpen(true)}
                  className={cn(
                    'block w-full rounded-lg border bg-white py-2 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                    formErr.patientId
                      ? 'border-danger-500'
                      : 'border-gray-300',
                  )}
                />
                {form.patientId && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        patientId: '',
                        patientSearch: '',
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {patientDropOpen && !form.patientId && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredPatients.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No patients found
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <button
                        key={p.patient_id}
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            patientId: String(p.patient_id),
                            patientSearch: '',
                          }));
                          setPatientDropOpen(false);
                        }}
                      >
                        <span className="font-medium">{getShortName(p)}</span>
                        <span className="text-gray-400 text-xs">
                          #{p.patient_id}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {formErr.patientId && (
              <p className="mt-1 text-xs text-danger-500">
                {formErr.patientId}
              </p>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Line Items <span className="text-danger-500">*</span>
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addItem}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Item
              </Button>
            </div>
            {formErr.items && (
              <p className="mb-2 text-xs text-danger-500">{formErr.items}</p>
            )}
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={it.key} className="flex flex-wrap sm:flex-nowrap items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="Description / Service"
                      value={it.description}
                      onChange={(e) =>
                        updateItem(it.key, 'description', e.target.value)
                      }
                      error={formErr[`desc_${idx}`]}
                    />
                  </div>
                  <div className="w-16 sm:w-20">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={it.qty}
                      onChange={(e) =>
                        updateItem(
                          it.key,
                          'qty',
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                    />
                  </div>
                  <div className="w-24 sm:w-32">
                    <Input
                      type="number"
                      placeholder="Price (PHP)"
                      min={0}
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateItem(it.key, 'unitPrice', e.target.value)
                      }
                      error={formErr[`price_${idx}`]}
                    />
                  </div>
                  <div className="w-28 flex items-center pt-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      {formatMoney(
                        pesosToCentavos(
                          (parseFloat(it.unitPrice) || 0) * it.qty,
                        ),
                      )}
                    </span>
                  </div>
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.key)}
                      className="mt-2 text-gray-400 hover:text-danger-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">
                {formatMoney(pesosToCentavos(calc.subtotal))}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Discount (PHP)</span>
              <div className="w-32">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-2">
              <span>Total</span>
              <span>{formatMoney(pesosToCentavos(calc.total))}</span>
            </div>
            {formErr.total && (
              <p className="text-xs text-danger-500">{formErr.total}</p>
            )}
          </div>

          {/* Payment Terms */}
          <Select
            label="Payment Terms"
            value={form.paymentTerms}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                paymentTerms: e.target.value as 'full' | 'installment',
              }))
            }
            options={[
              { value: 'full', label: 'Full Payment' },
              { value: 'installment', label: 'Installment (Hulugan)' },
            ]}
          />

          {/* Installment fields */}
          {form.paymentTerms === 'installment' && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-purple-700">
                Installment Details
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Downpayment (PHP)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.downpayment}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, downpayment: e.target.value }))
                  }
                  error={formErr.downpayment}
                />
                <Select
                  label="Number of Months"
                  value={form.months}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, months: e.target.value }))
                  }
                  options={[
                    { value: '3', label: '3 months' },
                    { value: '6', label: '6 months' },
                    { value: '9', label: '9 months' },
                    { value: '12', label: '12 months' },
                  ]}
                />
                <Select
                  label="Due Day of Month"
                  value={form.dueDay}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dueDay: e.target.value }))
                  }
                  options={Array.from({ length: 28 }, (_, i) => ({
                    value: String(i + 1),
                    label: String(i + 1),
                  }))}
                />
              </div>

              {instPreview.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">
                    Schedule Preview
                  </h5>
                  <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-semibold text-gray-500">
                            Month
                          </th>
                          <th className="px-3 py-1.5 text-left font-semibold text-gray-500">
                            Due Date
                          </th>
                          <th className="px-3 py-1.5 text-right font-semibold text-gray-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-100 bg-purple-50/50">
                          <td className="px-3 py-1.5">--</td>
                          <td className="px-3 py-1.5">Downpayment</td>
                          <td className="px-3 py-1.5 text-right font-medium">
                            {formatMoney(
                              pesosToCentavos(
                                parseFloat(form.downpayment) || 0,
                              ),
                            )}
                          </td>
                        </tr>
                        {instPreview.map((r) => (
                          <tr
                            key={r.month}
                            className="border-t border-gray-100"
                          >
                            <td className="px-3 py-1.5">{r.month}</td>
                            <td className="px-3 py-1.5">
                              {formatDate(r.dueDate)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium">
                              {formatMoney(pesosToCentavos(r.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Due Date */}
          <DatePicker
            label="Due Date"
            value={form.dueDate}
            onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))}
            error={formErr.dueDate}
          />
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          RECORD PAYMENT MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showPayment}
        onClose={() => {
          setShowPayment(false);
          setPayInvoice(null);
        }}
        title="Record Payment"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowPayment(false);
                setPayInvoice(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePay} loading={paySaving}>
              Record Payment
            </Button>
          </>
        }
      >
        {payInvoice && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice</span>
                <span className="font-mono font-medium">
                  {payInvoice.invoice_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Patient</span>
                <span>
                  {resolvePatientName(patients, payInvoice.patient_id)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">
                  {formatMoney(payInvoice.total_int)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid</span>
                <span className="text-success-600">
                  {formatMoney(payInvoice.amount_paid_int)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-2">
                <span>Remaining</span>
                <span className="text-danger-600">
                  {formatMoney(payInvoice.balance_int)}
                </span>
              </div>
            </div>

            <Input
              label="Amount (PHP)"
              type="number"
              min={0}
              step="0.01"
              placeholder={`Max: ${centavosToPesos(payInvoice.balance_int).toFixed(2)}`}
              value={payForm.amount}
              onChange={(e) =>
                setPayForm((p) => ({ ...p, amount: e.target.value }))
              }
              error={payErr.amount}
            />
            <Select
              label="Payment Method"
              value={payForm.method}
              onChange={(e) =>
                setPayForm((p) => ({ ...p, method: e.target.value }))
              }
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'gcash', label: 'GCash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'card', label: 'Card' },
              ]}
            />
            {(payForm.method === 'gcash' ||
              payForm.method === 'bank_transfer' ||
              payForm.method === 'card') && (
              <Input
                label={`Reference Number${payForm.method !== 'card' ? ' *' : ''}`}
                value={payForm.referenceNo}
                onChange={(e) =>
                  setPayForm((p) => ({ ...p, referenceNo: e.target.value }))
                }
                placeholder="e.g. GC-12345"
                error={payErr.referenceNo}
              />
            )}
            <DatePicker
              label="Payment Date"
              value={payForm.date}
              onChange={(v) => setPayForm((p) => ({ ...p, date: v }))}
              error={payErr.date}
            />
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          RECEIPT (RESIBO) MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={receiptInvoice !== null}
        onClose={() => setReceiptInvoice(null)}
        title="Official Receipt / Resibo"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceiptInvoice(null)}>
              Close
            </Button>
            <Button
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </>
        }
      >
        {receiptInvoice && (
          <div className="print-receipt">
            <div className="border border-gray-300 rounded-lg p-6 space-y-5 bg-white">
              {/* Header */}
              <div className="text-center border-b border-gray-200 pb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Ava Smart Dental
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Your clinic address goes here — set it in Settings.
                </p>
                <p className="text-sm text-gray-500">
                  Contact: (your contact number) | hello@avasmartdental.ph
                </p>
                <div className="mt-3">
                  <span className="inline-block rounded border-2 border-gray-800 px-4 py-1 text-sm font-bold tracking-widest text-gray-800">
                    OFFICIAL RECEIPT / RESIBO
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Patient:</span>{' '}
                  <span className="font-medium">
                    {resolvePatientName(
                      patients,
                      receiptInvoice.patient_id,
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">Invoice #:</span>{' '}
                  <span className="font-mono font-medium">
                    {receiptInvoice.invoice_no}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Date Issued:</span>{' '}
                  <span>{formatDate(receiptInvoice.created_at)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">Due Date:</span>{' '}
                  <span>{formatDate(receiptInvoice.due_date)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold">
                        Description
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptInvoice.items.map((it) => (
                      <tr key={it.item_id} className="border-t border-gray-200">
                        <td className="px-4 py-2">{it.description}</td>
                        <td className="px-4 py-2 text-center">{it.qty}</td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(it.unit_price_int)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(it.line_total_int)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>{formatMoney(receiptInvoice.subtotal_int)}</span>
                  </div>
                  {receiptInvoice.discount_int > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount:</span>
                      <span className="text-danger-600">
                        -{formatMoney(receiptInvoice.discount_int)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-base">
                    <span>Grand Total:</span>
                    <span>{formatMoney(receiptInvoice.total_int)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Paid:</span>
                    <span className="text-success-600 font-medium">
                      {formatMoney(receiptInvoice.amount_paid_int)}
                    </span>
                  </div>
                  {receiptInvoice.balance_int > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Balance:</span>
                      <span className="text-danger-600 font-medium">
                        {formatMoney(receiptInvoice.balance_int)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment details */}
              {(paymentsMap[receiptInvoice.invoice_id] ?? []).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                    Payment Details
                  </h4>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {(paymentsMap[receiptInvoice.invoice_id] ?? []).map(
                      (pm) => (
                        <div
                          key={pm.payment_id}
                          className="flex justify-between"
                        >
                          <span>
                            {formatDate(pm.date)} via{' '}
                            {pm.method.replace('_', ' ')}
                            {pm.reference_no
                              ? ` (Ref: ${pm.reference_no})`
                              : ''}
                          </span>
                          <span className="font-medium">
                            {formatMoney(pm.amount_int)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {receiptInvoice.payment_terms === 'installment' && (
                <div className="rounded border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-700">
                  Payment Terms: Installment (Hulugan)
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 text-center">
                <p className="text-xs text-gray-500 italic">
                  This serves as your official receipt. Thank you for choosing
                  Ava Smart Dental.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-receipt, .print-receipt * { visibility: visible !important; }
          .print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
