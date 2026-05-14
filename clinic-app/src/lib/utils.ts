import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, differenceInYears, parseISO } from 'date-fns';

// ─── Class Names ───────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ─── Money (centavos → PHP display) ────────────────────────────────
export function formatMoney(centavos: number): string {
  const pesos = centavos / 100;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(pesos);
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

// ─── Date Helpers ──────────────────────────────────────────────────
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export function formatDateRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// Legacy CSV imports use 1900-01-01 as a placeholder when birthdate
// was missing in the source export. Treat anything before 1920 as
// "unknown" so the UI doesn't show 100+ year ages.
export function isPlaceholderBirthdate(birthdate: string | null | undefined): boolean {
  if (!birthdate) return true;
  const m = birthdate.match(/^(\d{4})-/);
  if (!m) return true;
  return Number(m[1]) < 1920;
}

export function computeAge(birthdate: string): number {
  try {
    return differenceInYears(new Date(), parseISO(birthdate));
  } catch {
    return 0;
  }
}

// Returns the formatted age string, or "Unknown" when the birthdate
// is missing/placeholder. Centralizes the 1900-01-01 handling.
export function formatAge(birthdate: string | null | undefined): string {
  if (isPlaceholderBirthdate(birthdate)) return 'Unknown';
  return `${computeAge(birthdate as string)} yrs`;
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function nowISO(): string {
  return new Date().toISOString();
}

// Parse a typed date string into ISO YYYY-MM-DD.
// Accepts: YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY (and dot separators).
// Returns '' for empty input, null for an invalid date.
export function parseTypedDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const iso = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return buildISO(Number(y), Number(m), Number(d));
  }

  const us = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return buildISO(Number(y), Number(m), Number(d));
  }

  return null;
}

// Format a birthdate as the user types: "03151990" -> "03/15/1990".
// Accepts any input, strips non-digits, caps to MMDDYYYY (8 digits) and
// inserts the slashes after the month and day groups.
export function maskBirthdateInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Convert a stored ISO date (YYYY-MM-DD) to the masked display form (MM/DD/YYYY).
// Returns the original string if it doesn't match the ISO pattern.
export function isoToBirthdateInput(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function buildISO(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ─── ID Generator (mock) ──────────────────────────────────────────
let _nextId = 10000;
export function generateId(): number {
  return ++_nextId;
}

// ─── Invoice Number ────────────────────────────────────────────────
export function generateInvoiceNo(): string {
  const prefix = 'INV';
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${num}`;
}

// ─── Patient Full Name ─────────────────────────────────────────────
export function getFullName(p: { first_name: string; last_name: string; middle_name?: string }): string {
  const middle = p.middle_name ? ` ${p.middle_name.charAt(0)}.` : '';
  return `${p.last_name}, ${p.first_name}${middle}`;
}

export function getShortName(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`;
}

// ─── Patient Avatar Initials ───────────────────────────────────────
export function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── Phone Format ──────────────────────────────────────────────────
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// ─── Delay (for mock API) ──────────────────────────────────────────
export function delay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── FDI Tooth Numbers ─────────────────────────────────────────────
export const ADULT_TEETH_UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
export const ADULT_TEETH_LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
export const ALL_ADULT_TEETH = [...ADULT_TEETH_UPPER, ...ADULT_TEETH_LOWER];

export const CHILD_TEETH_UPPER = [55,54,53,52,51,61,62,63,64,65];
export const CHILD_TEETH_LOWER = [85,84,83,82,81,71,72,73,74,75];

// ─── Status Colors ─────────────────────────────────────────────────
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    no_show: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    partial: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    pending: 'bg-orange-100 text-orange-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

export function getToothConditionColor(condition: string): string {
  const map: Record<string, string> = {
    // Condition
    present: '#22c55e',
    caries: '#ef4444',
    missing: '#94a3b8',
    composite_filling: '#3b82f6',
    temporary_filling: '#f97316',
    root_fragment: '#b45309',
    impacted: '#7c3aed',
    // Restoration & Prosthetics
    jacket_crown: '#f59e0b',
    amalgam: '#64748b',
    abutment: '#0ea5e9',
    pontic: '#06b6d4',
    inlay: '#8b5cf6',
    removable_denture: '#ec4899',
    // Surgery
    extraction: '#dc2626',
    congenitally_missing: '#a1a1aa',
    supernumerary: '#d946ef',
  };
  return map[condition] || '#cbd5e1';
}
