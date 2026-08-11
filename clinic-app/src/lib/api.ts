import type {
  Patient,
  Dentist,
  MedicalHistory,
  ConsentForm,
  ToothRecord,
  DentalChart,
  TreatmentRecord,
  Invoice,
  InstallmentPlan,
  InstallmentScheduleItem,
  Payment,
  Appointment,
  FileAsset,
  ServiceItem,
  PaymentTermOption,
  ClinicSettings,
  ClinicBilling,
  Drug,
  Prescription,
  Expense,
  ExpenseCategory,
} from '@/types/models';

import { generateInvoiceNo, nowISO } from '@/lib/utils';
import { supabase } from './supabase';

// ════════════════════════════════════════════════════════════════════
//  Backward-compatible type exports (used by GlobalSearch & TopBar)
// ════════════════════════════════════════════════════════════════════

export type SearchResultItem = {
  id: number;
  type: 'patient' | 'invoice' | 'appointment';
  title: string;
  subtitle: string;
  url: string;
};

export type SearchResults = {
  patients: SearchResultItem[];
  invoices: SearchResultItem[];
  appointments: SearchResultItem[];
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
};

// ════════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════════

/** Throw on Supabase error, otherwise return data. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** Strip seconds from "HH:mm:ss" → "HH:mm". Safe if already "HH:mm". */
function stripSeconds(time: string): string {
  if (!time) return time;
  const parts = time.split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
}

/** Fix appointment time fields coming from Supabase. */
function fixAppointmentTimes<T extends { time_start: string; time_end: string }>(row: T): T {
  return { ...row, time_start: stripSeconds(row.time_start), time_end: stripSeconds(row.time_end) };
}

/**
 * Fetch all rows for a query, paginating in chunks of 1000 to bypass
 * Supabase's default per-request row cap. Pass a factory that creates a
 * fresh query each call (so .range() can be applied without re-running
 * an already-awaited query).
 */
const SUPABASE_PAGE_SIZE = 1000;
async function fetchAll<T>(makeQuery: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await makeQuery().range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < SUPABASE_PAGE_SIZE) return out;
  }
}

/** Strip PostgREST/ILIKE special characters so user input is safe in .or() filters. */
function sanitizeIlike(s: string): string {
  return s.replace(/[\\%_,()]/g, ' ').trim();
}

// ════════════════════════════════════════════════════════════════════
//  PATIENTS
// ════════════════════════════════════════════════════════════════════

export async function getPatients(): Promise<Patient[]> {
  return fetchAll<Patient>(() => supabase.from('patients').select('*'));
}

export async function getPatient(id: number): Promise<Patient | undefined> {
  const { data, error } = await supabase.from('patients').select('*').eq('patient_id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? undefined;
}

export async function createPatient(
  data: Omit<Patient, 'patient_id' | 'created_at' | 'updated_at'>,
): Promise<Patient> {
  const now = nowISO();
  const row = { ...data, created_at: now, updated_at: now };
  const result = await supabase.from('patients').insert(row).select('*').single();
  return unwrap<Patient>(result);
}

export async function updatePatient(
  id: number,
  data: Partial<Patient>,
): Promise<Patient> {
  const { patient_id: _pid, ...rest } = data as Record<string, unknown>;
  const result = await supabase
    .from('patients')
    .update({ ...rest, updated_at: nowISO() })
    .eq('patient_id', id)
    .select('*')
    .single();
  return unwrap<Patient>(result);
}

export async function deletePatient(id: number): Promise<void> {
  const { error } = await supabase.from('patients').delete().eq('patient_id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  MEDICAL HISTORY
// ════════════════════════════════════════════════════════════════════

export async function getMedicalHistory(
  patientId: number,
): Promise<MedicalHistory | undefined> {
  const { data, error } = await supabase
    .from('medical_histories')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? undefined;
}

export async function saveMedicalHistory(
  data: MedicalHistory,
): Promise<MedicalHistory> {
  const row = { ...data, updated_at: nowISO() };
  const result = await supabase
    .from('medical_histories')
    .upsert(row, { onConflict: 'patient_id' })
    .select('*')
    .single();
  return unwrap<MedicalHistory>(result);
}

// ════════════════════════════════════════════════════════════════════
//  CONSENT FORM
// ════════════════════════════════════════════════════════════════════

export async function getConsentForm(
  patientId: number,
): Promise<ConsentForm | undefined> {
  const { data, error } = await supabase
    .from('consent_forms')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? undefined;
}

export async function saveConsentForm(
  data: ConsentForm,
): Promise<ConsentForm> {
  if (data.consent_id) {
    const result = await supabase
      .from('consent_forms')
      .update(data)
      .eq('consent_id', data.consent_id)
      .select('*')
      .single();
    return unwrap<ConsentForm>(result);
  }
  const { consent_id: _cid, ...rest } = data;
  const result = await supabase.from('consent_forms').insert(rest).select('*').single();
  return unwrap<ConsentForm>(result);
}

// ════════════════════════════════════════════════════════════════════
//  DENTAL CHART
// ════════════════════════════════════════════════════════════════════

async function assembleChart(chartRow: { chart_id: number; patient_id: number; date: string; updated_at: string }): Promise<DentalChart> {
  const teeth = await fetchAll<ToothRecord>(() =>
    supabase
      .from('tooth_records')
      .select('tooth_number, conditions, notes, updated_at')
      .eq('chart_id', chartRow.chart_id),
  );
  return {
    chart_id: chartRow.chart_id,
    patient_id: chartRow.patient_id,
    date: chartRow.date,
    teeth,
    updated_at: chartRow.updated_at,
  };
}

export async function getDentalChart(
  patientId: number,
): Promise<DentalChart | undefined> {
  const { data, error } = await supabase
    .from('dental_charts')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return assembleChart(data);
}

export async function getDentalCharts(
  patientId: number,
): Promise<DentalChart[]> {
  const data = await fetchAll<{ chart_id: number; patient_id: number; date: string; updated_at: string }>(() =>
    supabase
      .from('dental_charts')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false }),
  );
  if (data.length === 0) return [];
  return Promise.all(data.map(assembleChart));
}

export async function createDentalChart(
  patientId: number,
  date: string,
): Promise<DentalChart> {
  const result = await supabase
    .from('dental_charts')
    .insert({ patient_id: patientId, date, updated_at: nowISO() })
    .select('*')
    .single();
  const row = unwrap<{ chart_id: number; patient_id: number; date: string; updated_at: string }>(result);
  return { ...row, teeth: [] };
}

export async function updateToothRecord(
  patientId: number,
  chartId: number,
  tooth: ToothRecord,
): Promise<DentalChart> {
  let { data: chart, error: chartErr } = await supabase
    .from('dental_charts')
    .select('*')
    .eq('chart_id', chartId)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (chartErr) throw new Error(chartErr.message);

  if (!chart) {
    const result = await supabase
      .from('dental_charts')
      .insert({ patient_id: patientId, date: new Date().toISOString().split('T')[0], updated_at: nowISO() })
      .select('*')
      .single();
    chart = unwrap(result);
  }

  const now = nowISO();

  const { data: existing } = await supabase
    .from('tooth_records')
    .select('id')
    .eq('chart_id', chart.chart_id)
    .eq('tooth_number', tooth.tooth_number)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('tooth_records')
      .update({ conditions: tooth.conditions, notes: tooth.notes, updated_at: now })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('tooth_records')
      .insert({
        chart_id: chart.chart_id,
        patient_id: patientId,
        tooth_number: tooth.tooth_number,
        conditions: tooth.conditions,
        notes: tooth.notes,
        updated_at: now,
      });
  }

  await supabase.from('dental_charts').update({ updated_at: now }).eq('chart_id', chart.chart_id);

  return assembleChart({ ...chart, updated_at: now });
}

