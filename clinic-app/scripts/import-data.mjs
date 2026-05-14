// One-shot importer for legacy CSVs (Procedure, Drug Generic, Patients).
// Usage:
//   node scripts/import-data.mjs           # dry run (prints counts only)
//   node scripts/import-data.mjs --execute # actually inserts into Supabase
//
// CSV root defaults to ~/Downloads. Override with CSV_ROOT env var.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const EXECUTE = process.argv.includes('--execute');
const CSV_ROOT = process.env.CSV_ROOT || join(homedir(), 'Downloads');

// Tiny .env loader (avoids adding a dotenv dep).
function loadEnv() {
  try {
    const text = readFileSync('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // ignore
  }
}
loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
const supabase = createClient(url, key);

// CSV parser: handles quoted fields, embedded commas, doubled quotes, CRLF.
function parseCSV(text) {
  const rows = [];
  let cur = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { buf += '"'; i++; continue; }
        inQuotes = false; continue;
      }
      buf += c; continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { cur.push(buf); buf = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { cur.push(buf); rows.push(cur); cur = []; buf = ''; continue; }
    buf += c;
  }
  if (buf.length || cur.length) { cur.push(buf); rows.push(cur); }
  return rows;
}

function readCSV(filename) {
  const text = readFileSync(join(CSV_ROOT, filename), 'utf8');
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter((r) => r.some((c) => c && c.trim() !== ''))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] || '').trim(); });
      return obj;
    });
}

async function batchInsert(table, rows) {
  if (!EXECUTE) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ✗ Insert failed at row ${i}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`  Inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  process.stdout.write('\n');
}

// ─── Services (Procedure.csv) ─────────────────────────────
async function importServices() {
  console.log('\n=== Services (from Procedure.csv) ===');
  const rows = readCSV('Procedure.csv');
  console.log(`  CSV rows: ${rows.length}`);

  const { data: existing } = await supabase.from('services').select('name');
  const existingNames = new Set((existing || []).map((s) => s.name.toLowerCase()));

  const toInsert = rows
    .map((r) => ({
      name: r['Name'],
      category: 'General',
      default_price_int: 0,
      description: '',
      is_active: true,
    }))
    .filter((s) => s.name && !existingNames.has(s.name.toLowerCase()));

  console.log(`  To insert: ${toInsert.length}, skipped (duplicate/empty): ${rows.length - toInsert.length}`);
  await batchInsert('services', toInsert);
}

// ─── Drugs (Drug - Generic.csv) ───────────────────────────
async function importDrugs() {
  console.log('\n=== Drugs (from Drug - Generic.csv) ===');
  const rows = readCSV('Drug - Generic.csv');
  console.log(`  CSV rows: ${rows.length}`);

  const { data: existing } = await supabase.from('drugs').select('generic_name, brand_name');
  const existingNames = new Set(
    (existing || []).map((d) => `${d.generic_name.toLowerCase()}|${(d.brand_name || '').toLowerCase()}`),
  );

  const toInsert = rows
    .map((r) => ({
      generic_name: r['Name'],
      brand_name: '',
      form: 'Tablet',
      strength: '',
      is_active: true,
    }))
    .filter((d) => d.generic_name && !existingNames.has(`${d.generic_name.toLowerCase()}|`));

  console.log(`  To insert: ${toInsert.length}, skipped (duplicate/empty): ${rows.length - toInsert.length}`);
  await batchInsert('drugs', toInsert);
}

function isValidBirthdate(s) {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > new Date().getFullYear()) return false;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

// ─── Patients ─────────────────────────────────────────────
function adaptPatient(r) {
  const firstName = r['First Name'] || '';
  const lastNameRaw = r['Last Name'] || 'Unknown';
  const middleName = r['Middle Name'] || '';
  const suffix = r['Suffix'] || '';
  const lastName = suffix ? `${lastNameRaw} ${suffix}`.trim() : lastNameRaw;
  const birthdateRaw = r['Birthdate'] || '';
  const birthdate = isValidBirthdate(birthdateRaw) ? birthdateRaw : '1900-01-01';
  const gender = (r['Gender'] || '').toLowerCase();
  const sex = gender === 'male' ? 'male' : 'female';
  const mobile = (r['Contact Number'] || '').replace(/\D/g, '');

  const extras = [];
  if (r['Allergies']) extras.push(`Allergies: ${r['Allergies']}`);
  if (r['Indentification Number']) extras.push(`ID #: ${r['Indentification Number']}`);
  if (r['Recal Date']) extras.push(`Recall Date: ${r['Recal Date']}`);
  if (r['Medical History']) extras.push(`Medical History: ${r['Medical History']}`);
  if (birthdateRaw === '') extras.push('(birthdate missing in source export)');
  const baseNotes = r['Notes'] || '';
  const notes = [baseNotes, ...extras].filter(Boolean).join('\n');

  return {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    sex,
    birthdate,
    mobile_number: mobile,
    email: r['Email'] || '',
    address_street: r['Address'] || '',
    address_barangay: '',
    address_city: '',
    address_province: '',
    occupation: r['Profession/Job'] || '',
    religion: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    insurance_provider: '',
    notes,
    tags: [],
  };
}

