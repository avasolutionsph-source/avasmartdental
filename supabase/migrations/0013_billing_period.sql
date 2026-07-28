-- Records which cadence an invoice/clinic is on. Chosen at the pay screen.
alter table public.billing_invoices
  add column if not exists billing_period text
  check (billing_period in ('monthly','annual'));

alter table public.clinics
  add column if not exists billing_period text
  check (billing_period in ('monthly','annual'));