// ════════════════════════════════════════════════════════════════════
//  TREATMENTS
// ════════════════════════════════════════════════════════════════════

export async function getPatientTreatments(
  patientId: number,
): Promise<TreatmentRecord[]> {
  return fetchAll<TreatmentRecord>(() =>
    supabase.from('treatments').select('*').eq('patient_id', patientId),
  );
}

export async function getTreatments(): Promise<TreatmentRecord[]> {
  return fetchAll<TreatmentRecord>(() => supabase.from('treatments').select('*'));
}

export async function getLatestTreatmentDates(): Promise<Map<number, string>> {
  const rows = await fetchAll<{ patient_id: number; date: string }>(() =>
    supabase.from('treatments').select('patient_id, date'),
  );
  const map = new Map<number, string>();
  for (const r of rows) {
    const cur = map.get(r.patient_id);
    if (!cur || r.date > cur) map.set(r.patient_id, r.date);
  }
  return map;
}

export async function createTreatment(
  data: Omit<TreatmentRecord, 'treatment_id' | 'created_at'>,
): Promise<TreatmentRecord> {
  const row = { ...data, created_at: nowISO() };
  const result = await supabase.from('treatments').insert(row).select('*').single();
  return unwrap<TreatmentRecord>(result);
}

export async function updateTreatment(
  id: number,
  data: Partial<TreatmentRecord>,
): Promise<TreatmentRecord> {
  const { treatment_id: _tid, ...rest } = data as Record<string, unknown>;
  const result = await supabase
    .from('treatments')
    .update(rest)
    .eq('treatment_id', id)
    .select('*')
    .single();
  return unwrap<TreatmentRecord>(result);
}

export async function deleteTreatment(id: number): Promise<void> {
  const { error } = await supabase.from('treatments').delete().eq('treatment_id', id);
  if (error) throw new Error(error.message);
}

