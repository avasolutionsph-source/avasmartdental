import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  UserX,
  Search,
  X,
  MoreHorizontal,
  Paintbrush,
  Upload,
  Trash2,
  Edit3,
} from 'lucide-react';
import type {
  Appointment,
  Patient,
  Dentist,
  TreatmentRecord,
  AppointmentStatus,
} from '@/types/models';
import {
  formatDate,
  cn,
  getShortName,
  getFullName,
  todayISO,
  getStatusColor,
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
import { Textarea } from '@/components/ui/Textarea';
import { SelectWithAdd } from '@/components/ui/SelectWithAdd';
import { useToast } from '@/components/ui/Toast';
import { Link } from 'react-router-dom';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isToday,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────

type ViewMode = 'calendar' | 'list';
type StatusFilter = 'all' | AppointmentStatus;
type BadgeVar = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface NewAppointmentForm {
  patientId: string;
  patientSearch: string;
  dentistId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  treatmentId: string;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statusBadgeVariant(status: string): BadgeVar {
  const map: Record<string, BadgeVar> = {
    scheduled: 'info',
    confirmed: 'purple',
    done: 'success',
    no_show: 'danger',
    cancelled: 'default',
  };
  return map[status] ?? 'default';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    done: 'Done',
    no_show: 'No Show',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

function statusDotColor(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-purple-500',
    done: 'bg-green-500',
    no_show: 'bg-red-500',
    cancelled: 'bg-gray-400',
  };
  return map[status] ?? 'bg-gray-400';
}

function resolvePatientName(patients: Patient[], id: number): string {
  const p = patients.find((pt) => pt.patient_id === id);
  return p ? getShortName(p) : `Patient #${id}`;
}

function resolveDentistName(dentists: Dentist[], id: number): string {
  const d = dentists.find((dt) => dt.dentist_id === id);
  return d ? `Dr. ${d.last_name}` : `Dentist #${id}`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── Calendar Background Options ────────────────────────────────

interface CalendarBg {
  id: string;
  name: string;
  thumbnail: string; // small preview gradient
  style: React.CSSProperties;
}

// Tooth SVG path (clean molar silhouette)
const TOOTH = "M40 12c-7 0-12 3.5-14 10-.8 3.5.2 7 2 12 1.8 5.5 2.5 11 1.8 17-1 7-3.5 12.5-3.5 18 0 3.5 2 5.5 4.5 5.5s4-2.5 5-8c.8-3.5 1.5-3.5 2.2 0 1 5.5 2.5 8 5 8s4.5-2 4.5-5.5c0-5.5-2.5-11-3.5-18-.7-6 0-11.5 1.8-17 1.8-5 2.8-8.5 2-12-2-6.5-7-10-14-10z";
// Dental mirror SVG path
const MIRROR = "M40 8a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM38 32h4v36h-4z";
// Toothbrush SVG path
const BRUSH = "M36 10h8v4h-8zm-2 4h12v3H34zm1 3h10v40a5 5 0 0 1-10 0V17zm2 2v10h6V19z";
// Dental cross / plus
const CROSS = "M35 20h10v15h15v10H45v15H35V45H20V35h15z";
// Braces wire + brackets
const BRACES = "M10 35h60M25 30h6v10h-6zm15 0h6v10h-6zm15 0h6v10h-6z";
// Implant screw shape
const IMPLANT = "M35 10h10l-1 6h-8zm-1 8h12l-1 5H35zm-1 7h14l-1 5H34zm2 7h8v6a8 8 0 0 1-8 0z";

const CALENDAR_BACKGROUNDS: CalendarBg[] = [
  {
    id: 'none',
    name: 'Default',
    thumbnail: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    style: {},
  },
  {
    id: 'molar-lavender',
    name: 'Molar Lavender',
    thumbnail: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f5f3ff'/%3E%3Cstop offset='100%25' stop-color='%23ede9fe'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3Cg transform='translate(10,8) scale(0.8)'%3E%3Cpath d='${TOOTH}' fill='%23a78bfa' opacity='0.08' stroke='%23a78bfa' stroke-width='0.5' opacity='0.06'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px',
    },
  },
  {
    id: 'teeth-blue',
    name: 'Teeth Clinical',
    thumbnail: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23eff6ff'/%3E%3Cg transform='translate(15,10) scale(0.45)'%3E%3Cpath d='${TOOTH}' fill='none' stroke='%233b82f6' stroke-width='1.5' opacity='0.1'/%3E%3C/g%3E%3Cg transform='translate(70,60) scale(0.45)'%3E%3Cpath d='${TOOTH}' fill='none' stroke='%233b82f6' stroke-width='1.5' opacity='0.07'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '120px 120px',
    },
  },
  {
    id: 'mirror-mint',
    name: 'Dental Mirror',
    thumbnail: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ecfdf5'/%3E%3Cstop offset='100%25' stop-color='%23d1fae5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='110' height='110' fill='url(%23g)'/%3E%3Cg transform='translate(30,5) scale(0.55)'%3E%3Cpath d='${MIRROR}' fill='%2310b981' opacity='0.07'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '110px 110px',
    },
  },
  {
    id: 'brush-rose',
    name: 'Toothbrush',
    thumbnail: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fff1f2'/%3E%3Cstop offset='100%25' stop-color='%23ffe4e6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='120' fill='url(%23g)'/%3E%3Cg transform='translate(28,8) scale(0.55)'%3E%3Cpath d='${BRUSH}' fill='%23fb7185' opacity='0.07'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '100px 120px',
    },
  },
  {
    id: 'implant-teal',
    name: 'Dental Implant',
    thumbnail: 'linear-gradient(160deg, #f0fdfa 0%, #ccfbf1 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f0fdfa'/%3E%3Cstop offset='100%25' stop-color='%23ccfbf1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3Cg transform='translate(22,10) scale(0.7)'%3E%3Cpath d='${IMPLANT}' fill='%230d9488' opacity='0.07'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px',
    },
  },
  {
    id: 'braces-sky',
    name: 'Braces',
    thumbnail: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='80'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f0f9ff'/%3E%3Cstop offset='100%25' stop-color='%23e0f2fe'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='80' fill='url(%23g)'/%3E%3Cg transform='translate(10,18) scale(1)'%3E%3Cpath d='${BRACES}' fill='%230ea5e9' stroke='%230ea5e9' stroke-width='1' opacity='0.06'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '100px 80px',
    },
  },
  {
    id: 'cross-peach',
    name: 'Dental Care',
    thumbnail: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fff7ed'/%3E%3Cstop offset='100%25' stop-color='%23ffedd5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3Cg transform='translate(12,12) scale(0.75)'%3E%3Cpath d='${CROSS}' fill='%23f97316' opacity='0.06'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px',
    },
  },
  {
    id: 'scattered-teeth',
    name: 'Scattered Teeth',
    thumbnail: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23faf5ff'/%3E%3Cstop offset='100%25' stop-color='%23f3e8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23g)'/%3E%3Cg transform='translate(10,10) scale(0.35) rotate(15 40 40)'%3E%3Cpath d='${TOOTH}' fill='%23a855f7' opacity='0.06'/%3E%3C/g%3E%3Cg transform='translate(100,25) scale(0.3) rotate(-10 40 40)'%3E%3Cpath d='${TOOTH}' fill='%23a855f7' opacity='0.05'/%3E%3C/g%3E%3Cg transform='translate(55,100) scale(0.35) rotate(5 40 40)'%3E%3Cpath d='${TOOTH}' fill='%23a855f7' opacity='0.04'/%3E%3C/g%3E%3Cg transform='translate(140,120) scale(0.3) rotate(-20 40 40)'%3E%3Cpath d='${TOOTH}' fill='%23a855f7' opacity='0.06'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '200px 200px',
    },
  },
  {
    id: 'smile-row',
    name: 'Smile Row',
    thumbnail: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='80'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f0fdf4'/%3E%3Cstop offset='100%25' stop-color='%23dcfce7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='80' fill='url(%23g)'/%3E%3Cg opacity='0.06'%3E%3Cg transform='translate(5,15) scale(0.28)'%3E%3Cpath d='${TOOTH}' fill='%2322c55e'/%3E%3C/g%3E%3Cg transform='translate(45,20) scale(0.25)'%3E%3Cpath d='${TOOTH}' fill='%2322c55e'/%3E%3C/g%3E%3Cg transform='translate(80,18) scale(0.3)'%3E%3Cpath d='${TOOTH}' fill='%2322c55e'/%3E%3C/g%3E%3Cg transform='translate(120,20) scale(0.25)'%3E%3Cpath d='${TOOTH}' fill='%2322c55e'/%3E%3C/g%3E%3Cg transform='translate(155,15) scale(0.28)'%3E%3Cpath d='${TOOTH}' fill='%2322c55e'/%3E%3C/g%3E%3Cg transform='translate(195,18) scale(0.26)'%3E%3Cpath d='${TOOTH}' fill='%2322c55e'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '240px 80px',
    },
  },
  {
    id: 'tools-slate',
    name: 'Dental Tools',
    thumbnail: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f8fafc'/%3E%3Cstop offset='100%25' stop-color='%23f1f5f9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='180' height='180' fill='url(%23g)'/%3E%3Cg transform='translate(5,5) scale(0.5) rotate(-15 40 40)'%3E%3Cpath d='${MIRROR}' fill='%2364748b' opacity='0.06'/%3E%3C/g%3E%3Cg transform='translate(95,15) scale(0.4)'%3E%3Cpath d='${TOOTH}' fill='%2364748b' opacity='0.05'/%3E%3C/g%3E%3Cg transform='translate(50,95) scale(0.4) rotate(10 40 30)'%3E%3Cpath d='${BRUSH}' fill='%2364748b' opacity='0.05'/%3E%3C/g%3E%3Cg transform='translate(120,100) scale(0.45)'%3E%3Cpath d='${IMPLANT}' fill='%2364748b' opacity='0.05'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '180px 180px',
    },
  },
  {
    id: 'tooth-outline-blue',
    name: 'Tooth Outline',
    thumbnail: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23eff6ff'/%3E%3Cstop offset='100%25' stop-color='%23dbeafe'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='90' height='90' fill='url(%23g)'/%3E%3Cg transform='translate(10,5) scale(0.8)'%3E%3Cpath d='${TOOTH}' fill='none' stroke='%2393c5fd' stroke-width='1.2' opacity='0.15'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundSize: '90px 90px',
    },
  },
  {
    id: 'molar-mesh',
    name: 'Molar Mesh',
    thumbnail: 'radial-gradient(at 20% 20%, #dbeafe 0%, transparent 50%), radial-gradient(at 80% 80%, #ede9fe 0%, transparent 50%), #f8fafc',
    style: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' fill='%23f8fafc'/%3E%3Cg transform='translate(20,15) scale(0.5)'%3E%3Cpath d='${TOOTH}' fill='none' stroke='%238b5cf6' stroke-width='1' opacity='0.08'/%3E%3C/g%3E%3Cg transform='translate(85,75) scale(0.5)'%3E%3Cpath d='${TOOTH}' fill='none' stroke='%233b82f6' stroke-width='1' opacity='0.06'/%3E%3C/g%3E%3Ccircle cx='130' cy='25' r='20' fill='%23dbeafe' opacity='0.3'/%3E%3Ccircle cx='25' cy='130' r='25' fill='%23ede9fe' opacity='0.25'/%3E%3C/svg%3E")`,
      backgroundSize: '160px 160px',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function AppointmentsPage() {
  const toast = useToast();

  // ─── Data ────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── View ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // ─── Calendar State ──────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // ─── List Filters ────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dentistFilter, setDentistFilter] = useState('');

  // ─── Calendar Background ─────────────────────────────────────────
  const [calendarBgId, setCalendarBgId] = useState<string>(() => {
    try { return localStorage.getItem('smartdental_calendar_bg') || 'none'; } catch { return 'none'; }
  });
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(() => {
    try { return localStorage.getItem('smartdental_calendar_custom_bg') || null; } catch { return null; }
  });
  const bgFileRef = useRef<HTMLInputElement>(null);

  const calendarBg = CALENDAR_BACKGROUNDS.find((b) => b.id === calendarBgId) ?? CALENDAR_BACKGROUNDS[0];

  // Compute the actual style to apply (custom upload overrides presets)
  const calendarBgStyle: React.CSSProperties = calendarBgId === 'custom' && customBgUrl
    ? { backgroundImage: `url(${customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : calendarBg.style;

  const handleBgSelect = (id: string) => {
    setCalendarBgId(id);
    try { localStorage.setItem('smartdental_calendar_bg', id); } catch { /* */ }
    setShowBgPicker(false);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomBgUrl(dataUrl);
      setCalendarBgId('custom');
      try {
        localStorage.setItem('smartdental_calendar_custom_bg', dataUrl);
        localStorage.setItem('smartdental_calendar_bg', 'custom');
      } catch { /* */ }
      setShowBgPicker(false);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  const handleRemoveCustomBg = () => {
    setCustomBgUrl(null);
    setCalendarBgId('none');
    try {
      localStorage.removeItem('smartdental_calendar_custom_bg');
      localStorage.setItem('smartdental_calendar_bg', 'none');
    } catch { /* */ }
  };

  // ─── Modals ─────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [editingApptId, setEditingApptId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: number;
    action: AppointmentStatus;
  } | null>(null);
  const [deleteApptId, setDeleteApptId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEditAppt = (appt: Appointment) => {
    const patient = patients.find((p) => p.patient_id === appt.patient_id);
    setForm({
      patientId: String(appt.patient_id),
      patientSearch: patient ? getShortName(patient) : '',
      dentistId: String(appt.dentist_id),
      treatmentId: appt.treatment_id ? String(appt.treatment_id) : '',
      date: appt.date,
      timeStart: appt.time_start,
      timeEnd: appt.time_end,
      notes: appt.notes || '',
    });
    setFormErr({});
    setEditingApptId(appt.appointment_id);
    setShowCreate(true);
    setActionMenuId(null);
  };

  const handleDeleteAppt = (id: number) => {
    setActionMenuId(null);
    setDeleteApptId(id);
  };

  const confirmDeleteAppt = async () => {
    if (deleteApptId === null) return;
    setDeleting(true);
    try {
      await api.deleteAppointment(deleteApptId);
      setAppointments((prev) => prev.filter((a) => a.appointment_id !== deleteApptId));
      toast.success('Appointment deleted');
      setDeleteApptId(null);
    } catch {
      toast.error('Failed to delete appointment');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Patient dropdown ──────────────────────────────────────────
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const patientDropRef = useRef<HTMLDivElement>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  // Close patient dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientDropRef.current && !patientDropRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false);
      }
    };
    if (patientDropOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [patientDropOpen]);

  // ─── Fetch data ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [appts, pts, dts] = await Promise.all([
          api.getAppointments(),
          api.getPatients(),
          api.getDentists(),
        ]);
        if (cancelled) return;
        setAppointments(appts);
        setPatients(pts);
        setDentists(dts);
      } catch {
        toast.error('Failed to load appointments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Calendar Grid ──────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // ─── Appointments by date lookup ───────────────────────────────
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const key = a.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    // Sort each day's appointments by time
    map.forEach((list) => list.sort((a, b) => a.time_start.localeCompare(b.time_start)));
    return map;
  }, [appointments]);

  // ─── Selected day's appointments ───────────────────────────────
  const selectedDayAppts = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return appointmentsByDate.get(key) ?? [];
  }, [selectedDay, appointmentsByDate]);

  // ─── Today's appointments ──────────────────────────────────────
  const todaysAppts = useMemo(() => {
    const key = todayISO();
    return appointmentsByDate.get(key) ?? [];
  }, [appointmentsByDate]);

  // ─── Status tab counts ─────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      all: appointments.length,
      scheduled: appointments.filter((a) => a.status === 'scheduled').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      done: appointments.filter((a) => a.status === 'done').length,
      no_show: appointments.filter((a) => a.status === 'no_show').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    }),
    [appointments],
  );

  // ─── Filtered list ─────────────────────────────────────────────
  const filteredList = useMemo(() => {
    let list = [...appointments];

    if (statusFilter !== 'all')
      list = list.filter((a) => a.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const name = resolvePatientName(patients, a.patient_id).toLowerCase();
        const dName = resolveDentistName(dentists, a.dentist_id).toLowerCase();
        return (
          name.includes(q) ||
          dName.includes(q) ||
          a.notes.toLowerCase().includes(q)
        );
      });
    }

    if (dentistFilter) {
      const dId = parseInt(dentistFilter);
      list = list.filter((a) => a.dentist_id === dId);
    }

    if (dateFrom) {
      const from = parseISO(dateFrom);
      list = list.filter((a) => !isBefore(parseISO(a.date), from));
    }
    if (dateTo) {
      const to = parseISO(dateTo);
      list = list.filter((a) => !isAfter(parseISO(a.date), to));
    }

    // Sort: upcoming first
    list.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.time_start.localeCompare(b.time_start);
    });

    return list;
  }, [appointments, statusFilter, search, patients, dentists, dentistFilter, dateFrom, dateTo]);

  // ─── Calendar Navigation ───────────────────────────────────────
  const prevMonth = () => setCurrentMonth((m) => addMonths(m, -1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  // ─── Appointment Status Actions ────────────────────────────────
  const handleStatusChange = async (id: number, newStatus: AppointmentStatus) => {
    try {
      const updated = await api.updateAppointment(id, { status: newStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.appointment_id === id ? updated : a)),
      );
      toast.success(`Appointment marked as ${statusLabel(newStatus)}`);
    } catch {
      toast.error('Failed to update appointment');
    }
    setConfirmAction(null);
    setActionMenuId(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // NEW APPOINTMENT FORM
  // ═══════════════════════════════════════════════════════════════

  const freshForm = useCallback(
    (): NewAppointmentForm => ({
      patientId: '',
      patientSearch: '',
      dentistId: dentists.length > 0 ? String(dentists[0].dentist_id) : '',
      date: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : todayISO(),
      timeStart: '09:00',
      timeEnd: '09:30',
      treatmentId: '',
      notes: '',
    }),
    [dentists, selectedDay],
  );

  const [form, setForm] = useState<NewAppointmentForm>(freshForm);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [addDentistOpen, setAddDentistOpen] = useState(false);

  // Auto-select the first dentist once the list loads (single-dentist clinics
  // shouldn't have to pick from a one-item dropdown).
  useEffect(() => {
    if (!form.dentistId && dentists.length > 0) {
      setForm((prev) => (prev.dentistId ? prev : { ...prev, dentistId: String(dentists[0].dentist_id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentists]);
  const [newDentist, setNewDentist] = useState({ first_name: '', last_name: '', specialization: 'General Dentistry', license_no: '' });
  const [localDentists, setLocalDentists] = useState(dentists);
  useEffect(() => { setLocalDentists(dentists); }, [dentists]);

  const handleQuickAddDentist = async () => {
    if (!newDentist.first_name || !newDentist.last_name) return;
    try {
      const created = await api.createDentist({
        first_name: newDentist.first_name,
        last_name: newDentist.last_name,
        specialization: newDentist.specialization,
        license_no: newDentist.license_no,
        photo: null,
        is_active: true,
      });
      setLocalDentists((prev) => [...prev, created]);
      setForm((p) => ({ ...p, dentistId: String(created.dentist_id) }));
      setAddDentistOpen(false);
      setNewDentist({ first_name: '', last_name: '', specialization: 'General Dentistry', license_no: '' });
      toast.success(`Dr. ${created.last_name} added`);
    } catch {
      toast.error('Failed to add dentist');
    }
  };

  const resetForm = useCallback(() => {
    setForm(freshForm());
    setFormErr({});
    setTreatments([]);
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

  // Load treatments when patient changes
  useEffect(() => {
    if (!form.patientId) {
      setTreatments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ts = await api.getPatientTreatments(parseInt(form.patientId));
        if (!cancelled) setTreatments(ts.filter((t) => t.status === 'planned' || t.status === 'in_progress'));
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [form.patientId]);

  const handleCreate = async () => {
    const err: Record<string, string> = {};
    if (!form.patientId) err.patientId = 'Patient is required';
    if (!form.dentistId) err.dentistId = 'Dentist is required';
    if (!form.date) err.date = 'Date is required';
    if (!form.timeStart) err.timeStart = 'Start time is required';
    if (!form.timeEnd) err.timeEnd = 'End time is required';
    if (form.timeStart && form.timeEnd && form.timeStart >= form.timeEnd)
      err.timeEnd = 'End time must be after start';
    if (Object.keys(err).length) {
      setFormErr(err);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: parseInt(form.patientId),
        dentist_id: parseInt(form.dentistId),
        treatment_id: form.treatmentId ? parseInt(form.treatmentId) : null,
        date: form.date,
        time_start: form.timeStart,
        time_end: form.timeEnd,
        notes: form.notes,
      };
      if (editingApptId !== null) {
        const updated = await api.updateAppointment(editingApptId, payload);
        setAppointments((prev) => prev.map((a) =>
          a.appointment_id === editingApptId ? updated : a,
        ));
        toast.success('Appointment updated');
      } else {
        const appt = await api.createAppointment({ ...payload, status: 'scheduled' });
        setAppointments((prev) => [...prev, appt]);
        toast.success('Appointment created successfully');
      }
      setShowCreate(false);
      setEditingApptId(null);
      resetForm();
    } catch {
      toast.error(editingApptId !== null ? 'Failed to update appointment' : 'Failed to create appointment');
    } finally {
      setSaving(false);
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            Schedule and manage patient appointments
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors active:scale-95',
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors active:scale-95',
                viewMode === 'list'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="flex-1 sm:flex-none"
          >
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Appointment</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CALENDAR VIEW
          ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card padding={false} className="overflow-hidden">
              {/* Month Navigation */}
              <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowBgPicker(true)}
                    className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors active:scale-95"
                    title="Change calendar background"
                  >
                    <Paintbrush className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors active:scale-95"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="px-1 sm:px-2 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Cells */}
              <div className="grid grid-cols-7 relative" style={calendarBgStyle}>
                {calendarDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayAppts = appointmentsByDate.get(dateStr) ?? [];
                  const isCurrentMonth =
                    day.getMonth() === currentMonth.getMonth();
                  const isSelected = selectedDay
                    ? isSameDay(day, selectedDay)
                    : false;
                  const today = isToday(day);
                  const isPast =
                    isBefore(day, new Date()) && !isToday(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'relative flex flex-col items-start p-2 min-h-[80px] border-b border-r border-gray-100 text-left transition-colors',
                        !isCurrentMonth && 'bg-gray-50/50',
                        isPast && isCurrentMonth && 'bg-gray-50/30',
                        isSelected && 'bg-primary-50 ring-2 ring-inset ring-primary-500',
                        !isSelected && 'hover:bg-gray-50',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                          today && !isSelected && 'bg-primary-600 text-white',
                          today && isSelected && 'bg-primary-600 text-white',
                          !today && isCurrentMonth && 'text-gray-900',
                          !today && !isCurrentMonth && 'text-gray-400',
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Appointment dots */}
                      {dayAppts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {dayAppts.slice(0, 3).map((a) => (
                            <span
                              key={a.appointment_id}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                statusDotColor(a.status),
                              )}
                              title={`${formatTime12(a.time_start)} - ${resolvePatientName(patients, a.patient_id)}`}
                            />
                          ))}
                          {dayAppts.length > 3 && (
                            <span className="text-[10px] text-gray-400 leading-none">
                              +{dayAppts.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Day Detail Panel */}
          <div className="lg:col-span-1">
            <Card>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedDay
                    ? format(selectedDay, 'EEEE, MMMM d, yyyy')
                    : 'Select a day'}
                </h3>
                {selectedDay && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedDayAppts.length} appointment
                    {selectedDayAppts.length !== 1 && 's'}
                  </p>
                )}
              </div>

              {!selectedDay ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Click a day on the calendar to view appointments.
                </p>
              ) : selectedDayAppts.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No appointments on this day.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      resetForm();
                      setForm((p) => ({
                        ...p,
                        date: format(selectedDay, 'yyyy-MM-dd'),
                      }));
                      setShowCreate(true);
                    }}
                  >
                    Add Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayAppts.map((a) => (
                    <div
                      key={a.appointment_id}
                      className="rounded-lg border border-gray-200 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {formatTime12(a.time_start)} -{' '}
                          {formatTime12(a.time_end)}
                        </div>
                        <Badge variant={statusBadgeVariant(a.status)}>
                          {statusLabel(a.status)}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <Link
                          to={`/patients/${a.patient_id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {resolvePatientName(patients, a.patient_id)}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500">
                        {resolveDentistName(dentists, a.dentist_id)}
                      </div>
                      {a.notes && (
                        <p className="text-xs text-gray-500 italic">
                          {a.notes}
                        </p>
                      )}

                      {/* Actions */}
                      {(a.status === 'scheduled' ||
                        a.status === 'confirmed') && (
                        <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(a.appointment_id, 'done')
                            }
                            className="text-success-600"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Done
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                a.appointment_id,
                                'no_show',
                              )
                            }
                            className="text-warning-600"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            No Show
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                id: a.appointment_id,
                                action: 'cancelled',
                              })
                            }
                            className="text-danger-500"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LIST VIEW
          ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Today's Reminders */}
          {todaysAppts.length > 0 && (
            <Card className="border-primary-200 bg-primary-50/30">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-5 w-5 text-primary-600" />
                <h3 className="text-sm font-semibold text-primary-700">
                  Today's Appointments
                </h3>
                <Badge variant="info">{todaysAppts.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {todaysAppts.map((a) => (
                  <div
                    key={a.appointment_id}
                    className="flex items-center gap-3 rounded-lg border border-primary-100 bg-white p-2.5"
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        statusDotColor(a.status),
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatTime12(a.time_start)} -{' '}
                        {resolvePatientName(patients, a.patient_id)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {resolveDentistName(dentists, a.dentist_id)}
                        {a.notes ? ` - ${a.notes}` : ''}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(a.status)}>
                      {statusLabel(a.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <Tabs
            tabs={[
              { key: 'all', label: 'All', count: tabCounts.all },
              {
                key: 'scheduled',
                label: 'Scheduled',
                count: tabCounts.scheduled,
              },
              {
                key: 'confirmed',
                label: 'Confirmed',
                count: tabCounts.confirmed,
              },
              { key: 'done', label: 'Done', count: tabCounts.done },
              {
                key: 'no_show',
                label: 'No Show',
                count: tabCounts.no_show,
              },
              {
                key: 'cancelled',
                label: 'Cancelled',
                count: tabCounts.cancelled,
              },
            ]}
            activeTab={statusFilter}
            onTabChange={(k) => setStatusFilter(k as StatusFilter)}
          />

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search patient, dentist, or notes..."
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                label="Dentist"
                value={dentistFilter}
                onChange={(e) => setDentistFilter(e.target.value)}
                placeholder="All dentists"
                options={[
                  { value: '', label: 'All Dentists' },
                  ...dentists.map((d) => ({
                    value: String(d.dentist_id),
                    label: `Dr. ${d.last_name}`,
                  })),
                ]}
              />
            </div>
            <DatePicker
              label="From"
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DatePicker label="To" value={dateTo} onChange={setDateTo} />
            {(dateFrom || dateTo || dentistFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setDentistFilter('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Table */}
          <Card padding={false}>
            {filteredList.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments found"
                description={
                  search
                    ? 'Try adjusting your search or filters.'
                    : 'Schedule your first appointment to get started.'
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
                      New Appointment
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Time</Th>
                    <Th>Patient</Th>
                    <Th>Dentist</Th>
                    <Th>Procedure / Notes</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredList.map((a) => (
                    <Tr key={a.appointment_id}>
                      <Td>
                        <span
                          className={cn(
                            'text-sm',
                            isToday(parseISO(a.date)) &&
                              'font-semibold text-primary-600',
                          )}
                        >
                          {formatDate(a.date)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm">
                          {formatTime12(a.time_start)} -{' '}
                          {formatTime12(a.time_end)}
                        </span>
                      </Td>
                      <Td>
                        <Link
                          to={`/patients/${a.patient_id}`}
                          className="font-medium text-primary-600 hover:text-primary-700 text-sm"
                        >
                          {resolvePatientName(patients, a.patient_id)}
                        </Link>
                      </Td>
                      <Td>
                        <span className="text-sm">
                          {resolveDentistName(dentists, a.dentist_id)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm text-gray-500 max-w-[200px] truncate block">
                          {a.notes || '--'}
                        </span>
                      </Td>
                      <Td>
                        <Badge variant={statusBadgeVariant(a.status)}>
                          {statusLabel(a.status)}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="relative inline-block">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActionMenuId(
                                actionMenuId === a.appointment_id
                                  ? null
                                  : a.appointment_id,
                              )
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {actionMenuId === a.appointment_id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => openEditAppt(a)}
                              >
                                <Edit3 className="h-4 w-4 text-primary-600" />
                                Edit details
                              </button>
                              {(a.status === 'scheduled' || a.status === 'confirmed') && (
                                <>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => handleStatusChange(a.appointment_id, 'done')}
                                  >
                                    <CheckCircle className="h-4 w-4 text-success-600" />
                                    Mark as Done
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => handleStatusChange(a.appointment_id, 'no_show')}
                                  >
                                    <UserX className="h-4 w-4 text-warning-600" />
                                    No Show
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                                    onClick={() => setConfirmAction({ id: a.appointment_id, action: 'cancelled' })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Cancel
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                                onClick={() => handleDeleteAppt(a.appointment_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CLOSE ACTIONS MENU ON CLICK OUTSIDE
          ═══════════════════════════════════════════════════════════ */}
      {actionMenuId !== null && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setActionMenuId(null)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          NEW APPOINTMENT MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setEditingApptId(null); }}
        title={editingApptId !== null ? 'Edit Appointment' : 'New Appointment'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingApptId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              {editingApptId !== null ? 'Save Changes' : 'Create Appointment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Patient autocomplete */}
          <div className="relative" ref={patientDropRef}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Patient <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient..."
                value={
                  form.patientId
                    ? resolvePatientName(
                        patients,
                        parseInt(form.patientId),
                      )
                    : form.patientSearch
                }
                onChange={(e) => {
                  setForm((p) => ({
                    ...p,
                    patientSearch: e.target.value,
                    patientId: '',
                    treatmentId: '',
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
                      treatmentId: '',
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
                          treatmentId: '',
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
            {formErr.patientId && (
              <p className="mt-1 text-xs text-danger-500">
                {formErr.patientId}
              </p>
            )}
          </div>

          {/* Dentist */}
          <SelectWithAdd
            label="Dentist"
            value={form.dentistId}
            onChange={(v) => setForm((p) => ({ ...p, dentistId: v }))}
            options={localDentists.map((d) => ({
              value: String(d.dentist_id),
              label: `Dr. ${d.first_name} ${d.last_name} (${d.specialization})`,
            }))}
            placeholder="Select dentist..."
            error={formErr.dentistId}
            addLabel="+ Add New Dentist"
            onAdd={() => setAddDentistOpen(true)}
          />

          {/* Date */}
          <DatePicker
            label="Date"
            value={form.date}
            onChange={(v) => setForm((p) => ({ ...p, date: v }))}
            error={formErr.date}
          />

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Start Time <span className="text-danger-500">*</span>
              </label>
              <input
                type="time"
                value={form.timeStart}
                onChange={(e) =>
                  setForm((p) => ({ ...p, timeStart: e.target.value }))
                }
                className={cn(
                  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  formErr.timeStart
                    ? 'border-danger-500'
                    : 'border-gray-300',
                )}
              />
              {formErr.timeStart && (
                <p className="mt-1 text-xs text-danger-500">
                  {formErr.timeStart}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                End Time <span className="text-danger-500">*</span>
              </label>
              <input
                type="time"
                value={form.timeEnd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, timeEnd: e.target.value }))
                }
                className={cn(
                  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  formErr.timeEnd
                    ? 'border-danger-500'
                    : 'border-gray-300',
                )}
              />
              {formErr.timeEnd && (
                <p className="mt-1 text-xs text-danger-500">
                  {formErr.timeEnd}
                </p>
              )}
            </div>
          </div>

          {/* Link to Treatment */}
          {form.patientId && treatments.length > 0 && (
            <Select
              label="Link to Treatment (optional)"
              value={form.treatmentId}
              onChange={(e) =>
                setForm((p) => ({ ...p, treatmentId: e.target.value }))
              }
              placeholder="No linked treatment"
              options={[
                { value: '', label: 'None' },
                ...treatments.map((t) => ({
                  value: String(t.treatment_id),
                  label: `${t.procedure_type} (${t.status})`,
                })),
              ]}
            />
          )}

          {/* Notes */}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, notes: e.target.value }))
            }
            placeholder="Procedure details, special instructions..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Quick Add Dentist Modal */}
      <Modal
        isOpen={addDentistOpen}
        onClose={() => setAddDentistOpen(false)}
        title="Add New Dentist"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddDentistOpen(false)}>Cancel</Button>
            <Button onClick={handleQuickAddDentist} disabled={!newDentist.first_name || !newDentist.last_name}>Add Dentist</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              placeholder="Ana"
              value={newDentist.first_name}
              onChange={(e) => setNewDentist((p) => ({ ...p, first_name: e.target.value }))}
            />
            <Input
              label="Last Name *"
              placeholder="Dizon"
              value={newDentist.last_name}
              onChange={(e) => setNewDentist((p) => ({ ...p, last_name: e.target.value }))}
            />
          </div>
          <Input
            label="Specialization"
            placeholder="General Dentistry"
            value={newDentist.specialization}
            onChange={(e) => setNewDentist((p) => ({ ...p, specialization: e.target.value }))}
          />
          <Input
            label="License No."
            placeholder="PRC-00000"
            value={newDentist.license_no}
            onChange={(e) => setNewDentist((p) => ({ ...p, license_no: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          BACKGROUND PICKER MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showBgPicker}
        onClose={() => setShowBgPicker(false)}
        title="Calendar Background"
        size="lg"
      >
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Choose a background theme for your calendar view.
          </p>

          {/* Hidden file input */}
          <input
            ref={bgFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBgUpload}
          />

          {/* Upload Section */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Custom Image</p>
            {customBgUrl ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleBgSelect('custom')}
                  className={cn(
                    'relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03] active:scale-95 w-[140px] shrink-0',
                    calendarBgId === 'custom'
                      ? 'border-primary-500 ring-2 ring-primary-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
                  )}
                >
                  <div
                    className="aspect-[4/3] w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${customBgUrl})` }}
                  />
                  <div className="px-2 py-1.5 bg-white/90 backdrop-blur-sm border-t border-gray-100">
                    <p className={cn(
                      'text-xs font-medium truncate text-center',
                      calendarBgId === 'custom' ? 'text-primary-600' : 'text-gray-600',
                    )}>
                      My Photo
                    </p>
                  </div>
                  {calendarBgId === 'custom' && (
                    <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </button>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="h-3.5 w-3.5" />}
                    onClick={() => bgFileRef.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-500 hover:text-danger-600"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={handleRemoveCustomBg}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bgFileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50/30 transition-colors p-5 flex flex-col items-center gap-2"
              >
                <Upload className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Upload your own image</span>
                <span className="text-xs text-gray-400">JPG, PNG, or WebP (max 5MB)</span>
              </button>
            )}
          </div>

          {/* Preset Section */}
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Preset Themes</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {CALENDAR_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => handleBgSelect(bg.id)}
                className={cn(
                  'group relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03] active:scale-95',
                  calendarBgId === bg.id
                    ? 'border-primary-500 ring-2 ring-primary-200 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
                )}
              >
                <div
                  className="aspect-[4/3] w-full"
                  style={{ background: bg.thumbnail, ...bg.style }}
                />
                <div className="px-2 py-1.5 bg-white/90 backdrop-blur-sm border-t border-gray-100">
                  <p className={cn(
                    'text-xs font-medium truncate text-center',
                    calendarBgId === bg.id ? 'text-primary-600' : 'text-gray-600',
                  )}>
                    {bg.name}
                  </p>
                </div>
                {calendarBgId === bg.id && (
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          CANCEL CONFIRMATION MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title="Cancel Appointment"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Go Back
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmAction)
                  handleStatusChange(
                    confirmAction.id,
                    confirmAction.action,
                  );
              }}
            >
              Yes, Cancel Appointment
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to cancel this appointment? This action cannot
          be undone.
        </p>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={deleteApptId !== null}
        onClose={() => setDeleteApptId(null)}
        title="Delete Appointment"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteApptId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteAppt} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Permanently delete this appointment? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
