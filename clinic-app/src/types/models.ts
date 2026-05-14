import { z } from 'zod';

// ─── Patient ───────────────────────────────────────────────────────
export const PatientSchema = z.object({
  patient_id: z.number().int(),
  patient_photo: z.string().nullable(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  middle_name: z.string().default(''),
  sex: z.enum(['male', 'female']),
  birthdate: z.string(), // YYYY-MM-DD
  mobile_number: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email().or(z.literal('')),
  address_street: z.string().default(''),
  address_barangay: z.string().default(''),
  address_city: z.string().default(''),
  address_province: z.string().default(''),
  occupation: z.string().default(''),
  religion: z.string().default(''),
  emergency_contact_name: z.string().default(''),
  emergency_contact_number: z.string().default(''),
  insurance_provider: z.string().default(''),
  notes: z.string().default(''),
  tags: z.array(z.string()),
  recall_date: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Patient = z.infer<typeof PatientSchema>;

// ─── Dentist ───────────────────────────────────────────────────────
export const DentistSchema = z.object({
  dentist_id: z.number().int(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  specialization: z.string(),
  license_no: z.string(),
  photo: z.string().nullable(),
  is_active: z.boolean(),
});
export type Dentist = z.infer<typeof DentistSchema>;

// ─── Medical History ───────────────────────────────────────────────
export const MedicalHistorySchema = z.object({
  patient_id: z.number().int(),
  allergies: z.string().default(''),
  current_medications: z.string().default(''),
  physician_name: z.string().default(''),
  physician_contact: z.string().default(''),
  conditions: z.record(z.string(), z.boolean()),
  other_conditions: z.string().default(''),
  is_pregnant: z.boolean().default(false),
  is_nursing: z.boolean().default(false),
  blood_type: z.string().default(''),
  updated_at: z.string(),
});
export type MedicalHistory = z.infer<typeof MedicalHistorySchema>;

// ─── Consent Form ──────────────────────────────────────────────────
export const ConsentFormSchema = z.object({
  consent_id: z.number().int(),
  patient_id: z.number().int(),
  consented: z.boolean(),
  consent_date: z.string(),
  signatory_name: z.string(),
  relationship: z.string().default('Self'),
  notes: z.string().default(''),
});
export type ConsentForm = z.infer<typeof ConsentFormSchema>;

// ─── Tooth / Dental Chart ──────────────────────────────────────────
export const TOOTH_CONDITIONS = [
  // Condition
  'present', 'caries', 'missing', 'composite_filling', 'temporary_filling',
  'root_fragment', 'impacted',
  // Restoration & Prosthetics
  'jacket_crown', 'amalgam', 'abutment', 'pontic', 'inlay',
  'removable_denture',
  // Surgery
  'extraction',
  'congenitally_missing', 'supernumerary',
] as const;
export type ToothCondition = string;

export const ToothRecordSchema = z.object({
  tooth_number: z.number().int().min(11).max(85),
  conditions: z.array(z.string()),
  notes: z.string().default(''),
  updated_at: z.string(),
});
export type ToothRecord = z.infer<typeof ToothRecordSchema>;

export type DentalChart = {
  chart_id: number;
  patient_id: number;
  date: string;
  teeth: ToothRecord[];
  updated_at: string;
};

// ─── Treatment Record ──────────────────────────────────────────────
export const TreatmentStatusEnum = z.enum(['planned', 'in_progress', 'done']);
export type TreatmentStatus = z.infer<typeof TreatmentStatusEnum>;

export const TreatmentRecordSchema = z.object({
  treatment_id: z.number().int(),
  patient_id: z.number().int(),
  date: z.string(),
  tooth_numbers: z.array(z.number().int()),
  procedure_type: z.string().min(1, 'Procedure is required'),
  dentist_id: z.number().int(),
  fee_charged_int: z.number().int().min(0, 'Fee cannot be negative'),
  amount_paid_int: z.number().int().min(0),
  notes: z.string().default(''),
  status: TreatmentStatusEnum,
  next_appointment: z.string().nullable(),
  created_at: z.string(),
});
export type TreatmentRecord = z.infer<typeof TreatmentRecordSchema>;

// ─── Invoice ───────────────────────────────────────────────────────
export const InvoiceItemSchema = z.object({
  item_id: z.number().int(),
  description: z.string().min(1),
  treatment_id: z.number().int().nullable(),
  qty: z.number().int().min(1),
  unit_price_int: z.number().int().min(0),
  line_total_int: z.number().int().min(0),
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceStatusEnum = z.enum(['draft', 'sent', 'partial', 'paid', 'overdue']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const InvoiceSchema = z.object({
  invoice_id: z.number().int(),
  invoice_no: z.string(),
  patient_id: z.number().int(),
  items: z.array(InvoiceItemSchema),
  subtotal_int: z.number().int().min(0),
  discount_int: z.number().int().min(0),
  total_int: z.number().int().min(0),
  amount_paid_int: z.number().int().min(0),
  balance_int: z.number().int(),
  payment_terms: z.enum(['full', 'installment']),
  status: InvoiceStatusEnum,
  created_at: z.string(),
  due_date: z.string(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// ─── Installment Plan ──────────────────────────────────────────────
export const InstallmentScheduleItemSchema = z.object({
  schedule_id: z.number().int(),
  due_date: z.string(),
  amount_int: z.number().int().min(0),
  status: z.enum(['pending', 'paid', 'overdue']),
  paid_date: z.string().nullable(),
});
export type InstallmentScheduleItem = z.infer<typeof InstallmentScheduleItemSchema>;

export const InstallmentPlanSchema = z.object({
  plan_id: z.number().int(),
  invoice_id: z.number().int(),
  patient_id: z.number().int(),
  total_amount_int: z.number().int().min(0),
  downpayment_int: z.number().int().min(0),
  months: z.number().int().min(1),
  due_day_of_month: z.number().int().min(1).max(28),
  schedule: z.array(InstallmentScheduleItemSchema),
});
export type InstallmentPlan = z.infer<typeof InstallmentPlanSchema>;

// ─── Payment ───────────────────────────────────────────────────────
export const PaymentMethodEnum = z.enum(['cash', 'gcash', 'bank_transfer', 'card']);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentSchema = z.object({
  payment_id: z.number().int(),
  invoice_id: z.number().int(),
  patient_id: z.number().int(),
  amount_int: z.number().int().min(1, 'Amount must be greater than 0'),
  method: PaymentMethodEnum,
  reference_no: z.string().default(''),
  date: z.string(),
  created_at: z.string(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// ─── Appointment ───────────────────────────────────────────────────
export const AppointmentStatusEnum = z.enum(['scheduled', 'confirmed', 'done', 'no_show', 'cancelled']);
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

export const AppointmentSchema = z.object({
  appointment_id: z.number().int(),
  patient_id: z.number().int(),
  dentist_id: z.number().int(),
  treatment_id: z.number().int().nullable(),
  date: z.string(),
  time_start: z.string(), // HH:mm
  time_end: z.string(),
  status: AppointmentStatusEnum,
  notes: z.string().default(''),
  created_at: z.string(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

// ─── File Asset ────────────────────────────────────────────────────
export const FileAssetSchema = z.object({
  file_id: z.number().int(),
  patient_id: z.number().int(),
  tooth_number: z.number().int().nullable().optional(),
  file_name: z.string(),
  file_type: z.string(),
  file_url: z.string(),
  category: z.enum(['xray', 'document', 'photo', 'other']),
  uploaded_at: z.string(),
  notes: z.string().default(''),
});
export type FileAsset = z.infer<typeof FileAssetSchema>;

// ─── Drug (Catalog) ──────────────────────────────────────────────
export const DrugSchema = z.object({
  drug_id: z.number().int(),
  generic_name: z.string().min(1, 'Generic name is required'),
  brand_name: z.string().default(''),
  form: z.string(), // tablet, capsule, syrup, mouthwash, etc.
  strength: z.string(), // e.g. "500mg", "150mg/cap"
  is_active: z.boolean(),
});
export type Drug = z.infer<typeof DrugSchema>;

// ─── Prescription ────────────────────────────────────────────────
export const RxItemSchema = z.object({
  drug_name: z.string().min(1),
  dosage: z.string().default(''),
  quantity: z.number().int().min(1),
  sig: z.string().default(''), // directions e.g. "1 cap 3x a day for 7 days"
});
export type RxItem = z.infer<typeof RxItemSchema>;

export const PrescriptionSchema = z.object({
  prescription_id: z.number().int(),
  patient_id: z.number().int(),
  dentist_id: z.number().int(),
  treatment_id: z.number().int().nullable().default(null),
  date: z.string(),
  items: z.array(RxItemSchema),
  notes: z.string().default(''),
  created_at: z.string(),
});
export type Prescription = z.infer<typeof PrescriptionSchema>;

// ─── Expenses ──────────────────────────────────────────────────────
export const ExpenseCategorySchema = z.object({
  category_id: z.number().int(),
  name: z.string().min(1),
  color: z.string().default('#6366f1'),
  created_at: z.string(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const ExpenseSchema = z.object({
  expense_id: z.number().int(),
  category_id: z.number().int().nullable(),
  date: z.string(),
  amount_int: z.number().int().min(0),
  payment_method: z.string().default('cash'),
  remarks: z.string().default(''),
  created_at: z.string(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

// ─── Clinic Settings ───────────────────────────────────────────────
export const ServiceItemSchema = z.object({
  service_id: z.number().int(),
  name: z.string().min(1),
  category: z.string(),
  default_price_int: z.number().int().min(0),
  description: z.string().default(''),
  is_active: z.boolean(),
});
export type ServiceItem = z.infer<typeof ServiceItemSchema>;

export const PaymentTermOptionSchema = z.object({
  term_id: z.number().int(),
  name: z.string(),
  months: z.number().int(),
  description: z.string(),
});
export type PaymentTermOption = z.infer<typeof PaymentTermOptionSchema>;

export type ClinicSettings = {
  clinic_name: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
  /** Logo size in pixels for prescription/receipt headers. Default 56. */
  logo_size_px: number;
  /** Horizontal position 0..100 (% of header width). 0 = left, 50 = center, 100 = right. */
  logo_pos_x_pct: number;
  /** Vertical lift in px above the divider line baseline. 0 = bottom-anchored. */
  logo_pos_y_px: number;
  /** Legacy alignment kept for backward compat — derived from logo_pos_x_pct now. */
  logo_align: 'left' | 'center' | 'right';
  dentists: Dentist[];
  services: ServiceItem[];
  payment_terms: PaymentTermOption[];
};

// ─── Notification ──────────────────────────────────────────────────
export type Notification = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
};