export async function createTreatmentWithPayment(data: {
  treatment: Omit<TreatmentRecord, 'treatment_id' | 'created_at'>;
  payment?: { amount_int: number; method: string; reference_no: string; date: string };
  prescription?: Omit<Prescription, 'prescription_id' | 'created_at'>;
}): Promise<{ treatment: TreatmentRecord; invoice: Invoice | null; payment: Payment | null; prescription: Prescription | null }> {
  const txResult = await supabase
    .from('treatments')
    .insert({ ...data.treatment, created_at: nowISO() })
    .select('*')
    .single();
  const treatment = unwrap<TreatmentRecord>(txResult);

  let invoice: Invoice | null = null;
  let payment: Payment | null = null;
  let prescription: Prescription | null = null;

  if (treatment.fee_charged_int > 0) {
    const invResult = await supabase
      .from('invoices')
      .insert({
        invoice_no: generateInvoiceNo(),
        patient_id: treatment.patient_id,
        subtotal_int: treatment.fee_charged_int,
        discount_int: 0,
        total_int: treatment.fee_charged_int,
        amount_paid_int: 0,
        balance_int: treatment.fee_charged_int,
        payment_terms: 'full',
        status: 'sent',
        created_at: nowISO(),
        due_date: treatment.date,
      })
      .select('*')
      .single();
    const invRow = unwrap<Record<string, unknown>>(invResult);

    const itemResult = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invRow.invoice_id,
        description: treatment.procedure_type,
        treatment_id: treatment.treatment_id,
        qty: 1,
        unit_price_int: treatment.fee_charged_int,
        line_total_int: treatment.fee_charged_int,
      })
      .select('*')
      .single();
    const item = unwrap<Record<string, unknown>>(itemResult);

    invoice = {
      ...(invRow as Omit<Invoice, 'items'>),
      items: [item as Invoice['items'][0]],
    } as Invoice;
  }

  if (data.payment && invoice && data.payment.amount_int > 0) {
    const payResult = await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.invoice_id,
        patient_id: treatment.patient_id,
        amount_int: data.payment.amount_int,
        method: data.payment.method,
        reference_no: data.payment.reference_no,
        date: data.payment.date,
        created_at: nowISO(),
      })
      .select('*')
      .single();
    payment = unwrap<Payment>(payResult);

    const newPaid = invoice.amount_paid_int + payment.amount_int;
    const newBal = Math.max(0, invoice.total_int - newPaid);
    const newStatus = newBal <= 0 ? 'paid' : 'partial';

    await supabase
      .from('invoices')
      .update({ amount_paid_int: newPaid, balance_int: newBal, status: newStatus })
      .eq('invoice_id', invoice.invoice_id);

    invoice.amount_paid_int = newPaid;
    invoice.balance_int = newBal;
    invoice.status = newStatus;

    await supabase
      .from('treatments')
      .update({ amount_paid_int: newPaid })
      .eq('treatment_id', treatment.treatment_id);
    treatment.amount_paid_int = newPaid;
  }

  if (data.prescription) {
    const rxResult = await supabase
      .from('prescriptions')
      .insert({
        ...data.prescription,
        treatment_id: treatment.treatment_id,
        created_at: nowISO(),
      })
      .select('*')
      .single();
    prescription = unwrap<Prescription>(rxResult);
  }

  return { treatment, invoice, payment, prescription };
}

export async function recordTreatmentPayment(data: {
  treatment_id: number;
  patient_id: number;
  amount_int: number;
  method: string;
  reference_no: string;
  date: string;
}): Promise<{ payment: Payment; treatment: TreatmentRecord; invoice: Invoice }> {
  const txResult = await supabase
    .from('treatments')
    .select('*')
    .eq('treatment_id', data.treatment_id)
    .single();
  const treatment = unwrap<TreatmentRecord>(txResult);

  const { data: existingItems } = await supabase
    .from('invoice_items')
    .select('invoice_id')
    .eq('treatment_id', data.treatment_id)
    .limit(1)
    .maybeSingle();

  let invoice: Invoice;

  if (existingItems) {
    invoice = await fetchInvoiceWithItems(existingItems.invoice_id);
  } else {
    const invResult = await supabase
      .from('invoices')
      .insert({
        invoice_no: generateInvoiceNo(),
        patient_id: data.patient_id,
        subtotal_int: treatment.fee_charged_int,
        discount_int: 0,
        total_int: treatment.fee_charged_int,
        amount_paid_int: treatment.amount_paid_int,
        balance_int: treatment.fee_charged_int - treatment.amount_paid_int,
        payment_terms: 'full',
        status: treatment.amount_paid_int > 0 ? 'partial' : 'sent',
        created_at: nowISO(),
        due_date: treatment.date,
      })
      .select('*')
      .single();
    const invRow = unwrap<Record<string, unknown>>(invResult);

    const itemResult = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invRow.invoice_id,
        description: treatment.procedure_type,
        treatment_id: treatment.treatment_id,
        qty: 1,
        unit_price_int: treatment.fee_charged_int,
        line_total_int: treatment.fee_charged_int,
      })
      .select('*')
      .single();
    const item = unwrap<Record<string, unknown>>(itemResult);

    invoice = {
      ...(invRow as Omit<Invoice, 'items'>),
      items: [item as Invoice['items'][0]],
    } as Invoice;
  }

  const payResult = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.invoice_id,
      patient_id: data.patient_id,
      amount_int: data.amount_int,
      method: data.method,
      reference_no: data.reference_no,
      date: data.date,
      created_at: nowISO(),
    })
    .select('*')
    .single();
  const payment = unwrap<Payment>(payResult);

  const newPaid = invoice.amount_paid_int + data.amount_int;
  const newBal = Math.max(0, invoice.total_int - newPaid);
  const newStatus = newBal <= 0 ? 'paid' : newPaid > 0 ? 'partial' : invoice.status;

  await supabase
    .from('invoices')
    .update({ amount_paid_int: newPaid, balance_int: newBal, status: newStatus })
    .eq('invoice_id', invoice.invoice_id);

  invoice.amount_paid_int = newPaid;
  invoice.balance_int = newBal;
  invoice.status = newStatus;

  const newTxPaid = (treatment.amount_paid_int || 0) + data.amount_int;
  await supabase
    .from('treatments')
    .update({ amount_paid_int: newTxPaid })
    .eq('treatment_id', treatment.treatment_id);
  treatment.amount_paid_int = newTxPaid;

  return { payment, treatment, invoice };
}

// ════════════════════════════════════════════════════════════════════
//  INVOICES
// ════════════════════════════════════════════════════════════════════

async function fetchInvoiceWithItems(invoiceId: number): Promise<Invoice> {
  const invResult = await supabase.from('invoices').select('*').eq('invoice_id', invoiceId).single();
  const invRow = unwrap<Record<string, unknown>>(invResult);
  const items = await fetchAll<Invoice['items'][0]>(() =>
    supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId),
  );
  return { ...(invRow as Omit<Invoice, 'items'>), items } as Invoice;
}

