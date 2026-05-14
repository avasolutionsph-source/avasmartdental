-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL CLINIC — Supabase Database Migration
-- Run this in Supabase SQL Editor (supabase.com > your project > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. DENTISTS ──────────────────────────────────────────────────
create table if not exists dentists (
  dentist_id    bigint generated always as identity primary key,
  first_name    text not null,
  last_name     text not null,
  specialization text not null default 'General Dentistry',
  license_no    text not null default '',
  photo         text,          -- base64 or URL
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── 2. PATIENTS ──────────────────────────────────────────────────
create table if not exists patients (
  patient_id              bigint generated always as identity primary key,
  patient_photo           text,
  first_name              text not null,
  last_name               text not null,
  middle_name             text not null default '',
  sex                     text not null check (sex in ('male','female')),
  birthdate               date not null,
  mobile_number           text not null default '',
  email                   text not null default '',
  address_street          text not null default '',
  address_barangay        text not null default '',
  address_city            text not null default '',
  address_province        text not null default '',
  occupation              text not null default '',
  religion                text not null default '',
  emergency_contact_name  text not null default '',
  emergency_contact_number text not null default '',
  insurance_provider      text not null default '',
  notes                   text not null default '',
  tags                    text[] not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ─── 3. MEDICAL HISTORY ──────────────────────────────────────────
create table if not exists medical_histories (
  patient_id         bigint primary key references patients(patient_id) on delete cascade,
  allergies          text not null default '',
  current_medications text not null default '',
  physician_name     text not null default '',
  physician_contact  text not null default '',
  conditions         jsonb not null default '{}',   -- { "hypertension": true, "diabetes": false, ... }
  other_conditions   text not null default '',
  is_pregnant        boolean not null default false,
  is_nursing         boolean not null default false,
  blood_type         text not null default '',
  updated_at         timestamptz not null default now()
);

-- ─── 4. CONSENT FORMS ────────────────────────────────────────────
create table if not exists consent_forms (
  consent_id       bigint generated always as identity primary key,
  patient_id       bigint not null references patients(patient_id) on delete cascade,
  consented        boolean not null default false,
  consent_date     date not null default current_date,
  signatory_name   text not null default '',
  relationship     text not null default 'Self',
  notes            text not null default ''
);

-- ─── 5. DENTAL CHARTS ────────────────────────────────────────────
create table if not exists dental_charts (
  chart_id    bigint generated always as identity primary key,
  patient_id  bigint not null references patients(patient_id) on delete cascade,
  date        date not null default current_date,
  updated_at  timestamptz not null default now()
);

-- ─── 6. TOOTH RECORDS ────────────────────────────────────────────
create table if not exists tooth_records (
  id            bigint generated always as identity primary key,
  chart_id      bigint not null references dental_charts(chart_id) on delete cascade,
  patient_id    bigint not null references patients(patient_id) on delete cascade,
  tooth_number  int not null check (tooth_number between 11 and 85),
  conditions    text[] not null default '{}',
  notes         text not null default '',
  updated_at    timestamptz not null default now(),
  unique (chart_id, tooth_number)
);

-- ─── 7. TREATMENTS ───────────────────────────────────────────────
create table if not exists treatments (
  treatment_id     bigint generated always as identity primary key,
  patient_id       bigint not null references patients(patient_id) on delete cascade,
  date             date not null,
  tooth_numbers    int[] not null default '{}',
  procedure_type   text not null,
  dentist_id       bigint not null references dentists(dentist_id),
  fee_charged_int  bigint not null default 0,   -- centavos (PHP × 100)
  amount_paid_int  bigint not null default 0,
  notes            text not null default '',
  status           text not null default 'done' check (status in ('planned','in_progress','done')),
  next_appointment date,
  created_at       timestamptz not null default now()
);

-- ─── 8. INVOICES ─────────────────────────────────────────────────
create table if not exists invoices (
  invoice_id      bigint generated always as identity primary key,
  invoice_no      text not null unique,
  patient_id      bigint not null references patients(patient_id) on delete cascade,
  subtotal_int    bigint not null default 0,
  discount_int    bigint not null default 0,
  total_int       bigint not null default 0,
  amount_paid_int bigint not null default 0,
  balance_int     bigint not null default 0,
  payment_terms   text not null default 'full' check (payment_terms in ('full','installment')),
  status          text not null default 'draft' check (status in ('draft','sent','partial','paid','overdue')),
  due_date        date not null default (current_date + interval '30 days'),
  created_at      timestamptz not null default now()
);

-- ─── 9. INVOICE ITEMS ────────────────────────────────────────────
create table if not exists invoice_items (
  item_id         bigint generated always as identity primary key,
  invoice_id      bigint not null references invoices(invoice_id) on delete cascade,
  description     text not null,
  treatment_id    bigint references treatments(treatment_id),
  qty             int not null default 1,
  unit_price_int  bigint not null default 0,
  line_total_int  bigint not null default 0
);

-- ─── 10. INSTALLMENT PLANS ───────────────────────────────────────
create table if not exists installment_plans (
  plan_id            bigint generated always as identity primary key,
  invoice_id         bigint not null references invoices(invoice_id) on delete cascade,
  patient_id         bigint not null references patients(patient_id) on delete cascade,
  total_amount_int   bigint not null default 0,
  downpayment_int    bigint not null default 0,
  months             int not null default 1,
  due_day_of_month   int not null default 15 check (due_day_of_month between 1 and 28)
);

-- ─── 11. INSTALLMENT SCHEDULE ────────────────────────────────────
create table if not exists installment_schedule (
  schedule_id  bigint generated always as identity primary key,
  plan_id      bigint not null references installment_plans(plan_id) on delete cascade,
  due_date     date not null,
  amount_int   bigint not null default 0,
  status       text not null default 'pending' check (status in ('pending','paid','overdue')),
  paid_date    date
);

-- ─── 12. PAYMENTS ────────────────────────────────────────────────
create table if not exists payments (
  payment_id    bigint generated always as identity primary key,
  invoice_id    bigint not null references invoices(invoice_id) on delete cascade,
  patient_id    bigint not null references patients(patient_id) on delete cascade,
  amount_int    bigint not null,
  method        text not null default 'cash' check (method in ('cash','gcash','bank_transfer','card')),
  reference_no  text not null default '',
  date          date not null default current_date,
  created_at    timestamptz not null default now()
);

-- ─── 13. APPOINTMENTS ────────────────────────────────────────────
create table if not exists appointments (
  appointment_id  bigint generated always as identity primary key,
  patient_id      bigint not null references patients(patient_id) on delete cascade,
  dentist_id      bigint not null references dentists(dentist_id),
  treatment_id    bigint references treatments(treatment_id),
  date            date not null,
  time_start      time not null,
  time_end        time not null,
  status          text not null default 'scheduled' check (status in ('scheduled','confirmed','done','no_show','cancelled')),
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

-- ─── 14. FILE ASSETS ─────────────────────────────────────────────
create table if not exists file_assets (
  file_id      bigint generated always as identity primary key,
  patient_id   bigint not null references patients(patient_id) on delete cascade,
  file_name    text not null,
  file_type    text not null default '',
  file_url     text not null,          -- Supabase Storage URL or base64
  category     text not null default 'other' check (category in ('xray','document','photo','other')),
  uploaded_at  timestamptz not null default now(),
  notes        text not null default ''
);

-- ─── 15. DRUGS (Catalog) ─────────────────────────────────────────
create table if not exists drugs (
  drug_id       bigint generated always as identity primary key,
  generic_name  text not null,
  brand_name    text not null default '',
  form          text not null default 'Tablet',
  strength      text not null default '',
  is_active     boolean not null default true
);

-- ─── 16. PRESCRIPTIONS ───────────────────────────────────────────
create table if not exists prescriptions (
  prescription_id  bigint generated always as identity primary key,
  patient_id       bigint not null references patients(patient_id) on delete cascade,
  dentist_id       bigint not null references dentists(dentist_id),
  treatment_id     bigint references treatments(treatment_id),
  date             date not null default current_date,
  items            jsonb not null default '[]',    -- array of { drug_name, dosage, quantity, sig }
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

-- ─── 17. SERVICES (Catalog) ──────────────────────────────────────
create table if not exists services (
  service_id        bigint generated always as identity primary key,
  name              text not null,
  category          text not null default 'General',
  default_price_int bigint not null default 0,
  description       text not null default '',
  is_active         boolean not null default true
);

-- ─── 18. CLINIC SETTINGS ─────────────────────────────────────────
create table if not exists clinic_settings (
  id           int primary key default 1 check (id = 1),   -- single row only
  clinic_name  text not null default 'SmartDental Clinic',
  address      text not null default '',
  phone        text not null default '',
  email        text not null default '',
  logo         text,                                        -- base64 or URL
  updated_at   timestamptz not null default now()
);

-- Insert default clinic row
insert into clinic_settings (id) values (1) on conflict (id) do nothing;

-- ─── 19. PAYMENT TERMS (Catalog) ─────────────────────────────────
create table if not exists payment_terms (
  term_id      bigint generated always as identity primary key,
  name         text not null,
  months       int not null default 1,
  description  text not null default ''
);

-- ─── 20. NOTIFICATIONS ───────────────────────────────────────────
create table if not exists notifications (
  id          bigint generated always as identity primary key,
  title       text not null,
  message     text not null default '',
  type        text not null default 'info' check (type in ('info','warning','success','error')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES (for performance)
-- ═══════════════════════════════════════════════════════════════════

create index if not exists idx_patients_name on patients(last_name, first_name);
create index if not exists idx_treatments_patient on treatments(patient_id);
create index if not exists idx_treatments_dentist on treatments(dentist_id);
create index if not exists idx_invoices_patient on invoices(patient_id);
create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_payments_patient on payments(patient_id);
create index if not exists idx_appointments_patient on appointments(patient_id);
create index if not exists idx_appointments_date on appointments(date);
create index if not exists idx_dental_charts_patient on dental_charts(patient_id);
create index if not exists idx_tooth_records_chart on tooth_records(chart_id);
create index if not exists idx_prescriptions_patient on prescriptions(patient_id);
create index if not exists idx_file_assets_patient on file_assets(patient_id);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
create index if not exists idx_installment_schedule_plan on installment_schedule(plan_id);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Enable but allow all for now
-- You can tighten this later when you add auth
-- ═══════════════════════════════════════════════════════════════════

alter table dentists enable row level security;
alter table patients enable row level security;
alter table medical_histories enable row level security;
alter table consent_forms enable row level security;
alter table dental_charts enable row level security;
alter table tooth_records enable row level security;
alter table treatments enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table installment_plans enable row level security;
alter table installment_schedule enable row level security;
alter table payments enable row level security;
alter table appointments enable row level security;
alter table file_assets enable row level security;
alter table drugs enable row level security;
alter table prescriptions enable row level security;
alter table services enable row level security;
alter table clinic_settings enable row level security;
alter table payment_terms enable row level security;
alter table notifications enable row level security;

-- Allow all operations for anon/authenticated users (open access for now)
-- Replace these with proper policies when you add user auth

do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'dentists','patients','medical_histories','consent_forms',
      'dental_charts','tooth_records','treatments','invoices','invoice_items',
      'installment_plans','installment_schedule','payments','appointments',
      'file_assets','drugs','prescriptions','services','clinic_settings',
      'payment_terms','notifications'
    ])
  loop
    execute format('create policy "Allow all select on %I" on %I for select using (true)', tbl, tbl);
    execute format('create policy "Allow all insert on %I" on %I for insert with check (true)', tbl, tbl);
    execute format('create policy "Allow all update on %I" on %I for update using (true) with check (true)', tbl, tbl);
    execute format('create policy "Allow all delete on %I" on %I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════════════════════════════

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_patients_updated_at before update on patients
  for each row execute function update_updated_at();

create trigger trg_medical_histories_updated_at before update on medical_histories
  for each row execute function update_updated_at();

create trigger trg_dental_charts_updated_at before update on dental_charts
  for each row execute function update_updated_at();

create trigger trg_tooth_records_updated_at before update on tooth_records
  for each row execute function update_updated_at();

create trigger trg_clinic_settings_updated_at before update on clinic_settings
  for each row execute function update_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- SEED DATA (Default payment terms & sample dentists)
-- ═══════════════════════════════════════════════════════════════════

insert into payment_terms (name, months, description) values
  ('Full Payment', 1, 'Full payment due on receipt'),
  ('2 Months', 2, 'Split into 2 monthly payments'),
  ('3 Months', 3, 'Split into 3 monthly payments'),
  ('6 Months', 6, 'Split into 6 monthly payments')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- Next: Get your Supabase URL and anon key from
--       Project Settings > API
-- ═══════════════════════════════════════════════════════════════════
