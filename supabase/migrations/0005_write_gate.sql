-- 0005_write_gate.sql — writes require an entitled clinic.
--
-- SELECT policies are deliberately NOT touched: a lapsed clinic must keep
-- full read access to its own patient records, including export. Only the
-- creation of new data stops. Nothing is ever deleted for non-payment.

do $$
declare
  t text;
  tables text[] := array[
    'dentists','patients','medical_histories','consent_forms','dental_charts',
    'tooth_records','treatments','invoices','invoice_items','installment_plans',
    'installment_schedule','payments','appointments','file_assets','drugs',
    'prescriptions','services','clinic_settings','payment_terms','notifications',
    'expense_categories','expenses'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists tenant_insert on public.%I', t);
    execute format($f$
      create policy tenant_insert on public.%I
        for insert to authenticated
        with check (clinic_id = public.current_clinic_id()
                    and public.clinic_is_writable())
    $f$, t);

    execute format('drop policy if exists tenant_update on public.%I', t);
    execute format($f$
      create policy tenant_update on public.%I
        for update to authenticated
        using (clinic_id = public.current_clinic_id())
        with check (clinic_id = public.current_clinic_id()
                    and public.clinic_is_writable())
    $f$, t);

    execute format('drop policy if exists tenant_delete on public.%I', t);
    execute format($f$
      create policy tenant_delete on public.%I
        for delete to authenticated
        using (clinic_id = public.current_clinic_id()
               and public.clinic_is_writable())
    $f$, t);
  end loop;
end $$;