async function fetchInvoicesWithItems(rows: Record<string, unknown>[]): Promise<Invoice[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.invoice_id as number);
  const allItems = await fetchAll<Record<string, unknown>>(() =>
    supabase.from('invoice_items').select('*').in('invoice_id', ids),
  );

  const itemsByInvoice = new Map<number, unknown[]>();
  for (const item of allItems) {
    const invId = item.invoice_id as number;
    if (!itemsByInvoice.has(invId)) itemsByInvoice.set(invId, []);
    itemsByInvoice.get(invId)!.push(item);
  }

  return rows.map((row) => ({
    ...(row as Omit<Invoice, 'items'>),
    items: (itemsByInvoice.get(row.invoice_id as number) ?? []) as Invoice['items'],
  })) as Invoice[];
}

export async function getInvoices(): Promise<Invoice[]> {
  const data = await fetchAll<Record<string, unknown>>(() => supabase.from('invoices').select('*'));
  return fetchInvoicesWithItems(data);
}

export async function getPatientInvoices(
  patientId: number,
): Promise<Invoice[]> {
  const data = await fetchAll<Record<string, unknown>>(() =>
    supabase.from('invoices').select('*').eq('patient_id', patientId),
  );
  return fetchInvoicesWithItems(data);
}

export async function createInvoice(
  data: Omit<
    Invoice,
    | 'invoice_id'
    | 'invoice_no'
    | 'created_at'
    | 'amount_paid_int'
    | 'balance_int'
    | 'status'
  >,
): Promise<Invoice> {
  const { items, ...rest } = data;
  const invResult = await supabase
    .from('invoices')
    .insert({
      ...rest,
      invoice_no: generateInvoiceNo(),
      amount_paid_int: 0,
      balance_int: rest.total_int,
      status: 'sent',
      created_at: nowISO(),
    })
    .select('*')
    .single();
  const invRow = unwrap<Record<string, unknown>>(invResult);
  const invoiceId = invRow.invoice_id as number;

  let insertedItems: unknown[] = [];
  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      invoice_id: invoiceId,
      description: item.description,
      treatment_id: item.treatment_id,
      qty: item.qty,
      unit_price_int: item.unit_price_int,
      line_total_int: item.line_total_int,
    }));
    const { data: iData, error: iErr } = await supabase.from('invoice_items').insert(itemRows).select('*');
    if (iErr) throw new Error(iErr.message);
    insertedItems = iData ?? [];
  }

  return {
    ...(invRow as Omit<Invoice, 'items'>),
    items: insertedItems as Invoice['items'],
  } as Invoice;
}

// ════════════════════════════════════════════════════════════════════
//  INSTALLMENT PLANS
// ════════════════════════════════════════════════════════════════════

export async function getInstallmentPlan(
  invoiceId: number,
): Promise<InstallmentPlan | undefined> {
  const { data: planRow, error } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('invoice_id', invoiceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!planRow) return undefined;

  const schedule = await fetchAll<InstallmentScheduleItem>(() =>
    supabase
      .from('installment_schedule')
      .select('*')
      .eq('plan_id', planRow.plan_id)
      .order('due_date', { ascending: true }),
  );

  return {
    ...(planRow as Omit<InstallmentPlan, 'schedule'>),
    schedule,
  } as InstallmentPlan;
}

export async function createInstallmentPlan(
  data: Omit<InstallmentPlan, 'plan_id' | 'schedule'> & {
    schedule?: InstallmentScheduleItem[];
  },
): Promise<InstallmentPlan> {
  let schedule: Omit<InstallmentScheduleItem, 'schedule_id'>[] = [];
  if (data.schedule && data.schedule.length > 0) {
    schedule = data.schedule.map(({ schedule_id: _sid, ...rest }) => rest);
  } else {
    const balanceAfterDown = data.total_amount_int - data.downpayment_int;
    const monthlyAmount = Math.floor(balanceAfterDown / data.months);
    const remainder = balanceAfterDown - monthlyAmount * data.months;

    for (let i = 0; i < data.months; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      dueDate.setDate(data.due_day_of_month);

      const isLast = i === data.months - 1;
      schedule.push({
        due_date: dueDate.toISOString().split('T')[0],
        amount_int: isLast ? monthlyAmount + remainder : monthlyAmount,
        status: 'pending',
        paid_date: null,
      });
    }
  }

  const { schedule: _s, ...planFields } = data;
  const planResult = await supabase
    .from('installment_plans')
    .insert(planFields)
    .select('*')
    .single();
  const planRow = unwrap<Record<string, unknown>>(planResult);
  const planId = planRow.plan_id as number;

  const schedRows = schedule.map((item) => ({ ...item, plan_id: planId }));
  const { data: insertedSched, error: schedErr } = await supabase
    .from('installment_schedule')
    .insert(schedRows)
    .select('*');
  if (schedErr) throw new Error(schedErr.message);

  return {
    ...(planRow as Omit<InstallmentPlan, 'schedule'>),
    schedule: (insertedSched ?? []) as InstallmentScheduleItem[],
  } as InstallmentPlan;
}

// ════════════════════════════════════════════════════════════════════
//  PAYMENTS
// ════════════════════════════════════════════════════════════════════

export async function getInvoicePayments(
  invoiceId: number,
): Promise<Payment[]> {
  return fetchAll<Payment>(() =>
    supabase.from('payments').select('*').eq('invoice_id', invoiceId),
  );
}

export async function getPatientPayments(
  patientId: number,
): Promise<Payment[]> {
  return fetchAll<Payment>(() =>
    supabase.from('payments').select('*').eq('patient_id', patientId),
  );
}

export async function getPayments(): Promise<Payment[]> {
  return fetchAll<Payment>(() => supabase.from('payments').select('*'));
}

