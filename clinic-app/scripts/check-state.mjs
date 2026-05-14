import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const counts = {};
for (const t of ['patients', 'dentists', 'services', 'drugs', 'appointments', 'prescriptions', 'treatments', 'payments', 'invoices']) {
  const { count } = await s.from(t).select('*', { count: 'exact', head: true });
  counts[t] = count;
}
console.log('Table counts:', counts);
console.log('Dentists:', (await s.from('dentists').select('*')).data);