async function importPatients() {
  console.log('\n=== Patients ===');
  const rows = readCSV('Patients.csv');
  console.log(`  CSV rows: ${rows.length}`);

  // Page through existing patients to dedupe (anon key is allowed via RLS).
  const existingKeys = new Set();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('patients')
      .select('mobile_number, first_name, last_name')
      .range(from, from + PAGE - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const p of data) {
      const key = `${(p.mobile_number || '').replace(/\D/g, '')}|${(p.first_name || '').toLowerCase()}|${(p.last_name || '').toLowerCase()}`;
      existingKeys.add(key);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  let skipped = 0;
  const toInsert = [];
  for (const r of rows) {
    const adapted = adaptPatient(r);
    if (!adapted.first_name.trim()) { skipped++; continue; }
    const key = `${adapted.mobile_number}|${adapted.first_name.toLowerCase()}|${adapted.last_name.toLowerCase()}`;
    if (existingKeys.has(key)) { skipped++; continue; }
    existingKeys.add(key);
    toInsert.push(adapted);
  }

  console.log(`  To insert: ${toInsert.length}, skipped (duplicate/empty): ${skipped}`);

  // Surface adapter stats for transparency.
  const missingBirthdate = rows.filter((r) => !isValidBirthdate(r['Birthdate'] || '')).length;
  const missingGender = rows.filter((r) => !['male', 'female'].includes((r['Gender'] || '').toLowerCase())).length;
  console.log(`  • ${missingBirthdate} patients have missing/invalid birthdate → set to 1900-01-01 placeholder`);
  console.log(`  • ${missingGender} patients have missing/invalid gender → defaulted to female`);

  await batchInsert('patients', toInsert);
}

// ─── Default Dentist ──────────────────────────────────────
// Legacy CSVs have no dentist column. Create/find a catch-all
// "Legacy Import" dentist so imported rows satisfy the NOT NULL FK.
async function ensureDefaultDentist() {
  const { data: existing } = await supabase
    .from('dentists')
    .select('dentist_id, first_name, last_name')
    .eq('first_name', 'Legacy')
    .eq('last_name', 'Import')
    .maybeSingle();
  if (existing) return existing.dentist_id;

  if (!EXECUTE) return -1; // pretend-id for dry run counts
  const { data, error } = await supabase
    .from('dentists')
    .insert({
      first_name: 'Legacy',
      last_name: 'Import',
      specialization: 'Imported records',
      license_no: '',
      photo: null,
      is_active: false,
    })
    .select('dentist_id')
    .single();
  if (error) { console.error(error); process.exit(1); }
  console.log(`  Created placeholder dentist "Legacy Import" (id=${data.dentist_id})`);
  return data.dentist_id;
}

// ─── Name-based patient lookup ───────────────────────────
// Build a Map keyed by normalized (first + middle + last-with-suffix) → patient_id.
// Must mirror the adapter's last-name-with-suffix concat so legacy Patient IDs
// resolve to the rows we inserted.
function nameKey(first, middle, last, suffix) {
  const norm = (s) => (s || '').trim().toLowerCase();
  const lastWithSuffix = suffix ? `${(last || '').trim()} ${suffix.trim()}`.trim() : (last || '').trim();
  return `${norm(first)}|${norm(middle)}|${norm(lastWithSuffix)}`;
}

async function buildPatientLookup() {
  const lookup = new Map();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('patients')
      .select('patient_id, first_name, middle_name, last_name')
      .range(from, from + PAGE - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const p of data) {
      const key = nameKey(p.first_name, p.middle_name, p.last_name, '');
      if (!lookup.has(key)) lookup.set(key, p.patient_id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return lookup;
}

// ─── Appointments ─────────────────────────────────────────
function parseDateTime(raw) {
  // Expect "YYYY-MM-DD HH:mm:ss"
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?$/);
  if (!m) return null;
  return { date: m[1], time: m[2] };
}

const APPT_STATUS_MAP = {
  completed: 'done',
  cancelled: 'cancelled',
  confirmed: 'confirmed',
  scheduled: 'scheduled',
  'no show': 'no_show',
  'no-show': 'no_show',
};

async function importAppointments(dentistId, patientLookup) {
  console.log('\n=== Appointments ===');
  const rows = readCSV('Appointments.csv');
  console.log(`  CSV rows: ${rows.length}`);

  // Existing appointment keys to skip duplicates.
  const existingKeys = new Set();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('appointments')
      .select('patient_id, date, time_start')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const a of data) existingKeys.add(`${a.patient_id}|${a.date}|${a.time_start}`);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  let missingPatient = 0;
  let invalidTime = 0;
  const toInsert = [];
  for (const r of rows) {
    const key = nameKey(r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']);
    const patient_id = patientLookup.get(key);
    if (!patient_id) { missingPatient++; continue; }

    const from = parseDateTime(r['Schedule (From)'] || '');
    const to = parseDateTime(r['Schedule (To)'] || '');
    if (!from || !to) { invalidTime++; continue; }

    const dupKey = `${patient_id}|${from.date}|${from.time}:00`;
    if (existingKeys.has(dupKey)) continue;
    existingKeys.add(dupKey);

    const status = APPT_STATUS_MAP[(r['Status'] || '').toLowerCase()] || 'scheduled';
    toInsert.push({
      patient_id,
      dentist_id: dentistId,
      treatment_id: null,
      date: from.date,
      time_start: from.time,
      time_end: to.time,
      status,
      notes: r['Notes'] || '',
    });
  }

  console.log(`  To insert: ${toInsert.length}`);
  console.log(`  • ${missingPatient} skipped — patient not found in DB (no matching name)`);
  console.log(`  • ${invalidTime} skipped — unparseable schedule timestamps`);

  await batchInsert('appointments', toInsert);
}

// ─── Prescriptions ────────────────────────────────────────
function loadCatalog(filename, idField, nameField) {
  const rows = readCSV(filename);
  const map = new Map();
  for (const r of rows) {
    if (r[idField]) map.set(r[idField], r[nameField]);
  }
  return map;
}

function extractQuantity(raw) {
  const m = (raw || '').match(/(\d+)/);
  return m ? Math.max(1, Number(m[1])) : 1;
}

async function importPrescriptions(dentistId, patientLookup) {
  console.log('\n=== Prescriptions ===');
  const rows = readCSV('Prescriptions.csv');
  console.log(`  CSV rows: ${rows.length} (one row per drug item)`);

  const generics = loadCatalog('Drug - Generic.csv', 'Generic ID', 'Name');
  const brands = loadCatalog('Drug - Brand.csv', 'Brand ID', 'Name');
  const forms = loadCatalog('Drug - Dosage Form.csv', 'Generic ID', 'Name'); // CSV labels id col as "Generic ID"

  // Group rows into single prescriptions keyed by patient + date.
  const groups = new Map();
  let missingPatient = 0;
  for (const r of rows) {
    const key = nameKey(r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']);
    const patient_id = patientLookup.get(key);
    if (!patient_id) { missingPatient++; continue; }

    const date = r['Prescription Date'] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const genericName = generics.get(r['Generic ID']) || 'Unknown drug';
    const brandName = brands.get(r['Brand ID']) || '';
    const formName = forms.get(r['Dosage Form ID']) || '';
    const parts = [genericName];
    if (brandName) parts.push(`(${brandName})`);
    if (formName) parts.push(formName);

    const sigPieces = [];
    if (r['Dosage / Frequency']) sigPieces.push(r['Dosage / Frequency']);
    if (r['Duration (days)']) sigPieces.push(`for ${r['Duration (days)']}`);

    const item = {
      drug_name: parts.join(' '),
      dosage: formName,
      quantity: extractQuantity(r['Quantity']),
      sig: sigPieces.join(' ').trim(),
    };

    const gkey = `${patient_id}|${date}|${r['Instructions'] || ''}`;
    if (!groups.has(gkey)) {
      groups.set(gkey, {
        patient_id,
        dentist_id: dentistId,
        treatment_id: null,
        date,
        items: [],
        notes: r['Instructions'] || '',
      });
    }
    groups.get(gkey).items.push(item);
  }

  // Dedupe against existing prescriptions by (patient_id, date).
  const existingKeys = new Set();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('prescriptions')
      .select('patient_id, date')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const p of data) existingKeys.add(`${p.patient_id}|${p.date}`);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const toInsert = [];
  for (const [, g] of groups) {
    if (existingKeys.has(`${g.patient_id}|${g.date}`)) continue;
    toInsert.push(g);
  }

  console.log(`  Grouped into ${groups.size} prescriptions; ${toInsert.length} new`);
  console.log(`  • ${missingPatient} rows skipped — patient not found in DB`);

  await batchInsert('prescriptions', toInsert);
}

// ─── Treatments (Treament Plans + Treament Plan Procedures) ──
async function importTreatments(dentistId, patientLookup) {
  console.log('\n=== Treatments (from Treament Plans + Procedures) ===');
  const planRows = readCSV('Treament Plans.csv');
  const procRows = readCSV('Treament Plan Procedures.csv');
  const procedureCatalog = loadCatalog('Procedure.csv', 'Procedure ID', 'Name');
  console.log(`  Plan rows: ${planRows.length}, Procedure rows: ${procRows.length}, Procedure catalog: ${procedureCatalog.size}`);

  // Plan ID → { date, name, notes } map (first occurrence wins)
  const planMap = new Map();
  for (const p of planRows) {
    const id = p['Treament Plan ID'];
    if (id && !planMap.has(id)) {
      planMap.set(id, {
        date: p['Treatment Date'] || '',
        name: p['Treatment Name'] || '',
        notes: p['Treatment Notes'] || '',
      });
    }
  }

  // Build set of already-imported (patient_id, plan_id) pairs from existing
  // treatment notes, so re-runs are idempotent.
  const importedPlans = new Set();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('treatments')
      .select('patient_id, notes')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const t of data) {
      const matches = (t.notes || '').matchAll(/\[plan #(\d+)\]/g);
      for (const m of matches) importedPlans.add(`${t.patient_id}|${m[1]}`);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  let missingPatient = 0;
  let missingPlan = 0;
  let invalidDate = 0;
  const toInsert = [];
  for (const r of procRows) {
    const key = nameKey(r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']);
    const patient_id = patientLookup.get(key);
    if (!patient_id) { missingPatient++; continue; }

    const planId = r['Treament Plan ID'];
    const plan = planMap.get(planId);
    if (!plan) { missingPlan++; continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.date)) { invalidDate++; continue; }

    if (importedPlans.has(`${patient_id}|${planId}`)) continue;

    const procName = procedureCatalog.get(r['Procedure Plan ID']) || r['Remarks'] || 'Unknown procedure';
    const amount = Number(r['Procedure Amount']) || 0;
    const qty = Math.max(1, Number(r['Quantity']) || 1);
    const fee = Math.round(amount * qty * 100); // pesos → centavos

    const noteParts = [`[plan #${planId}]`];
    if (plan.name) noteParts.push(plan.name);
    if (plan.notes) noteParts.push(plan.notes);
    if (r['Remarks'] && r['Remarks'] !== procName) noteParts.push(`Remarks: ${r['Remarks']}`);

    toInsert.push({
      patient_id,
      date: plan.date,
      tooth_numbers: [],
      procedure_type: procName,
      dentist_id: dentistId,
      fee_charged_int: fee,
      amount_paid_int: 0,
      notes: noteParts.join(' | '),
      status: 'done',
      next_appointment: null,
    });
  }

  console.log(`  To insert: ${toInsert.length}`);
  console.log(`  • ${missingPatient} skipped — patient not found`);
  console.log(`  • ${missingPlan} skipped — plan not in Treament Plans.csv`);
  console.log(`  • ${invalidDate} skipped — invalid plan date`);

  await batchInsert('treatments', toInsert);
}

// ─── Payments (Payments.csv → invoices, Payment Installment.csv → payments) ──
const METHOD_NAME_MAP = {
  cash: 'cash',
  'credit card': 'card',
  card: 'card',
  'bank transfer': 'bank_transfer',
  cheque: 'bank_transfer',
  insurance: 'cash',
  gcash: 'gcash',
};

function mapMethod(name) {
  return METHOD_NAME_MAP[(name || '').trim().toLowerCase()] || 'cash';
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function importPaymentsAndInvoices(patientLookup) {
  console.log('\n=== Invoices + Payments (legacy) ===');
  const payRows = readCSV('Payments.csv');
  const instRows = readCSV('Payment Installment.csv');
  const methodCatalog = loadCatalog('Payment Method.csv', 'Payment Method ID', 'Name');
  console.log(`  Payments.csv rows: ${payRows.length}, Installment rows: ${instRows.length}`);

  // Existing invoices keyed by invoice_no, so re-runs skip already-imported.
  const existingInvoices = new Map(); // invoice_no → invoice_id
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_id, invoice_no')
      .like('invoice_no', 'LEGACY-%')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const r of data) existingInvoices.set(r.invoice_no, r.invoice_id);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Build invoice rows (one per Payments.csv row, dedup against existing).
  const invoicesToInsert = [];
  const invoiceNoByPaymentId = new Map(); // legacy Payment ID → invoice_no
  const patientByPaymentId = new Map();
  let payMissingPatient = 0;
  for (const r of payRows) {
    const key = nameKey(r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']);
    const patient_id = patientLookup.get(key);
    if (!patient_id) { payMissingPatient++; continue; }

    const paymentId = r['Payment ID'];
    if (!paymentId) continue;
    const invoiceNo = `LEGACY-${paymentId}`;
    invoiceNoByPaymentId.set(paymentId, invoiceNo);
    patientByPaymentId.set(paymentId, patient_id);
    if (existingInvoices.has(invoiceNo)) continue;

    const date = r['Payment Date'] || todayISO();
    const total = Math.round(Number(r['Total Payments'] || r['Amount'] || 0) * 100);
    const balance = Math.round(Number(r['Balance'] || 0) * 100);
    const paid = Math.max(0, total - balance);

    invoicesToInsert.push({
      invoice_no: invoiceNo,
      patient_id,
      subtotal_int: total,
      discount_int: 0,
      total_int: total,
      amount_paid_int: paid,
      balance_int: balance,
      payment_terms: 'full',
      status: balance > 0 ? 'partial' : (total > 0 ? 'paid' : 'draft'),
      due_date: addDays(date, 30),
    });
  }

  console.log(`  Invoices to insert: ${invoicesToInsert.length} (skipping ${existingInvoices.size} already imported)`);
  console.log(`  • ${payMissingPatient} payment rows skipped — patient not found`);

  // Insert invoices in chunks, capturing returned invoice_ids.
  if (EXECUTE && invoicesToInsert.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < invoicesToInsert.length; i += CHUNK) {
      const chunk = invoicesToInsert.slice(i, i + CHUNK);
      const { data, error } = await supabase.from('invoices').insert(chunk).select('invoice_id, invoice_no');
      if (error) { console.error('  ✗ Invoice insert failed:', error.message); process.exit(1); }
      for (const r of data) existingInvoices.set(r.invoice_no, r.invoice_id);
      process.stdout.write(`  Invoices ${Math.min(i + CHUNK, invoicesToInsert.length)}/${invoicesToInsert.length}\r`);
    }
    process.stdout.write('\n');
  } else {
    // Dry-run: stub invoice IDs so we can still count payments.
    let stubId = -1;
    for (const inv of invoicesToInsert) {
      if (!existingInvoices.has(inv.invoice_no)) existingInvoices.set(inv.invoice_no, stubId--);
    }
  }

  // Existing payments keyed by reference_no for idempotency.
  const existingPaymentRefs = new Set();
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('payments')
      .select('reference_no')
      .like('reference_no', 'legacy-inst-%')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const r of data) existingPaymentRefs.add(r.reference_no);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Build payments rows from Payment Installment.csv.
  const paymentsToInsert = [];
  let instMissingInvoice = 0;
  let instInvalidDate = 0;
  let instSeq = 0;
  for (const r of instRows) {
    const paymentId = r['Payment ID'];
    const invoiceNo = invoiceNoByPaymentId.get(paymentId);
    const invoice_id = invoiceNo ? existingInvoices.get(invoiceNo) : null;
    const patient_id = patientByPaymentId.get(paymentId);
    if (!invoice_id || !patient_id) { instMissingInvoice++; continue; }

    const date = r['Payment Date'] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { instInvalidDate++; continue; }

    const amount = Math.round(Number(r['Amount'] || 0) * 100);
    const methodName = methodCatalog.get(r['Payment Method']) || '';
    const method = mapMethod(methodName);

    instSeq++;
    const reference_no = `legacy-inst-${paymentId}-${instSeq}`;
    if (existingPaymentRefs.has(reference_no)) continue;

    paymentsToInsert.push({
      invoice_id,
      patient_id,
      amount_int: amount,
      method,
      reference_no,
      date,
    });
  }

  console.log(`  Payments to insert: ${paymentsToInsert.length}`);
  console.log(`  • ${instMissingInvoice} installments skipped — no parent invoice (patient not found earlier)`);
  console.log(`  • ${instInvalidDate} installments skipped — invalid date`);

  await batchInsert('payments', paymentsToInsert);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Expenses + Categories ───────────────────────────────
const COLOR_NAME_HEX = {
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  green: '#10b981',
  blue: '#2563eb',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  gray: '#9ca3af',
  grey: '#9ca3af',
};

function normalizeColor(raw) {
  if (!raw) return '#6366f1';
  const v = raw.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v.toLowerCase()}`;
  return COLOR_NAME_HEX[v.toLowerCase()] || '#6366f1';
}

// ─── Backfill: Recall Date from notes for legacy patients ─────
async function backfillRecallDates() {
  console.log('\n=== Backfill: Recall Date on legacy patients ===');

  // Probe column existence first.
  const probe = await supabase.from('patients').select('recall_date').limit(1);
  if (probe.error) {
    console.log('  ⚠ recall_date column missing.');
    console.log('    Run supabase/migration-003-recall-date.sql in the Supabase SQL Editor first.');
    return;
  }

  // Page through patients that still have a "Recall Date:" stamp in their notes
  // and an empty recall_date column.
  const candidates = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('patients')
      .select('patient_id, notes, recall_date')
      .ilike('notes', '%Recall Date:%')
      .is('recall_date', null)
      .range(from, from + PAGE - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const p of data) {
      const m = (p.notes || '').match(/Recall Date:\s*(\S+)/);
      if (!m) continue;
      const raw = m[1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
      candidates.push({ patient_id: p.patient_id, recall_date: raw });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`  Patients with parseable Recall Date: ${candidates.length}`);
  if (!EXECUTE) return;

  for (const c of candidates) {
    const { error } = await supabase
      .from('patients')
      .update({ recall_date: c.recall_date })
      .eq('patient_id', c.patient_id);
    if (error) { console.error(`  ✗ Update failed for patient ${c.patient_id}:`, error.message); }
  }
  console.log(`  Backfilled ${candidates.length} recall dates`);
}

async function importExpenses() {
  console.log('\n=== Expense Categories + Expenses ===');

  // First check the new tables exist (helpful error if user forgot migration).
  const probe = await supabase.from('expense_categories').select('category_id').limit(1);
  if (probe.error) {
    console.log('  ⚠ expense_categories table not found.');
    console.log('    Run supabase/migration-002-expenses.sql in the Supabase SQL Editor first.');
    return;
  }

  const catRows = readCSV('Expense Category.csv');
  const expRows = readCSV('Expenses.csv');
  console.log(`  Category CSV rows: ${catRows.length}, Expense CSV rows: ${expRows.length}`);

  // Existing categories by name to dedupe.
  const { data: existingCats } = await supabase.from('expense_categories').select('category_id, name');
  const catByName = new Map((existingCats || []).map((c) => [c.name.toLowerCase(), c.category_id]));

  const catsToInsert = catRows
    .map((r) => ({ name: r['Name'], color: normalizeColor(r['Color']) }))
    .filter((c) => c.name && !catByName.has(c.name.toLowerCase()));

  console.log(`  Categories to insert: ${catsToInsert.length}`);
  if (EXECUTE && catsToInsert.length > 0) {
    const { data, error } = await supabase.from('expense_categories').insert(catsToInsert).select('category_id, name');
    if (error) { console.error(error); process.exit(1); }
    for (const r of data) catByName.set(r.name.toLowerCase(), r.category_id);
  }

  // Build legacy Category ID → new category_id map by name. Each row keeps its Category ID; lookup by name from CSV → new id.
  const legacyToNewCatId = new Map();
  for (const r of catRows) {
    const newId = catByName.get((r['Name'] || '').toLowerCase());
    if (newId) legacyToNewCatId.set(r['Category ID'], newId);
  }

  // Existing expenses by (date, amount_int, remarks) for idempotency.
  const { data: existingExp } = await supabase
    .from('expenses')
    .select('date, amount_int, remarks');
  const existingExpKeys = new Set(
    (existingExp || []).map((e) => `${e.date}|${e.amount_int}|${e.remarks}`),
  );

  const expsToInsert = [];
  for (const r of expRows) {
    const date = r['Payment Date'] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const amount = Math.round(Number(r['Amount'] || 0) * 100);
    const remarks = r['Remarks'] || '';
    const key = `${date}|${amount}|${remarks}`;
    if (existingExpKeys.has(key)) continue;

    expsToInsert.push({
      category_id: legacyToNewCatId.get(r['Category ID']) || null,
      date,
      amount_int: amount,
      payment_method: (r['Payment Method'] || 'cash').toLowerCase() || 'cash',
      remarks,
    });
  }

  console.log(`  Expenses to insert: ${expsToInsert.length}`);
  await batchInsert('expenses', expsToInsert);
}



// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('Smart Dental — Legacy CSV Import');
  console.log('=================================');
  console.log(`Mode      : ${EXECUTE ? 'EXECUTE (writes to Supabase)' : 'DRY RUN (no changes)'}`);
  console.log(`Supabase  : ${url}`);
  console.log(`CSV root  : ${CSV_ROOT}`);

  await importServices();
  await importDrugs();
  await importPatients();

  console.log('\n=== Default Dentist ===');
  const dentistId = await ensureDefaultDentist();
  console.log(`  Using dentist_id=${dentistId}`);

  console.log('\n=== Building patient lookup ===');
  const patientLookup = await buildPatientLookup();
  console.log(`  Loaded ${patientLookup.size} patients for name-based lookup`);

  await importAppointments(dentistId, patientLookup);
  await importPrescriptions(dentistId, patientLookup);
  await importTreatments(dentistId, patientLookup);
  await importPaymentsAndInvoices(patientLookup);
  await importExpenses();
  await backfillRecallDates();

  console.log('\nDone.');
  if (!EXECUTE) console.log('Re-run with --execute to actually insert.');
}

main().catch((err) => { console.error(err); process.exit(1); });