export async function createPayment(
  data: Omit<Payment, 'payment_id' | 'created_at'>,
): Promise<Payment> {
  const payResult = await supabase
    .from('payments')
    .insert({ ...data, created_at: nowISO() })
    .select('*')
    .single();
  const newPayment = unwrap<Payment>(payResult);

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_id', data.invoice_id)
    .single();

  if (invoice) {
    const newAmountPaid = (invoice.amount_paid_int as number) + data.amount_int;
    const newBalance = (invoice.total_int as number) - newAmountPaid;

    let newStatus = invoice.status as string;
    if (newBalance <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    await supabase
      .from('invoices')
      .update({
        amount_paid_int: newAmountPaid,
        balance_int: Math.max(0, newBalance),
        status: newStatus,
      })
      .eq('invoice_id', data.invoice_id);
  }

  return newPayment;
}

// ════════════════════════════════════════════════════════════════════
//  APPOINTMENTS
// ════════════════════════════════════════════════════════════════════

export async function getAppointments(): Promise<Appointment[]> {
  const data = await fetchAll<Appointment>(() => supabase.from('appointments').select('*'));
  return data.map(fixAppointmentTimes);
}

export async function getPatientAppointments(
  patientId: number,
): Promise<Appointment[]> {
  const data = await fetchAll<Appointment>(() =>
    supabase.from('appointments').select('*').eq('patient_id', patientId),
  );
  return data.map(fixAppointmentTimes);
}

export async function createAppointment(
  data: Omit<Appointment, 'appointment_id' | 'created_at'>,
): Promise<Appointment> {
  const result = await supabase
    .from('appointments')
    .insert({ ...data, created_at: nowISO() })
    .select('*')
    .single();
  return fixAppointmentTimes(unwrap<Appointment>(result));
}

export async function updateAppointment(
  id: number,
  data: Partial<Appointment>,
): Promise<Appointment> {
  const { appointment_id: _aid, ...rest } = data as Record<string, unknown>;
  const result = await supabase
    .from('appointments')
    .update(rest)
    .eq('appointment_id', id)
    .select('*')
    .single();
  return fixAppointmentTimes(unwrap<Appointment>(result));
}

export async function deleteAppointment(id: number): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('appointment_id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  FILES
// ════════════════════════════════════════════════════════════════════

export async function getPatientFiles(
  patientId: number,
): Promise<FileAsset[]> {
  return fetchAll<FileAsset>(() =>
    supabase.from('file_assets').select('*').eq('patient_id', patientId),
  );
}

export async function uploadFile(
  data: Omit<FileAsset, 'file_id' | 'uploaded_at'>,
): Promise<FileAsset> {
  const result = await supabase
    .from('file_assets')
    .insert({ ...data, uploaded_at: nowISO() })
    .select('*')
    .single();
  return unwrap<FileAsset>(result);
}

// ── Tooth photos (per-tooth photo history for the dental chart) ────

export async function getToothPhotos(
  patientId: number,
  toothNumber: number,
): Promise<FileAsset[]> {
  return fetchAll<FileAsset>(() =>
    supabase
      .from('file_assets')
      .select('*')
      .eq('patient_id', patientId)
      .eq('tooth_number', toothNumber)
      .order('uploaded_at', { ascending: false }),
  );
}

export async function addToothPhoto(data: {
  patient_id: number;
  tooth_number: number;
  file_url: string;
  notes?: string;
}): Promise<FileAsset> {
  const now = nowISO();
  const fileName = `tooth-${data.tooth_number}-${now.slice(0, 10)}.jpg`;
  const result = await supabase
    .from('file_assets')
    .insert({
      patient_id: data.patient_id,
      tooth_number: data.tooth_number,
      file_name: fileName,
      file_type: 'image/jpeg',
      file_url: data.file_url,
      category: 'photo',
      notes: data.notes ?? '',
      uploaded_at: now,
    })
    .select('*')
    .single();
  return unwrap<FileAsset>(result);
}

export async function deleteFile(fileId: number): Promise<void> {
  const { error } = await supabase.from('file_assets').delete().eq('file_id', fileId);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  SETTINGS / DENTISTS / SERVICES / PAYMENT TERMS
// ════════════════════════════════════════════════════════════════════

export async function getClinicSettings(): Promise<ClinicSettings> {
  // RLS scopes clinic_settings to the signed-in user's clinic, so the
  // select returns at most one row and we don't need an explicit filter.
  const { data: settingsRow, error: sErr } = await supabase
    .from('clinic_settings')
    .select('*')
    .single();
  if (sErr) throw new Error(sErr.message);

  const [dentists, services, payment_terms] = await Promise.all([
    fetchAll<Dentist>(() => supabase.from('dentists').select('*')),
    fetchAll<ServiceItem>(() => supabase.from('services').select('*')),
    fetchAll<PaymentTermOption>(() => supabase.from('payment_terms').select('*')),
  ]);

  return {
    clinic_name: settingsRow.clinic_name,
    address: settingsRow.address,
    phone: settingsRow.phone,
    email: settingsRow.email,
    logo: settingsRow.logo,
    // Default 56px matches the legacy hard-coded value, used until the
    // migration-005 column lands.
    logo_size_px: typeof settingsRow.logo_size_px === 'number' ? settingsRow.logo_size_px : 56,
    // 'left' is the legacy layout (logo left + text right). Falls back to it
    // when migration-006 hasn't been applied yet.
    logo_align:
      settingsRow.logo_align === 'center' || settingsRow.logo_align === 'right'
        ? settingsRow.logo_align
        : 'left',
    // Continuous position. Falls back to logo_align mapping if migration-007
    // hasn't been applied: left→0, center→50, right→100.
    logo_pos_x_pct:
      typeof settingsRow.logo_pos_x_pct === 'number'
        ? settingsRow.logo_pos_x_pct
        : settingsRow.logo_align === 'center'
          ? 50
          : settingsRow.logo_align === 'right'
            ? 100
            : 0,
    logo_pos_y_px: typeof settingsRow.logo_pos_y_px === 'number' ? settingsRow.logo_pos_y_px : 0,
    dentists,
    services,
    payment_terms,
  };
}

/**
 * Fetches the billing/subscription row for the signed-in owner. Billing is
 * ACCOUNT-level (Phase B): RLS on public.accounts scopes the SELECT to the
 * owner's one account, so no explicit filter is needed. The Account-details
 * card also shows the active clinic's name, fetched separately below — the
 * custom fetch scopes that `clinics` read to the x-clinic-id (active) clinic.
 */
export async function getClinicBilling(): Promise<ClinicBilling | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select(
      'id, tier, trial_end, paid_until, subscription_status, cancel_at_period_end, created_at, billing_period, billing_plans!inner(display_name, monthly_centavos, annual_centavos)'
    )
    .maybeSingle();
  if (error || !data) return null;
  // Active clinic name for the "Clinic name" field. Scoped to the active clinic
  // by the x-clinic-id header; limit(1) keeps it single even mid-switch.
  const { data: clinicRow } = await supabase.from('clinics').select('name').limit(1).maybeSingle();
  const plan = Array.isArray(data.billing_plans) ? data.billing_plans[0] : data.billing_plans;
  return {
    id: data.id,
    name: clinicRow?.name ?? '',
    plan: data.tier,
    trial_end: data.trial_end,
    paid_until: data.paid_until,
    subscription_status: data.subscription_status,
    cancel_at_period_end: data.cancel_at_period_end ?? false,
    created_at: data.created_at,
    billing_period: data.billing_period,
    planLabel: plan.display_name,
    planMonthlyCentavos: plan.monthly_centavos,
    planAnnualCentavos: plan.annual_centavos,
  } as ClinicBilling;
}

/**
 * Toggles "cancel at period end" for the signed-in owner's account via the
 * set-subscription-cancel edge function (service-role there — direct owner
 * UPDATE on accounts is RLS-locked). `cancel: false` resumes.
 */
export async function setSubscriptionCancel(cancel: boolean): Promise<void> {
  const { error } = await supabase.functions.invoke('set-subscription-cancel', {
    body: { cancel },
  });
  if (error) throw new Error(error.message);
}

export async function updateClinicSettings(
  data: Partial<Omit<ClinicSettings, 'dentists' | 'services' | 'payment_terms'>>,
): Promise<void> {
  // RLS scopes the update to the signed-in user's clinic_settings row.
  // The `not.is.null` filter is just to satisfy Supabase's "no-filter
  // update" guard; clinic_id is NOT NULL on every row by schema.
  const { error } = await supabase
    .from('clinic_settings')
    .update(data)
    .not('clinic_id', 'is', null);
  if (error) throw new Error(error.message);
}

export async function getDentists(): Promise<Dentist[]> {
  return fetchAll<Dentist>(() => supabase.from('dentists').select('*'));
}

export async function createDentist(
  data: Omit<Dentist, 'dentist_id'>,
): Promise<Dentist> {
  const result = await supabase.from('dentists').insert(data).select('*').single();
  return unwrap<Dentist>(result);
}

export async function updateDentist(
  id: number,
  data: Partial<Omit<Dentist, 'dentist_id'>>,
): Promise<Dentist> {
  const result = await supabase
    .from('dentists')
    .update(data)
    .eq('dentist_id', id)
    .select('*')
    .single();
  return unwrap<Dentist>(result);
}

export async function deleteDentist(id: number): Promise<void> {
  // .select() forces PostgREST to return the affected rows so we can detect
  // silent failures (RLS blocking, ID not found, etc.) instead of treating an
  // empty success response as a successful delete.
  const { data, error } = await supabase
    .from('dentists')
    .delete()
    .eq('dentist_id', id)
    .select('dentist_id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Delete did not affect any rows. This dentist may be referenced by existing records, or your database policy blocked it.');
  }
}

export async function getServices(): Promise<ServiceItem[]> {
  return fetchAll<ServiceItem>(() => supabase.from('services').select('*'));
}

export async function createService(
  data: Omit<ServiceItem, 'service_id'>,
): Promise<ServiceItem> {
  const result = await supabase.from('services').insert(data).select('*').single();
  return unwrap<ServiceItem>(result);
}

export async function updateService(
  id: number,
  data: Partial<Omit<ServiceItem, 'service_id'>>,
): Promise<ServiceItem> {
  const result = await supabase
    .from('services')
    .update(data)
    .eq('service_id', id)
    .select('*')
    .single();
  return unwrap<ServiceItem>(result);
}

export async function deleteService(id: number): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('service_id', id);
  if (error) throw new Error(error.message);
}

export async function getPaymentTerms(): Promise<PaymentTermOption[]> {
  return fetchAll<PaymentTermOption>(() => supabase.from('payment_terms').select('*'));
}

export async function createPaymentTerm(
  data: Omit<PaymentTermOption, 'term_id'>,
): Promise<PaymentTermOption> {
  const result = await supabase.from('payment_terms').insert(data).select('*').single();
  return unwrap<PaymentTermOption>(result);
}

export async function updatePaymentTerm(
  id: number,
  data: Partial<Omit<PaymentTermOption, 'term_id'>>,
): Promise<PaymentTermOption> {
  const result = await supabase
    .from('payment_terms')
    .update(data)
    .eq('term_id', id)
    .select('*')
    .single();
  return unwrap<PaymentTermOption>(result);
}

export async function deletePaymentTerm(id: number): Promise<void> {
  const { error } = await supabase.from('payment_terms').delete().eq('term_id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  DRUGS (Catalog)
// ════════════════════════════════════════════════════════════════════

export async function getDrugs(): Promise<Drug[]> {
  return fetchAll<Drug>(() => supabase.from('drugs').select('*'));
}

export async function createDrug(
  data: Omit<Drug, 'drug_id'>,
): Promise<Drug> {
  const result = await supabase.from('drugs').insert(data).select('*').single();
  return unwrap<Drug>(result);
}

export async function updateDrug(
  id: number,
  data: Partial<Drug>,
): Promise<Drug> {
  const { drug_id: _did, ...rest } = data as Record<string, unknown>;
  const result = await supabase.from('drugs').update(rest).eq('drug_id', id).select('*').single();
  return unwrap<Drug>(result);
}

export async function deleteDrug(id: number): Promise<void> {
  const { error } = await supabase.from('drugs').delete().eq('drug_id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ════════════════════════════════════════════════════════════════════

export async function getPatientPrescriptions(
  patientId: number,
): Promise<Prescription[]> {
  return fetchAll<Prescription>(() =>
    supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false }),
  );
}

export async function createPrescription(
  data: Omit<Prescription, 'prescription_id' | 'created_at'>,
): Promise<Prescription> {
  const result = await supabase
    .from('prescriptions')
    .insert({ ...data, created_at: nowISO() })
    .select('*')
    .single();
  return unwrap<Prescription>(result);
}

export async function updatePrescription(
  id: number,
  data: Partial<Omit<Prescription, 'prescription_id' | 'created_at'>>,
): Promise<Prescription> {
  const result = await supabase
    .from('prescriptions')
    .update(data)
    .eq('prescription_id', id)
    .select('*')
    .single();
  return unwrap<Prescription>(result);
}

export async function deletePrescription(id: number): Promise<void> {
  const { error } = await supabase.from('prescriptions').delete().eq('prescription_id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  EXPENSES
// ════════════════════════════════════════════════════════════════════

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return fetchAll<ExpenseCategory>(() =>
    supabase.from('expense_categories').select('*').order('name'),
  );
}

export async function createExpenseCategory(
  data: Omit<ExpenseCategory, 'category_id' | 'created_at'>,
): Promise<ExpenseCategory> {
  const result = await supabase.from('expense_categories').insert(data).select('*').single();
  return unwrap<ExpenseCategory>(result);
}

export async function updateExpenseCategory(
  id: number,
  data: Partial<Omit<ExpenseCategory, 'category_id' | 'created_at'>>,
): Promise<ExpenseCategory> {
  const result = await supabase
    .from('expense_categories')
    .update(data)
    .eq('category_id', id)
    .select('*')
    .single();
  return unwrap<ExpenseCategory>(result);
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  const { error } = await supabase.from('expense_categories').delete().eq('category_id', id);
  if (error) throw new Error(error.message);
}

export async function getExpenses(): Promise<Expense[]> {
  return fetchAll<Expense>(() =>
    supabase.from('expenses').select('*').order('date', { ascending: false }),
  );
}

export async function createExpense(
  data: Omit<Expense, 'expense_id' | 'created_at'>,
): Promise<Expense> {
  const result = await supabase.from('expenses').insert(data).select('*').single();
  return unwrap<Expense>(result);
}

export async function updateExpense(
  id: number,
  data: Partial<Omit<Expense, 'expense_id' | 'created_at'>>,
): Promise<Expense> {
  const result = await supabase
    .from('expenses')
    .update(data)
    .eq('expense_id', id)
    .select('*')
    .single();
  return unwrap<Expense>(result);
}

export async function deleteExpense(id: number): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('expense_id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════
//  CLINICS (branches)
// ════════════════════════════════════════════════════════════════════

/**
 * Lists the signed-in account's clinics (branches). Unlike every other
 * tenant-scoped read in this file, this does NOT depend on the
 * `x-clinic-id` header — `clinics` has an owner-scoped SELECT policy
 * (`auth.uid() = owner_user_id`), so it always returns every clinic the
 * account owns regardless of which one is currently active. That's what
 * makes it safe to call before an active clinic has been chosen.
 */
export async function getClinics(): Promise<{ id: string; name: string }[]> {
  return fetchAll<{ id: string; name: string }>(() =>
    supabase.from('clinics').select('id, name').order('name'),
  );
}

// ════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════

export async function fetchNotifications(): Promise<NotificationItem[]> {
  return fetchAll<NotificationItem>(() =>
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
  );
}

let _notificationsCache: NotificationItem[] = [];

/**
 * Synchronous accessor kept for backward compatibility. Returns the
 * last-known cache and fires a background refresh. Components that need
 * fresh data should call `fetchNotifications()` and manage state directly.
 */
export function getNotifications(): NotificationItem[] {
  fetchNotifications().then((rows) => {
    _notificationsCache = rows;
  }).catch(() => { /* silent */ });
  return _notificationsCache;
}

// ════════════════════════════════════════════════════════════════════
//  GLOBAL SEARCH
// ════════════════════════════════════════════════════════════════════

export async function globalSearch(
  query: string,
): Promise<SearchResults> {
  const q = sanitizeIlike(query.toLowerCase());

  if (!q) {
    return { patients: [], invoices: [], appointments: [] };
  }

  const pattern = `%${q}%`;

  const matchedPatients = await fetchAll<Record<string, unknown>>(() =>
    supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},middle_name.ilike.${pattern},mobile_number.ilike.${pattern},email.ilike.${pattern}`),
  );

  const matchedPatientIds = new Set(matchedPatients.map((p) => p.patient_id as number));

  const invoicesByNo = await fetchAll<Record<string, unknown>>(() =>
    supabase.from('invoices').select('*').ilike('invoice_no', pattern),
  );

  let invoicesByPatient: Record<string, unknown>[] = [];
  if (matchedPatientIds.size > 0) {
    invoicesByPatient = await fetchAll<Record<string, unknown>>(() =>
      supabase.from('invoices').select('*').in('patient_id', Array.from(matchedPatientIds)),
    );
  }

  const invoiceMap = new Map<number, Record<string, unknown>>();
  for (const inv of [...invoicesByNo, ...invoicesByPatient]) {
    invoiceMap.set(inv.invoice_id as number, inv);
  }
  const allMatchedInvoices = Array.from(invoiceMap.values());

  const apptsByText = await fetchAll<Record<string, unknown>>(() =>
    supabase.from('appointments').select('*').or(`notes.ilike.${pattern},date.ilike.${pattern}`),
  );

  let apptsByPatient: Record<string, unknown>[] = [];
  if (matchedPatientIds.size > 0) {
    apptsByPatient = await fetchAll<Record<string, unknown>>(() =>
      supabase.from('appointments').select('*').in('patient_id', Array.from(matchedPatientIds)),
    );
  }

  const apptMap = new Map<number, Record<string, unknown>>();
  for (const a of [...apptsByText, ...apptsByPatient]) {
    apptMap.set(a.appointment_id as number, a);
  }
  const allMatchedAppointments = Array.from(apptMap.values());

  const allPatientIds = new Set<number>();
  for (const inv of allMatchedInvoices) allPatientIds.add(inv.patient_id as number);
  for (const a of allMatchedAppointments) allPatientIds.add(a.patient_id as number);
  for (const p of matchedPatients) allPatientIds.add(p.patient_id as number);

  const patientLookup = new Map<number, Record<string, unknown>>();
  if (allPatientIds.size > 0) {
    const lookupRows = await fetchAll<Record<string, unknown>>(() =>
      supabase
        .from('patients')
        .select('patient_id, first_name, last_name, sex, mobile_number')
        .in('patient_id', Array.from(allPatientIds)),
    );
    for (const p of lookupRows) {
      patientLookup.set(p.patient_id as number, p);
    }
  }

  const patientResults: SearchResultItem[] = matchedPatients.map((p) => ({
    id: p.patient_id as number,
    type: 'patient' as const,
    title: `${p.first_name} ${p.last_name}`,
    subtitle: `${p.sex === 'male' ? 'Male' : 'Female'}, ${p.mobile_number}`,
    url: `/patients/${p.patient_id}`,
  }));

  const invoiceResults: SearchResultItem[] = allMatchedInvoices.map((inv) => {
    const patient = patientLookup.get(inv.patient_id as number);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
    const pesos = ((inv.total_int as number) / 100).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
    });
    return {
      id: inv.invoice_id as number,
      type: 'invoice' as const,
      title: inv.invoice_no as string,
      subtitle: `${patientName} - PHP ${pesos}`,
      url: '/billing',
    };
  });

  const appointmentResults: SearchResultItem[] = allMatchedAppointments.map((a) => {
    const patient = patientLookup.get(a.patient_id as number);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
    return {
      id: a.appointment_id as number,
      type: 'appointment' as const,
      title: `${(a.notes as string) || 'Appointment'} - ${patientName}`,
      subtitle: `${a.date} at ${stripSeconds(a.time_start as string)}`,
      url: '/appointments',
    };
  });

  return {
    patients: patientResults,
    invoices: invoiceResults,
    appointments: appointmentResults,
  };
}

// ════════════════════════════════════════════════════════════════════
//  UNIFIED API OBJECT (backward-compatible named export)
// ════════════════════════════════════════════════════════════════════

export const api = {
  // Patients
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  // Medical History
  getMedicalHistory,
  saveMedicalHistory,
  // Consent
  getConsentForm,
  saveConsentForm,
  // Dental Chart
  getDentalChart,
  getDentalCharts,
  createDentalChart,
  updateToothRecord,
  // Treatments
  getPatientTreatments,
  getTreatments,
  getLatestTreatmentDates,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  createTreatmentWithPayment,
  recordTreatmentPayment,
  // Invoices
  getInvoices,
  getPatientInvoices,
  createInvoice,
  // Installments
  getInstallmentPlan,
  createInstallmentPlan,
  // Payments
  getInvoicePayments,
  getPatientPayments,
  getPayments,
  createPayment,
  // Appointments
  getAppointments,
  getPatientAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  // Files
  getPatientFiles,
  uploadFile,
  getToothPhotos,
  addToothPhoto,
  deleteFile,
  // Settings
  getClinicSettings,
  updateClinicSettings,
  getClinicBilling,
  setSubscriptionCancel,
  getDentists,
  createDentist,
  updateDentist,
  deleteDentist,
  getServices,
  createService,
  updateService,
  deleteService,
  getPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  // Drugs
  getDrugs,
  createDrug,
  updateDrug,
  deleteDrug,
  // Prescriptions
  getPatientPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
  // Expenses
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  // Clinics
  getClinics,
  // Notifications
  getNotifications,
  fetchNotifications,
  // Search
  globalSearch,
};
