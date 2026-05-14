import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Plus,
  Save,
  Upload,
  FileText,
  Image,
  ChevronDown,
  ChevronUp,
  Calendar,
  Activity,
  FolderOpen,
  X,
  Check,
  CheckCircle2,
  Camera,
  Stethoscope,
  Users,
  PhilippinePeso,
  File,
  FileImage,
  Printer,
  Trash2,
  Eye,
} from 'lucide-react';
import type {
  Patient,
  TreatmentRecord,
  Invoice,
  InvoiceItem,
  Appointment,
  DentalChart,
  MedicalHistory,
  ConsentForm,
  FileAsset,
  Dentist,
  ServiceItem,
  ToothCondition,
  ToothRecord,
  Payment,
  Prescription,
  RxItem,
  Drug,
  ClinicSettings,
} from '@/types/models';
import { TOOTH_CONDITIONS } from '@/types/models';
import {
  formatDate,
  formatDateRelative,
  computeAge,
  formatAge,
  isPlaceholderBirthdate,
  formatPhone,
  formatMoney,
  getFullName,
  getShortName,
  getInitials,
  todayISO,
  nowISO,
  generateId,
  parseTypedDate,
  maskBirthdateInput,
  isoToBirthdateInput,
  cn,
  pesosToCentavos,
  getToothConditionColor,
  getStatusColor,
  ADULT_TEETH_UPPER,
  ADULT_TEETH_LOWER,
  CHILD_TEETH_UPPER,
  CHILD_TEETH_LOWER,
} from '@/lib/utils';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SelectWithAdd } from '@/components/ui/SelectWithAdd';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { showToast } from '@/components/ui/ToastContainer';
import { PhotoCaptureModal } from '@/components/ui/PhotoCapture';

// ─── Constants ────────────────────────────────────────────────────
const TAG_BADGE_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
> = {
  Ortho: 'info',
  Pedia: 'purple',
  VIP: 'warning',
  Senior: 'success',
  Regular: 'default',
};

const PROFILE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'pda', label: 'PDA Forms' },
  { key: 'dental-chart', label: 'Dental Chart' },
  { key: 'treatments', label: 'Treatments' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'files', label: 'Files' },
];

const MEDICAL_CONDITIONS = [
  { key: 'heart_disease', label: 'Heart Disease' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hypertension', label: 'Hypertension' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'bleeding_disorder', label: 'Bleeding Disorder' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'hiv_aids', label: 'HIV/AIDS' },
  { key: 'kidney_disease', label: 'Kidney Disease' },
  { key: 'thyroid_disease', label: 'Thyroid Disease' },
  { key: 'epilepsy', label: 'Epilepsy' },
  { key: 'cancer', label: 'Cancer' },
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'allergies_to_anesthesia', label: 'Allergies to Anesthesia' },
  { key: 'allergies_to_antibiotics', label: 'Allergies to Antibiotics' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// ─── Auto-save status indicator ─────────────────────────────────
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs transition-opacity',
        status === 'saving' && 'text-gray-400',
        status === 'saved' && 'text-green-500',
        status === 'error' && 'text-red-500',
      )}
    >
      {status === 'saving' && (
        <>
          <span className="h-2 w-2 animate-spin rounded-full border border-gray-300 border-t-gray-500" />
          Saving...
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3" /> Saved
        </>
      )}
      {status === 'error' && 'Save failed'}
    </span>
  );
}

// ─── useAutoSave hook ───────────────────────────────────────────
function useAutoSave(
  saveFn: () => Promise<void>,
  deps: unknown[],
  delayMs = 1200,
  enabled = true,
) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFirstRender = useRef(true);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Skip auto-save on initial mount / data load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFn();
        setStatus('saved');
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      }
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return status;
}

// Fallback labels for internal condition keys
const DEFAULT_CONDITION_LABELS: Record<string, string> = {
  present: 'Present Teeth',
  caries: 'Caries',
  missing: 'Missing',
  composite_filling: 'Composite Filling',
  temporary_filling: 'Temporary Filling',
  root_fragment: 'Root Fragment',
  impacted: 'Impacted Tooth',
  jacket_crown: 'Jacket Crown',
  amalgam: 'Amalgam Filling',
  abutment: 'Abutment',
  pontic: 'Pontic',
  inlay: 'Inlay',
  removable_denture: 'Removable Denture',
  extraction: 'Extraction',
  congenitally_missing: 'Congenitally Missing',
  supernumerary: 'Supernumerary',
};

// Default internal keys for each legend position
const DEFAULT_LEGEND_KEYS: Record<keyof LegendConfig, string[]> = {
  condition: ['caries', 'missing', 'composite_filling', 'temporary_filling', 'root_fragment', 'impacted'],
  restoration: ['jacket_crown', 'amalgam', 'abutment', 'pontic', 'inlay', 'removable_denture'],
  surgery: ['extraction', 'present', 'congenitally_missing', 'supernumerary'],
};

function buildGroupedConditions(legend: LegendConfig) {
  const groups: { group: string; items: { key: string; code: string; color: string }[] }[] = [];
  const titles: Record<keyof LegendConfig, string> = {
    condition: 'Condition',
    restoration: 'Restoration & Prosthetics',
    surgery: 'Surgery',
  };

  for (const groupKey of ['condition', 'restoration', 'surgery'] as const) {
    const defaultKeys = DEFAULT_LEGEND_KEYS[groupKey];
    const items = legend[groupKey].map((item, i) => {
      // Use existing internal key for known positions, generate one for new items
      const key = i < defaultKeys.length
        ? defaultKeys[i]
        : `custom_${groupKey}_${item.code.toLowerCase().replace(/\s+/g, '_') || i}`;
      return { key, code: item.code, color: item.color };
    });

    // Always include "Present Teeth" (✓) at the top of the condition group for the modal
    if (groupKey === 'condition') {
      // Find present in surgery group's legend position
      const surgeryKeys = DEFAULT_LEGEND_KEYS.surgery;
      const presentIdx = surgeryKeys.indexOf('present');
      const presentItem = legend.surgery[presentIdx];
      if (presentItem) {
        items.unshift({ key: 'present', code: presentItem.code, color: presentItem.color });
      }
    }

    groups.push({ group: titles[groupKey], items });
  }
  return groups;
}

function buildConditionLabels(legend: LegendConfig): Record<string, string> {
  const labels: Record<string, string> = { ...DEFAULT_CONDITION_LABELS };
  for (const groupKey of ['condition', 'restoration', 'surgery'] as const) {
    const defaultKeys = DEFAULT_LEGEND_KEYS[groupKey];
    legend[groupKey].forEach((item, i) => {
      const key = i < defaultKeys.length
        ? defaultKeys[i]
        : `custom_${groupKey}_${item.code.toLowerCase().replace(/\s+/g, '_') || i}`;
      labels[key] = item.label;
    });
  }
  return labels;
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function PatientProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Shared data loaded once
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [dentalChart, setDentalChart] = useState<DentalChart | null>(null);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [editPatientOpen, setEditPatientOpen] = useState(false);

  const handlePhotoCapture = async (dataUrl: string) => {
    if (!patient) return;
    try {
      const updated = await api.updatePatient(patient.patient_id, { patient_photo: dataUrl });
      setPatient(updated);
      showToast('success', 'Photo updated');
    } catch {
      showToast('error', 'Failed to update photo');
    }
  };

  const handlePatientEdited = (updated: Patient) => {
    setPatient(updated);
    setEditPatientOpen(false);
    showToast('success', 'Patient updated');
  };

  // ─── Fetch Patient ─────────────────────────────────────────
  const fetchPatient = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPatient(patientId);
      setPatient(data ?? null);
    } catch {
      showToast('error', 'Patient not found');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  }, [patientId, navigate]);

  const fetchRelatedData = useCallback(async () => {
    try {
      const [t, inv, appt, d, s, chart] = await Promise.all([
        api.getPatientTreatments(patientId),
        api.getPatientInvoices(patientId),
        api.getPatientAppointments(patientId),
        api.getDentists(),
        api.getServices(),
        api.getDentalChart(patientId),
      ]);
      setTreatments(t);
      setInvoices(inv);
      setAppointments(appt);
      setDentists(d);
      setServices(s);
      setDentalChart(chart ?? null);
    } catch {
      // Non-blocking errors for related data
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
    fetchRelatedData();
  }, [fetchPatient, fetchRelatedData]);

  // ─── Computed Stats ────────────────────────────────────────
  const totalTreatments = treatments.length;
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total_int, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid_int, 0);
  const balance = totalBilled - totalPaid;
  const nextAppointment = appointments
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  // ─── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
        <span className="ml-3 text-sm text-gray-500">Loading patient profile...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20">
        <EmptyState
          icon={Users}
          title="Patient not found"
          description="The patient you are looking for does not exist or has been removed."
          action={
            <Button variant="outline" onClick={() => navigate('/patients')}>
              Back to Patients
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Patient Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <button
              type="button"
              onClick={() => setPhotoCaptureOpen(true)}
              className="group relative shrink-0"
              title="Click to take or upload photo"
            >
              <Avatar
                src={patient.patient_photo || undefined}
                name={getShortName(patient)}
                initials={getInitials(patient.first_name, patient.last_name)}
                size="lg"
                className="!h-20 !w-20 !text-2xl"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
              </div>
              {!patient.patient_photo && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full">
                  <Camera className="h-6 w-6 text-white/50" />
                </div>
              )}
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {getFullName(patient)}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {formatAge(patient.birthdate)} old &middot;{' '}
                {patient.sex === 'male' ? 'Male' : 'Female'} &middot;{' '}
                {formatPhone(patient.mobile_number)}
                {patient.email && (
                  <span> &middot; {patient.email}</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patient.tags.map((tag) => (
                  <Badge key={tag} variant={TAG_BADGE_VARIANT[tag] || 'default'}>
                    {tag}
                  </Badge>
                ))}
                {patient.tags.length === 0 && (
                  <span className="text-xs text-gray-400">No tags</span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit3 className="h-3.5 w-3.5" />}
            onClick={() => setEditPatientOpen(true)}
          >
            Edit
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <QuickStat
            label="Total Treatments"
            value={String(totalTreatments)}
            icon={<Activity className="h-5 w-5 text-primary-500" />}
          />
          <QuickStat
            label="Total Billed"
            value={formatMoney(totalBilled)}
            icon={<FileText className="h-5 w-5 text-blue-500" />}
          />
          <QuickStat
            label="Balance"
            value={formatMoney(balance)}
            valueClass={balance > 0 ? 'text-danger-600' : 'text-success-600'}
            icon={<PhilippinePeso className="h-5 w-5 text-warning-500" />}
          />
          <QuickStat
            label="Next Appointment"
            value={nextAppointment ? formatDate(nextAppointment.date) : 'None'}
            icon={<Calendar className="h-5 w-5 text-green-500" />}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs tabs={PROFILE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            patient={patient}
            treatments={treatments}
            appointments={appointments}
            dentists={dentists}
            dentalChart={dentalChart}
            onRefreshPatient={fetchPatient}
            onViewFullChart={() => setActiveTab('dental-chart')}
          />
        )}
        {activeTab === 'pda' && (
          <PDAFormsTab
            patient={patient}
            onRefreshPatient={fetchPatient}
            onEditPatient={() => setEditPatientOpen(true)}
          />
        )}
        {activeTab === 'dental-chart' && (
          <DentalChartTab patientId={patientId} onChartUpdate={fetchRelatedData} />
        )}
        {activeTab === 'treatments' && patient && (
          <TreatmentsTab
            patientId={patientId}
            patient={patient}
            treatments={treatments}
            dentists={dentists}
            services={services}
            onRefresh={fetchRelatedData}
          />
        )}
        {activeTab === 'prescriptions' && patient && (
          <PrescriptionsTab
            patientId={patientId}
            patient={patient}
            dentists={dentists}
          />
        )}
        {activeTab === 'files' && <FilesTab patientId={patientId} />}
      </div>

      <PhotoCaptureModal
        isOpen={photoCaptureOpen}
        onClose={() => setPhotoCaptureOpen(false)}
        onCapture={handlePhotoCapture}
      />

      {patient && (
        <EditPatientModal
          isOpen={editPatientOpen}
          patient={patient}
          onClose={() => setEditPatientOpen(false)}
          onSaved={handlePatientEdited}
        />
      )}
    </div>
  );
}

// ─── Quick Stat Card ─────────────────────────────────────────────
function QuickStat({
  label,
  value,
  valueClass,
  icon,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={cn('truncate text-sm font-semibold text-gray-900', valueClass)}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Info Row Helper ─────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value}</dd>
    </div>
  );
}

// ─── Mini Odontogram (Overview Preview) ──────────────────────────
function MiniOdontogram({
  chart,
  onViewFullChart,
}: {
  chart: DentalChart | null;
  onViewFullChart: () => void;
}) {
  const getPrimary = (num: number): ToothCondition | null => {
    const rec = chart?.teeth.find((t) => t.tooth_number === num);
    if (!rec || rec.conditions.length === 0) return null;
    const priority: ToothCondition[] = [
      'extraction', 'caries', 'root_fragment', 'impacted',
      'jacket_crown', 'amalgam', 'abutment', 'pontic', 'inlay',
      'removable_denture',
      'composite_filling', 'temporary_filling', 'missing', 'congenitally_missing',
      'supernumerary', 'present',
    ];
    for (const c of priority) if (rec.conditions.includes(c)) return c;
    return null;
  };

  const teethWithIssues = chart?.teeth.filter(
    (t) => t.conditions.length > 0 && !t.conditions.every((c) => c === 'present'),
  ) || [];
  const cariesCount = chart?.teeth.filter((t) => t.conditions.includes('caries')).length || 0;
  const missingCount = chart?.teeth.filter((t) => t.conditions.includes('missing')).length || 0;
  const filledCount = chart?.teeth.filter((t) => t.conditions.includes('composite_filling') || t.conditions.includes('temporary_filling')).length || 0;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="mx-auto flex flex-col items-center gap-1" style={{ minWidth: 500 }}>
          {/* Upper temporary teeth */}
          <div className="flex items-center justify-center">
            <span className="w-16 shrink-0 text-right pr-2 text-[8px] font-medium text-gray-400 uppercase">
              Temporary
            </span>
            <div className="flex items-center">
              {CHILD_TEETH_UPPER.slice(0, 5).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={26} isChild />
              ))}
              <div className="w-2" />
              {CHILD_TEETH_UPPER.slice(5).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={26} isChild />
              ))}
            </div>
            <span className="w-16 shrink-0" />
          </div>

          {/* Upper permanent teeth */}
          <div className="flex items-center justify-center">
            <span className="w-16 shrink-0 text-right pr-2 text-[8px] font-medium text-gray-500 uppercase">
              Permanent
            </span>
            <div className="flex items-center">
              {ADULT_TEETH_UPPER.slice(0, 8).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={28} />
              ))}
              <div className="mx-px h-[28px] w-px bg-gray-400" />
              {ADULT_TEETH_UPPER.slice(8).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={28} />
              ))}
            </div>
            <span className="w-16 shrink-0" />
          </div>

          {/* Divider with RIGHT / LEFT labels */}
          <div className="flex items-center justify-center w-full my-1">
            <span className="w-16 shrink-0" />
            <div className="flex items-center justify-center" style={{ width: 28 * 16 + 2 }}>
              <span className="text-[8px] font-bold text-gray-400 mr-2">RIGHT</span>
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-[8px] font-bold text-gray-400 ml-2">LEFT</span>
            </div>
            <span className="w-16 shrink-0" />
          </div>

          {/* Lower permanent teeth */}
          <div className="flex items-center justify-center">
            <span className="w-16 shrink-0 text-right pr-2 text-[8px] font-medium text-gray-500 uppercase">
              Permanent
            </span>
            <div className="flex items-center">
              {ADULT_TEETH_LOWER.slice(0, 8).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={28} />
              ))}
              <div className="mx-px h-[28px] w-px bg-gray-400" />
              {ADULT_TEETH_LOWER.slice(8).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={28} />
              ))}
            </div>
            <span className="w-16 shrink-0" />
          </div>

          {/* Lower temporary teeth */}
          <div className="flex items-center justify-center">
            <span className="w-16 shrink-0 text-right pr-2 text-[8px] font-medium text-gray-400 uppercase">
              Temporary
            </span>
            <div className="flex items-center">
              {CHILD_TEETH_LOWER.slice(0, 5).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={26} isChild />
              ))}
              <div className="w-2" />
              {CHILD_TEETH_LOWER.slice(5).map((num) => (
                <PDAToothSVG key={num} number={num} condition={getPrimary(num)} isSelected={false} onClick={onViewFullChart} size={26} isChild />
              ))}
            </div>
            <span className="w-16 shrink-0" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{teethWithIssues.length}</p>
            <p className="text-[10px] text-gray-500">Findings</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{cariesCount}</p>
            <p className="text-[10px] text-gray-500">Caries</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-400">{missingCount}</p>
            <p className="text-[10px] text-gray-500">Missing</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-500">{filledCount}</p>
            <p className="text-[10px] text-gray-500">Filled</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['C-Caries', 'M-Missing', 'CF-Composite', 'J-Crown', 'X-Extract'] as const).map((item) => {
            const [code, label] = item.split('-');
            const colors: Record<string, string> = { C: '#ef4444', M: '#94a3b8', CF: '#3b82f6', J: '#f59e0b', X: '#dc2626' };
            return (
              <div key={item} className="flex items-center gap-1">
                <span className="text-[10px] font-bold" style={{ color: colors[code] }}>{code}</span>
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═════════════════════════════════════════════════════════════════
function OverviewTab({
  patient,
  treatments,
  appointments,
  dentists,
  dentalChart,
  onRefreshPatient,
  onViewFullChart,
}: {
  patient: Patient;
  treatments: TreatmentRecord[];
  appointments: Appointment[];
  dentists: Dentist[];
  dentalChart: DentalChart | null;
  onRefreshPatient: () => void;
  onViewFullChart: () => void;
}) {
  const [notes, setNotes] = useState(patient.notes);

  const notesAutoSaveStatus = useAutoSave(
    async () => {
      await api.updatePatient(patient.patient_id, { notes });
    },
    [notes],
  );

  const recentTreatments = treatments.slice(0, 5);
  const recentAppointments = [...appointments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const getDentistName = (dentistId: number): string => {
    const d = dentists.find((doc) => doc.dentist_id === dentistId);
    return d ? `Dr. ${d.last_name}` : '--';
  };

  const address = [
    patient.address_street,
    patient.address_barangay,
    patient.address_city,
    patient.address_province,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Patient Info Card */}
      <Card title="Patient Information" className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <InfoRow label="Full Name" value={getFullName(patient)} />
          <InfoRow
            label="Birthdate / Age"
            value={
              isPlaceholderBirthdate(patient.birthdate)
                ? 'Unknown'
                : `${formatDate(patient.birthdate)} (${computeAge(patient.birthdate)} yrs old)`
            }
          />
          <InfoRow label="Sex" value={patient.sex === 'male' ? 'Male' : 'Female'} />
          <InfoRow label="Address" value={address || '--'} />
          <InfoRow label="Mobile" value={formatPhone(patient.mobile_number)} />
          <InfoRow label="Email" value={patient.email || '--'} />
          <InfoRow label="Occupation" value={patient.occupation || '--'} />
          <InfoRow
            label="Emergency Contact"
            value={
              patient.emergency_contact_name
                ? `${patient.emergency_contact_name} (${formatPhone(patient.emergency_contact_number)})`
                : '--'
            }
          />
          <InfoRow label="Insurance" value={patient.insurance_provider || '--'} />
          <InfoRow label="Religion" value={patient.religion || '--'} />
          <InfoRow label="Recall Date" value={patient.recall_date ? formatDate(patient.recall_date) : '--'} />
        </div>
      </Card>

      {/* Mini Dental Chart Preview */}
      <Card
        title="Dental Chart"
        className="lg:col-span-2"
        headerAction={
          dentalChart ? (
            <button
              onClick={onViewFullChart}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              View Full Chart &rarr;
            </button>
          ) : undefined
        }
      >
        {dentalChart ? (
          <MiniOdontogram chart={dentalChart} onViewFullChart={onViewFullChart} />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-gray-500">No dental chart yet.</p>
            <button
              type="button"
              onClick={onViewFullChart}
              className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Create dental chart &rarr;
            </button>
          </div>
        )}
      </Card>

      {/* Recent Treatments */}
      <Card
        title="Recent Treatments"
        headerAction={
          treatments.length > 5 ? (
            <span className="text-xs text-primary-600 cursor-pointer hover:underline">
              View All ({treatments.length})
            </span>
          ) : undefined
        }
      >
        {recentTreatments.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No treatments recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recentTreatments.map((tx) => (
              <div
                key={tx.treatment_id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {tx.procedure_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(tx.date)} &middot; {getDentistName(tx.dentist_id)}
                    {tx.tooth_numbers.length > 0 &&
                      ` \u00b7 Tooth ${tx.tooth_numbers.join(', ')}`}
                  </p>
                </div>
                <Badge
                  variant={
                    tx.status === 'done'
                      ? 'success'
                      : tx.status === 'in_progress'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {tx.status === 'done'
                    ? 'Done'
                    : tx.status === 'in_progress'
                      ? 'In Progress'
                      : 'Planned'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Appointments */}
      <Card title="Recent Appointments">
        {recentAppointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No appointments found.
          </p>
        ) : (
          <div className="space-y-3">
            {recentAppointments.map((appt) => (
              <div
                key={appt.appointment_id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDate(appt.date)} at {appt.time_start}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getDentistName(appt.dentist_id)}
                    {appt.notes && ` - ${appt.notes}`}
                  </p>
                </div>
                <Badge
                  variant={
                    appt.status === 'done'
                      ? 'success'
                      : appt.status === 'cancelled' || appt.status === 'no_show'
                        ? 'danger'
                        : 'info'
                  }
                >
                  {appt.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card
        title="Notes"
        className="lg:col-span-2"
        headerAction={<AutoSaveIndicator status={notesAutoSaveStatus} />}
      >
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add clinical notes, reminders, or observations..."
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="mt-2 flex justify-end">
          <span className="text-[10px] text-gray-400">Auto-saves as you type</span>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 2: PDA FORMS
// ═════════════════════════════════════════════════════════════════
function PDAFormsTab({
  patient,
  onRefreshPatient,
  onEditPatient,
}: {
  patient: Patient;
  onRefreshPatient: () => void;
  onEditPatient: () => void;
}) {

  // ─── Medical History State ─────────────────────────────────
  const [medLoading, setMedLoading] = useState(true);
  const [medReady, setMedReady] = useState(false);
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [medFields, setMedFields] = useState({
    allergies: '',
    current_medications: '',
    physician_name: '',
    physician_contact: '',
    other_conditions: '',
    is_pregnant: false,
    is_nursing: false,
    blood_type: '',
  });

  // ─── Consent State ────────────────────────────────────────
  const [consent, setConsent] = useState<ConsentForm | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentReady, setConsentReady] = useState(false);
  const [consentForm, setConsentForm] = useState({
    consent_procedures: true,
    consent_risks: true,
    consent_records: true,
    signatory_name: `${patient.first_name} ${patient.last_name}`,
    relationship: 'Self',
    consent_date: todayISO(),
  });

  // Load medical history
  useEffect(() => {
    (async () => {
      setMedLoading(true);
      try {
        const data = await api.getMedicalHistory(patient.patient_id);
        if (data) {
          setConditions(data.conditions || {});
          setMedFields({
            allergies: data.allergies || '',
            current_medications: data.current_medications || '',
            physician_name: data.physician_name || '',
            physician_contact: data.physician_contact || '',
            other_conditions: data.other_conditions || '',
            is_pregnant: data.is_pregnant || false,
            is_nursing: data.is_nursing || false,
            blood_type: data.blood_type || '',
          });
        }
      } catch {
        // No medical history yet - use defaults
      } finally {
        setMedLoading(false);
        // Small delay so useAutoSave skips the initial "load" change
        setTimeout(() => setMedReady(true), 100);
      }
    })();
  }, [patient.patient_id]);

  // Load consent form
  useEffect(() => {
    (async () => {
      setConsentLoading(true);
      try {
        const data = await api.getConsentForm(patient.patient_id);
        setConsent(data ?? null);
        if (data) {
          setConsentForm({
            consent_procedures: data.consented,
            consent_risks: data.consented,
            consent_records: data.consented,
            signatory_name: data.signatory_name || `${patient.first_name} ${patient.last_name}`,
            relationship: data.relationship || 'Self',
            consent_date: data.consent_date || todayISO(),
          });
        }
      } catch {
        // No consent form yet
      } finally {
        setConsentLoading(false);
        setTimeout(() => setConsentReady(true), 100);
      }
    })();
  }, [patient.patient_id]);

  const toggleCondition = (key: string) => {
    setConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Auto-save Medical History ─────────────────────────────
  const medAutoSave = useAutoSave(
    async () => {
      const payload: MedicalHistory = {
        patient_id: patient.patient_id,
        conditions,
        allergies: medFields.allergies,
        current_medications: medFields.current_medications,
        physician_name: medFields.physician_name,
        physician_contact: medFields.physician_contact,
        other_conditions: medFields.other_conditions,
        is_pregnant: medFields.is_pregnant,
        is_nursing: medFields.is_nursing,
        blood_type: medFields.blood_type,
        updated_at: nowISO(),
      };
      await api.saveMedicalHistory(payload);
    },
    [conditions, medFields],
    1200,
    medReady,
  );

  // ─── Auto-save Consent ───────────────────────────────────
  const consentAutoSave = useAutoSave(
    async () => {
      const payload: ConsentForm = {
        consent_id: consent?.consent_id || generateId(),
        patient_id: patient.patient_id,
        consented:
          consentForm.consent_procedures &&
          consentForm.consent_risks &&
          consentForm.consent_records,
        consent_date: consentForm.consent_date,
        signatory_name: consentForm.signatory_name.trim(),
        relationship: consentForm.relationship,
        notes: '',
      };
      await api.saveConsentForm(payload);
      setConsent(payload);
    },
    [consentForm],
    1200,
    consentReady,
  );

  const address = [
    patient.address_street,
    patient.address_barangay,
    patient.address_city,
    patient.address_province,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      {/* ── Patient Information Record ────────────────────────── */}
      <Card
        title="Patient Information Record"
        headerAction={
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Edit3 className="h-3.5 w-3.5" />}
            onClick={onEditPatient}
          >
            Edit
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Full Name" value={getFullName(patient)} />
          <InfoRow label="Nickname" value={patient.first_name} />
          <InfoRow
            label="Birthdate"
            value={isPlaceholderBirthdate(patient.birthdate) ? 'Unknown' : formatDate(patient.birthdate)}
          />
          <InfoRow
            label="Age"
            value={isPlaceholderBirthdate(patient.birthdate) ? 'Unknown' : `${computeAge(patient.birthdate)} years old`}
          />
          <InfoRow
            label="Sex"
            value={patient.sex === 'male' ? 'Male' : 'Female'}
          />
          <InfoRow label="Civil Status" value="--" />
          <InfoRow label="Address" value={address || '--'} />
          <InfoRow label="Occupation" value={patient.occupation || '--'} />
          <InfoRow label="Religion" value={patient.religion || '--'} />
          <InfoRow
            label="Dental Insurance"
            value={patient.insurance_provider || '--'}
          />
          <InfoRow
            label="Mobile Number"
            value={formatPhone(patient.mobile_number)}
          />
          <InfoRow label="Email" value={patient.email || '--'} />
        </div>
      </Card>

      {/* ── Medical History ───────────────────────────────────── */}
      <Card
        title="Medical History"
        headerAction={<AutoSaveIndicator status={medAutoSave} />}
      >
        {medLoading ? (
          <LoadingSpinner text="Loading medical history..." />
        ) : (
          <div className="space-y-6">
            {/* Conditions Checklist */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                Medical Conditions (check all that apply)
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MEDICAL_CONDITIONS.map((cond) => (
                  <label
                    key={cond.key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={!!conditions[cond.key]}
                      onChange={() => toggleCondition(cond.key)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{cond.label}</span>
                    {conditions[cond.key] && (
                      <Badge variant="danger" className="ml-auto">
                        Yes
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Pregnancy / Nursing (female only) */}
            {patient.sex === 'female' && (
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={medFields.is_pregnant}
                    onChange={(e) =>
                      setMedFields((p) => ({
                        ...p,
                        is_pregnant: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Is Pregnant</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={medFields.is_nursing}
                    onChange={(e) =>
                      setMedFields((p) => ({
                        ...p,
                        is_nursing: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Is Nursing</span>
                </label>
              </div>
            )}

            {/* Text Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Allergies
                </label>
                <textarea
                  rows={2}
                  value={medFields.allergies}
                  onChange={(e) =>
                    setMedFields((p) => ({ ...p, allergies: e.target.value }))
                  }
                  placeholder="List any known allergies..."
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Current Medications
                </label>
                <textarea
                  rows={2}
                  value={medFields.current_medications}
                  onChange={(e) =>
                    setMedFields((p) => ({
                      ...p,
                      current_medications: e.target.value,
                    }))
                  }
                  placeholder="List medications currently being taken..."
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Input
                label="Physician Name"
                placeholder="Dr. Juan Dela Cruz"
                value={medFields.physician_name}
                onChange={(e) =>
                  setMedFields((p) => ({
                    ...p,
                    physician_name: e.target.value,
                  }))
                }
              />
              <Input
                label="Physician Contact"
                placeholder="09XX XXX XXXX"
                value={medFields.physician_contact}
                onChange={(e) =>
                  setMedFields((p) => ({
                    ...p,
                    physician_contact: e.target.value,
                  }))
                }
              />
            </div>

            {/* Blood Type */}
            <div className="max-w-xs">
              <Select
                label="Blood Type"
                value={medFields.blood_type}
                onChange={(e) =>
                  setMedFields((p) => ({ ...p, blood_type: e.target.value }))
                }
                options={BLOOD_TYPES.map((bt) => ({ value: bt, label: bt }))}
                placeholder="Select blood type"
              />
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-3">
              <span className="text-[10px] text-gray-400">Auto-saves when you make changes</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Informed Consent ──────────────────────────────────── */}
      <Card
        title="Informed Consent"
        headerAction={<AutoSaveIndicator status={consentAutoSave} />}
      >
        {consentLoading ? (
          <LoadingSpinner text="Loading consent form..." />
        ) : (
          <div className="space-y-5">
            {/* Consent Checkboxes */}
            <div className="space-y-3">
              {[
                {
                  key: 'consent_procedures' as const,
                  text: 'I consent to the dental procedures recommended by the dentist.',
                },
                {
                  key: 'consent_risks' as const,
                  text: 'I have been informed of the risks and benefits of the treatment.',
                },
                {
                  key: 'consent_records' as const,
                  text: 'I authorize the release of my dental records as needed.',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={consentForm[item.key]}
                    onChange={(e) =>
                      setConsentForm((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </label>
              ))}
            </div>

            {/* Signatory */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Signatory Name *"
                placeholder="Full name"
                value={consentForm.signatory_name}
                onChange={(e) =>
                  setConsentForm((prev) => ({
                    ...prev,
                    signatory_name: e.target.value,
                  }))
                }
              />
              <Select
                label="Relationship to Patient"
                value={consentForm.relationship}
                onChange={(e) =>
                  setConsentForm((prev) => ({
                    ...prev,
                    relationship: e.target.value,
                  }))
                }
                options={[
                  { value: 'Self', label: 'Self' },
                  { value: 'Parent', label: 'Parent' },
                  { value: 'Guardian', label: 'Guardian' },
                ]}
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Consent Date
                </label>
                <input
                  type="date"
                  value={consentForm.consent_date}
                  onChange={(e) =>
                    setConsentForm((prev) => ({
                      ...prev,
                      consent_date: e.target.value,
                    }))
                  }
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Existing consent banner */}
            {consent?.consented && (
              <div className="flex items-center gap-2 rounded-lg bg-success-50 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-success-600" />
                <span className="text-sm text-success-700">
                  Consent was recorded on {formatDate(consent.consent_date)} by{' '}
                  {consent.signatory_name} ({consent.relationship})
                </span>
              </div>
            )}

            <div className="flex justify-end border-t border-gray-100 pt-3">
              <span className="text-[10px] text-gray-400">Auto-saves when you make changes</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 3: DENTAL CHART (PDA-Style)
// ═════════════════════════════════════════════════════════════════

// PDA Legend codes — editable per clinic, persisted in localStorage
type LegendItem = { code: string; label: string; color: string };
type LegendConfig = { condition: LegendItem[]; restoration: LegendItem[]; surgery: LegendItem[] };

const DEFAULT_LEGEND: LegendConfig = {
  condition: [
    { code: 'C', label: 'Caries', color: '#ef4444' },
    { code: 'M', label: 'Missing', color: '#94a3b8' },
    { code: 'CF', label: 'Composite Filling', color: '#3b82f6' },
    { code: 'TF', label: 'Temporary Filling', color: '#f97316' },
    { code: 'RF', label: 'Root Fragment', color: '#b45309' },
    { code: 'Im', label: 'Impacted Tooth', color: '#7c3aed' },
  ],
  restoration: [
    { code: 'J', label: 'Jacket Crown', color: '#f59e0b' },
    { code: 'Am', label: 'Amalgam Filling', color: '#64748b' },
    { code: 'AB', label: 'Abutment', color: '#0ea5e9' },
    { code: 'P', label: 'Pontic', color: '#06b6d4' },
    { code: 'In', label: 'Inlay', color: '#8b5cf6' },
    { code: 'Rm', label: 'Removable Denture', color: '#ec4899' },
  ],
  surgery: [
    { code: 'X', label: 'Extraction', color: '#dc2626' },
    { code: '✓', label: 'Present Teeth', color: '#22c55e' },
    { code: 'Cm', label: 'Congenitally Missing', color: '#a1a1aa' },
    { code: 'Sp', label: 'Supernumerary', color: '#d946ef' },
  ],
};

const LEGEND_STORAGE_KEY = 'smart-dental-legend';

function loadLegend(): LegendConfig {
  try {
    const raw = localStorage.getItem(LEGEND_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LegendConfig;
  } catch { /* ignore */ }
  return structuredClone(DEFAULT_LEGEND);
}

function saveLegend(legend: LegendConfig) {
  localStorage.setItem(LEGEND_STORAGE_KEY, JSON.stringify(legend));
}

function useLegend() {
  const [legend, setLegend] = useState<LegendConfig>(loadLegend);
  const update = useCallback((next: LegendConfig) => {
    setLegend(next);
    saveLegend(next);
  }, []);
  return [legend, update] as const;
}

// Maps each legend position (group + index) to an internal condition key.
// This stays stable — even when the user edits codes/labels, the mapping holds.
const LEGEND_INDEX_TO_CONDITION: { group: keyof LegendConfig; index: number; key: string }[] = [
  { group: 'condition', index: 0, key: 'caries' },
  { group: 'condition', index: 1, key: 'missing' },
  { group: 'condition', index: 2, key: 'composite_filling' },
  { group: 'condition', index: 3, key: 'temporary_filling' },
  { group: 'condition', index: 4, key: 'root_fragment' },
  { group: 'condition', index: 5, key: 'impacted' },
  { group: 'restoration', index: 0, key: 'jacket_crown' },
  { group: 'restoration', index: 1, key: 'amalgam' },
  { group: 'restoration', index: 2, key: 'abutment' },
  { group: 'restoration', index: 3, key: 'pontic' },
  { group: 'restoration', index: 4, key: 'inlay' },
  { group: 'restoration', index: 5, key: 'removable_denture' },
  { group: 'surgery', index: 0, key: 'extraction' },
  { group: 'surgery', index: 1, key: 'present' },
  { group: 'surgery', index: 2, key: 'congenitally_missing' },
  { group: 'surgery', index: 3, key: 'supernumerary' },
];

function buildConditionToPDA(legend: LegendConfig): Record<string, { code: string; fill: string }> {
  const map: Record<string, { code: string; fill: string }> = {};
  // Map known positions
  for (const entry of LEGEND_INDEX_TO_CONDITION) {
    const item = legend[entry.group]?.[entry.index];
    if (item) {
      map[entry.key] = { code: item.code, fill: item.color };
    }
  }
  // Map custom (newly added) items beyond default positions
  for (const groupKey of ['condition', 'restoration', 'surgery'] as const) {
    const defaultKeys = DEFAULT_LEGEND_KEYS[groupKey];
    legend[groupKey].forEach((item, i) => {
      if (i >= defaultKeys.length) {
        const key = `custom_${groupKey}_${item.code.toLowerCase().replace(/\s+/g, '_') || i}`;
        map[key] = { code: item.code, fill: item.color };
      }
    });
  }
  return map;
}

// Treats a row as a valid image source: must look like a data URL or http(s) URL.
function isUsableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://');
}

function ToothPhotoThumb({
  photo,
  toothNumber,
  onView,
  onDelete,
}: {
  photo: FileAsset;
  toothNumber: number;
  onView: (p: FileAsset) => void;
  onDelete: (p: FileAsset) => void;
}) {
  const [broken, setBroken] = useState(!isUsableImageUrl(photo.file_url));

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => !broken && onView(photo)}
        className="block h-full w-full"
        title={formatDateRelative(photo.uploaded_at)}
      >
        {broken ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
            <Image className="h-6 w-6" />
            <span className="text-[10px]">Photo unavailable</span>
          </div>
        ) : (
          <img
            src={photo.file_url}
            alt={`Tooth #${toothNumber} on ${formatDate(photo.uploaded_at)}`}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        )}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
        <p className="text-[10px] font-medium text-white">
          {formatDate(photo.uploaded_at)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(photo)}
        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        title="Delete photo"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function DentalChartTab({ patientId, onChartUpdate }: { patientId: number; onChartUpdate?: () => void }) {
  const [allCharts, setAllCharts] = useState<DentalChart[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothConditions, setToothConditions] = useState<ToothCondition[]>([]);
  const [toothNotes, setToothNotes] = useState('');
  const [savingTooth, setSavingTooth] = useState(false);
  const [creatingChart, setCreatingChart] = useState(false);
  const [legendConfig, setLegendConfig] = useLegend();
  const [editingLegend, setEditingLegend] = useState(false);
  const [editLegendDraft, setEditLegendDraft] = useState<LegendConfig>(structuredClone(DEFAULT_LEGEND));

  // Per-tooth photos (progress documentation across visits)
  const [toothPhotos, setToothPhotos] = useState<FileAsset[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [toothPhotoCaptureOpen, setToothPhotoCaptureOpen] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<FileAsset | null>(null);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<FileAsset | null>(null);

  const chart = allCharts[currentIndex] || null;
  const conditionToPDA = useMemo(() => buildConditionToPDA(legendConfig), [legendConfig]);
  const groupedConditions = useMemo(() => buildGroupedConditions(legendConfig), [legendConfig]);
  const conditionLabels = useMemo(() => buildConditionLabels(legendConfig), [legendConfig]);

  const fetchCharts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDentalCharts(patientId);
      setAllCharts(data);
      setCurrentIndex(0);
    } catch {
      setAllCharts([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const handleCreateChart = async () => {
    setCreatingChart(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.createDentalChart(patientId, today);
      await fetchCharts();
      setCurrentIndex(0);
      showToast('success', 'New dental chart created');
    } catch {
      showToast('error', 'Failed to create chart');
    } finally {
      setCreatingChart(false);
    }
  };

  const goToPrev = () => setCurrentIndex((i) => Math.min(i + 1, allCharts.length - 1));
  const goToNext = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const getToothRecord = (num: number): ToothRecord | undefined =>
    chart?.teeth.find((t) => t.tooth_number === num);

  const getPrimaryCondition = (num: number) => {
    const rec = getToothRecord(num);
    if (!rec || rec.conditions.length === 0) return null;
    const priority: ToothCondition[] = [
      'extraction', 'caries', 'root_fragment', 'impacted',
      'jacket_crown', 'amalgam', 'abutment', 'pontic', 'inlay',
      'removable_denture',
      'composite_filling', 'temporary_filling', 'missing', 'congenitally_missing',
      'supernumerary', 'present',
    ];
    for (const c of priority) {
      if (rec.conditions.includes(c)) return c;
    }
    return null;
  };

  const openToothEditor = (num: number) => {
    const rec = getToothRecord(num);
    setSelectedTooth(num);
    setToothConditions(rec?.conditions || []);
    setToothNotes(rec?.notes || '');
  };

  const autoSaveTooth = useCallback(async (toothNum: number, conditions: ToothCondition[], notes: string) => {
    if (!chart) return;
    const chartId = chart.chart_id;
    setSavingTooth(true);
    try {
      await api.updateToothRecord(patientId, chartId, {
        tooth_number: toothNum,
        conditions,
        notes,
        updated_at: nowISO(),
      });
      const savedAt = nowISO();
      setAllCharts((prev) =>
        prev.map((c) => {
          if (c.chart_id !== chartId) return c;
          const next: ToothRecord = { tooth_number: toothNum, conditions, notes, updated_at: savedAt };
          const idx = c.teeth.findIndex((t) => t.tooth_number === toothNum);
          const teeth = idx >= 0
            ? c.teeth.map((t, i) => (i === idx ? next : t))
            : [...c.teeth, next];
          return { ...c, teeth, updated_at: savedAt };
        }),
      );
      onChartUpdate?.();
    } catch {
      showToast('error', 'Failed to save');
    } finally {
      setSavingTooth(false);
    }
  }, [chart, patientId, onChartUpdate]);

  const toggleCondition = (cond: ToothCondition) => {
    if (selectedTooth === null) return;
    const newConditions = toothConditions.includes(cond)
      ? toothConditions.filter((c) => c !== cond)
      : [...toothConditions, cond];
    setToothConditions(newConditions);
    autoSaveTooth(selectedTooth, newConditions, toothNotes);
  };

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNotesChange = (value: string) => {
    setToothNotes(value);
    if (selectedTooth === null) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    const tooth = selectedTooth;
    const conditions = toothConditions;
    notesTimerRef.current = setTimeout(() => {
      autoSaveTooth(tooth, conditions, value);
    }, 800);
  };

  // Load tooth photos whenever a tooth is selected; clear when modal closes.
  useEffect(() => {
    if (selectedTooth === null) {
      setToothPhotos([]);
      return;
    }
    let cancelled = false;
    setLoadingPhotos(true);
    api.getToothPhotos(patientId, selectedTooth)
      .then((rows) => {
        if (!cancelled) setToothPhotos(rows);
      })
      .catch(() => {
        if (!cancelled) setToothPhotos([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotos(false);
      });
    return () => { cancelled = true; };
  }, [selectedTooth, patientId]);

  const handleToothPhotoCapture = async (dataUrl: string) => {
    if (selectedTooth === null) return;
    try {
      const created = await api.addToothPhoto({
        patient_id: patientId,
        tooth_number: selectedTooth,
        file_url: dataUrl,
      });
      setToothPhotos((prev) => [created, ...prev]);
      showToast('success', 'Photo saved to tooth history');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to save photo', message);
    }
  };

  const confirmDeleteToothPhoto = async () => {
    if (!deletePhotoTarget) return;
    try {
      await api.deleteFile(deletePhotoTarget.file_id);
      setToothPhotos((prev) => prev.filter((p) => p.file_id !== deletePhotoTarget.file_id));
      setDeletePhotoTarget(null);
      if (enlargedPhoto?.file_id === deletePhotoTarget.file_id) setEnlargedPhoto(null);
      showToast('success', 'Photo deleted');
    } catch {
      showToast('error', 'Failed to delete photo');
    }
  };

  if (loading) return <LoadingSpinner text="Loading dental chart..." />;

  return (
    <div className="space-y-6">
      {/* ── PDA-Style Dental Record Chart ─────────────────────── */}
      <Card padding={false}>
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">
              Dental Record Chart
            </h3>
            <Button size="sm" onClick={handleCreateChart} loading={creatingChart}>
              + New Chart
            </Button>
          </div>

          {/* ── Slideshow Navigation ── */}
          {allCharts.length > 0 ? (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={goToPrev}
                disabled={currentIndex >= allCharts.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">
                  {formatDate(chart?.date || '')}
                </p>
                <p className="text-[10px] text-gray-400">
                  {currentIndex === 0 ? 'Latest' : `${currentIndex} visit${currentIndex > 1 ? 's' : ''} ago`}
                  {' '}&middot; {allCharts.length} total record{allCharts.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={goToNext}
                disabled={currentIndex <= 0}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          ) : (
            <p className="mt-2 text-center text-xs text-gray-400">
              No dental charts yet. Create one to get started.
            </p>
          )}

          {/* ── Dot indicators ── */}
          {allCharts.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {allCharts.map((c, i) => (
                <button
                  key={c.chart_id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    i === currentIndex ? 'bg-primary-500 scale-125' : 'bg-gray-300 hover:bg-gray-400',
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {chart && <div className="px-4 py-5 sm:px-6">
          {/* STATUS + TEMPORARY + PERMANENT rows (upper) */}
          <div className="overflow-x-auto">
            <div className="mx-auto" style={{ minWidth: 700, maxWidth: 900 }}>

              {/* ── Status boxes (upper) ── */}
              <div className="mb-1 flex items-center">
                <span className="w-24 shrink-0 text-right pr-2 text-[10px] font-bold uppercase text-gray-500">
                  Status<br/>Right
                </span>
                <div className="flex flex-1 justify-center">
                  <div className="flex">
                    {ADULT_TEETH_UPPER.slice(0, 8).map((num) => {
                      const pda = conditionToPDA[getPrimaryCondition(num) || ''];
                      return (
                        <div key={num} className="flex h-5 w-[42px] items-center justify-center border border-gray-300 bg-white text-[9px] font-bold text-gray-500">
                          {pda ? <span style={{ color: pda.fill }}>{pda.code}</span> : ''}
                        </div>
                      );
                    })}
                    <div className="w-2" />
                    {ADULT_TEETH_UPPER.slice(8).map((num) => {
                      const pda = conditionToPDA[getPrimaryCondition(num) || ''];
                      return (
                        <div key={num} className="flex h-5 w-[42px] items-center justify-center border border-gray-300 bg-white text-[9px] font-bold text-gray-500">
                          {pda ? <span style={{ color: pda.fill }}>{pda.code}</span> : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <span className="w-24 shrink-0 pl-2 text-[10px] font-bold uppercase text-gray-500">
                  Left
                </span>
              </div>

              {/* ── Temporary teeth (upper) ── */}
              <div className="mb-1 flex items-center">
                <span className="w-24 shrink-0 text-right pr-2 text-[10px] font-semibold uppercase text-gray-400">
                  Temporary<br/>Teeth
                </span>
                <div className="flex flex-1 justify-center">
                  <div className="flex items-center">
                    {CHILD_TEETH_UPPER.slice(0, 5).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={34}
                        isChild
                        pdaMap={conditionToPDA}
                      />
                    ))}
                    <div className="w-2" />
                    {CHILD_TEETH_UPPER.slice(5).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={34}
                        isChild
                        pdaMap={conditionToPDA}
                      />
                    ))}
                  </div>
                </div>
                <span className="w-24 shrink-0" />
              </div>

              {/* ── Permanent teeth (upper) ── */}
              <div className="mb-1 flex items-center">
                <span className="w-24 shrink-0 text-right pr-2 text-[10px] font-bold uppercase text-gray-500">
                  Permanent<br/>Teeth
                </span>
                <div className="flex flex-1 justify-center">
                  <div className="flex items-center">
                    {ADULT_TEETH_UPPER.slice(0, 8).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={42}
                        pdaMap={conditionToPDA}
                      />
                    ))}
                    <div className="mx-0.5 flex h-[42px] w-4 items-center justify-center">
                      <div className="h-full w-px bg-gray-800" />
                    </div>
                    {ADULT_TEETH_UPPER.slice(8).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={42}
                        pdaMap={conditionToPDA}
                      />
                    ))}
                  </div>
                </div>
                <span className="w-24 shrink-0 pl-2 text-[10px] font-bold uppercase text-gray-500">
                  TMD
                </span>
              </div>

              {/* ── R / L divider labels ── */}
              <div className="mb-1 flex items-center">
                <span className="w-24 shrink-0" />
                <div className="flex flex-1 justify-center">
                  <div className="flex" style={{ width: 'fit-content' }}>
                    <span className="pr-2 text-[10px] font-bold text-gray-600">RIGHT</span>
                    <span className="flex-1" />
                    <span className="pl-2 text-[10px] font-bold text-gray-600">LEFT</span>
                  </div>
                </div>
                <span className="w-24 shrink-0" />
              </div>

              {/* ── Permanent teeth (lower) ── */}
              <div className="mb-1 flex items-center">
                <span className="w-24 shrink-0 text-right pr-2 text-[10px] font-bold uppercase text-gray-500">
                  Permanent<br/>Teeth
                </span>
                <div className="flex flex-1 justify-center">
                  <div className="flex items-center">
                    {ADULT_TEETH_LOWER.slice(0, 8).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={42}
                        pdaMap={conditionToPDA}
                      />
                    ))}
                    <div className="mx-0.5 flex h-[42px] w-4 items-center justify-center">
                      <div className="h-full w-px bg-gray-800" />
                    </div>
                    {ADULT_TEETH_LOWER.slice(8).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={42}
                        pdaMap={conditionToPDA}
                      />
                    ))}
                  </div>
                </div>
                <span className="w-24 shrink-0" />
              </div>

              {/* ── Temporary teeth (lower) ── */}
              <div className="mb-1 flex items-center">
                <span className="w-24 shrink-0 text-right pr-2 text-[10px] font-semibold uppercase text-gray-400">
                  Temporary<br/>Teeth
                </span>
                <div className="flex flex-1 justify-center">
                  <div className="flex items-center">
                    {CHILD_TEETH_LOWER.slice(0, 5).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={34}
                        isChild
                        pdaMap={conditionToPDA}
                      />
                    ))}
                    <div className="w-2" />
                    {CHILD_TEETH_LOWER.slice(5).map((num) => (
                      <PDAToothSVG
                        key={num}
                        number={num}
                        condition={getPrimaryCondition(num)}
                        isSelected={selectedTooth === num}
                        onClick={() => openToothEditor(num)}
                        size={34}
                        isChild
                        pdaMap={conditionToPDA}
                      />
                    ))}
                  </div>
                </div>
                <span className="w-24 shrink-0" />
              </div>

              {/* ── Status boxes (lower) ── */}
              <div className="flex items-center">
                <span className="w-24 shrink-0 text-right pr-2 text-[10px] font-bold uppercase text-gray-500">
                  Status<br/>Right
                </span>
                <div className="flex flex-1 justify-center">
                  <div className="flex">
                    {ADULT_TEETH_LOWER.slice(0, 8).map((num) => {
                      const pda = conditionToPDA[getPrimaryCondition(num) || ''];
                      return (
                        <div key={num} className="flex h-5 w-[42px] items-center justify-center border border-gray-300 bg-white text-[9px] font-bold text-gray-500">
                          {pda ? <span style={{ color: pda.fill }}>{pda.code}</span> : ''}
                        </div>
                      );
                    })}
                    <div className="w-2" />
                    {ADULT_TEETH_LOWER.slice(8).map((num) => {
                      const pda = conditionToPDA[getPrimaryCondition(num) || ''];
                      return (
                        <div key={num} className="flex h-5 w-[42px] items-center justify-center border border-gray-300 bg-white text-[9px] font-bold text-gray-500">
                          {pda ? <span style={{ color: pda.fill }}>{pda.code}</span> : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <span className="w-24 shrink-0 pl-2 text-[10px] font-bold uppercase text-gray-500">
                  Left
                </span>
              </div>
            </div>
          </div>

          {/* ── PDA Legend (Editable) ── */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Legend
              </h4>
              {!editingLegend ? (
                <button
                  onClick={() => { setEditLegendDraft(structuredClone(legendConfig)); setEditingLegend(true); }}
                  className="text-[10px] font-medium text-primary-600 hover:text-primary-800"
                >
                  Edit Legend
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditLegendDraft(structuredClone(DEFAULT_LEGEND)); }}
                    className="text-[10px] font-medium text-gray-400 hover:text-gray-600"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={() => setEditingLegend(false)}
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setLegendConfig(editLegendDraft); setEditingLegend(false); showToast('success', 'Legend saved'); }}
                    className="text-[10px] font-medium text-primary-600 hover:text-primary-800"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {!editingLegend ? (
              /* ── View Mode ── */
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
                {(['condition', 'restoration', 'surgery'] as const).map((group) => {
                  const titles = { condition: 'Condition', restoration: 'Restoration & Prosthetics', surgery: 'Surgery' };
                  return (
                    <div key={group}>
                      <h5 className="mb-1 text-[10px] font-bold text-gray-600 underline">{titles[group]}</h5>
                      {legendConfig[group].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5 py-0.5">
                          <span className="w-5 text-center text-[10px] font-bold" style={{ color: item.color }}>{item.code}</span>
                          <span className="text-[10px] text-gray-600">- {item.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Edit Mode ── */
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                {(['condition', 'restoration', 'surgery'] as const).map((group) => {
                  const titles = { condition: 'Condition', restoration: 'Restoration & Prosthetics', surgery: 'Surgery' };
                  const updateItem = (idx: number, field: keyof LegendItem, value: string) => {
                    const next = structuredClone(editLegendDraft);
                    next[group][idx] = { ...next[group][idx], [field]: value };
                    setEditLegendDraft(next);
                  };
                  const removeItem = (idx: number) => {
                    const next = structuredClone(editLegendDraft);
                    next[group].splice(idx, 1);
                    setEditLegendDraft(next);
                  };
                  const addItem = () => {
                    const next = structuredClone(editLegendDraft);
                    next[group].push({ code: '', label: '', color: '#6b7280' });
                    setEditLegendDraft(next);
                  };
                  return (
                    <div key={group}>
                      <h5 className="mb-1.5 text-[10px] font-bold text-gray-600 underline">{titles[group]}</h5>
                      <div className="space-y-1">
                        {editLegendDraft[group].map((item, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <input
                              type="color"
                              value={item.color}
                              onChange={(e) => updateItem(i, 'color', e.target.value)}
                              className="h-5 w-5 cursor-pointer rounded border-0 p-0"
                            />
                            <input
                              type="text"
                              value={item.code}
                              onChange={(e) => updateItem(i, 'code', e.target.value)}
                              placeholder="Code"
                              className="w-10 rounded border border-gray-300 px-1 py-0.5 text-[10px] font-bold text-center"
                            />
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updateItem(i, 'label', e.target.value)}
                              placeholder="Label"
                              className="flex-1 rounded border border-gray-300 px-1.5 py-0.5 text-[10px]"
                            />
                            <button
                              onClick={() => removeItem(i)}
                              className="text-red-400 hover:text-red-600"
                              title="Remove"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={addItem}
                        className="mt-1 text-[10px] font-medium text-primary-600 hover:text-primary-800"
                      >
                        + Add Item
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Periodontal / Occlusion / TMD ── */}
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-4">
            <div>
              <h5 className="mb-1.5 text-[10px] font-bold uppercase text-gray-500">Periodontal Screening</h5>
              {['Gingivitis', 'Early Periodontitis', 'Moderate Periodontitis', 'Advanced Periodontitis'].map((item) => (
                <label key={item} className="flex items-center gap-1.5 py-0.5">
                  <input type="checkbox" className="h-3 w-3 rounded border-gray-300 text-primary-600" />
                  <span className="text-[10px] text-gray-600">{item}</span>
                </label>
              ))}
            </div>
            <div>
              <h5 className="mb-1.5 text-[10px] font-bold uppercase text-gray-500">Occlusion</h5>
              {['Class (Molar)', 'Overjet', 'Overbite', 'Midline Deviation', 'Crossbite'].map((item) => (
                <label key={item} className="flex items-center gap-1.5 py-0.5">
                  <input type="checkbox" className="h-3 w-3 rounded border-gray-300 text-primary-600" />
                  <span className="text-[10px] text-gray-600">{item}</span>
                </label>
              ))}
            </div>
            <div>
              <h5 className="mb-1.5 text-[10px] font-bold uppercase text-gray-500">Appliances</h5>
              {['Orthodontic', 'Stayplate', 'Others'].map((item) => (
                <label key={item} className="flex items-center gap-1.5 py-0.5">
                  <input type="checkbox" className="h-3 w-3 rounded border-gray-300 text-primary-600" />
                  <span className="text-[10px] text-gray-600">{item}</span>
                </label>
              ))}
            </div>
            <div>
              <h5 className="mb-1.5 text-[10px] font-bold uppercase text-gray-500">TMD</h5>
              {['Clenching', 'Clicking', 'Trismus', 'Muscle Spasm'].map((item) => (
                <label key={item} className="flex items-center gap-1.5 py-0.5">
                  <input type="checkbox" className="h-3 w-3 rounded border-gray-300 text-primary-600" />
                  <span className="text-[10px] text-gray-600">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>}
      </Card>

      {/* ── Tooth Editor Modal ── */}
      <Modal
        isOpen={selectedTooth !== null}
        onClose={() => setSelectedTooth(null)}
        title={`Tooth #${selectedTooth}`}
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-gray-400">
              {savingTooth ? 'Saving...' : 'Auto-saved'}
            </span>
            <Button variant="outline" onClick={() => setSelectedTooth(null)}>Done</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Mini preview of selected tooth */}
          <div className="flex justify-center">
            <PDAToothSVG
              number={selectedTooth || 0}
              condition={toothConditions.length > 0 ? toothConditions[0] : null}
              isSelected={false}
              onClick={() => {}}
              size={80}
              pdaMap={conditionToPDA}
            />
          </div>
          <div className="space-y-3">
            {groupedConditions.map((group) => (
              <div key={group.group}>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">{group.group}</h4>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map((item) => (
                    <label
                      key={item.key}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-1.5 transition-colors hover:bg-gray-50',
                        toothConditions.includes(item.key as ToothCondition)
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-200',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={toothConditions.includes(item.key as ToothCondition)}
                        onChange={() => toggleCondition(item.key as ToothCondition)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-700">{conditionLabels[item.key] || item.key}</span>
                      <span className="ml-auto text-[10px] font-bold" style={{ color: item.color }}>
                        {item.code}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              value={toothNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Additional notes..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Tooth Photo History */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Photos
                {toothPhotos.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({toothPhotos.length})
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setToothPhotoCaptureOpen(true)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Camera className="h-3.5 w-3.5" />
                Add Photo
              </button>
            </div>
            <p className="mb-2 text-[11px] text-gray-400">
              Document tooth state across visits — newest first.
            </p>
            {loadingPhotos ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-gray-400">
                Loading...
              </p>
            ) : toothPhotos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-gray-400">
                No photos yet for this tooth.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {toothPhotos.map((photo) => (
                  <ToothPhotoThumb
                    key={photo.file_id}
                    photo={photo}
                    toothNumber={selectedTooth ?? 0}
                    onView={(p) => setEnlargedPhoto(p)}
                    onDelete={(p) => setDeletePhotoTarget(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Photo capture modal for the selected tooth */}
      <PhotoCaptureModal
        isOpen={toothPhotoCaptureOpen}
        onClose={() => setToothPhotoCaptureOpen(false)}
        onCapture={handleToothPhotoCapture}
      />

      {/* Enlarged photo view */}
      <Modal
        isOpen={enlargedPhoto !== null}
        onClose={() => setEnlargedPhoto(null)}
        title={enlargedPhoto ? `Tooth #${selectedTooth} — ${formatDate(enlargedPhoto.uploaded_at)}` : ''}
        size="lg"
      >
        {enlargedPhoto && (
          <div className="space-y-3">
            {isUsableImageUrl(enlargedPhoto.file_url) ? (
              <img
                src={enlargedPhoto.file_url}
                alt={`Tooth #${selectedTooth}`}
                className="mx-auto max-h-[70vh] w-auto rounded-lg"
              />
            ) : (
              <div className="mx-auto flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 text-gray-400">
                <Image className="h-10 w-10" />
                <span className="text-sm">Photo data is missing or invalid.</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatDateRelative(enlargedPhoto.uploaded_at)}</span>
              <button
                type="button"
                onClick={() => setDeletePhotoTarget(enlargedPhoto)}
                className="inline-flex items-center gap-1 text-danger-600 hover:text-danger-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete photo confirmation */}
      <Modal
        isOpen={deletePhotoTarget !== null}
        onClose={() => setDeletePhotoTarget(null)}
        title="Delete Photo"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletePhotoTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteToothPhoto}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Permanently delete this photo? This cannot be undone.
        </p>
      </Modal>

      {/* ── Dental History ── */}
      <Card title={`Dental History (${allCharts.length} record${allCharts.length !== 1 ? 's' : ''})`}>
        {allCharts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No dental records yet. Create a new chart to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Teeth Recorded</th>
                  <th className="px-3 py-2">Findings</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allCharts.map((c, idx) => {
                  const teethWithConditions = c.teeth.filter(
                    (t) => t.conditions.length > 0 && !t.conditions.every((cond) => cond === 'present'),
                  );
                  const conditionSummary = teethWithConditions
                    .slice(0, 3)
                    .map((t) => {
                      const pda = conditionToPDA[t.conditions[0]] || { code: '?', fill: '#94a3b8' };
                      return { tooth: t.tooth_number, code: pda.code, color: pda.fill, label: conditionLabels[t.conditions[0]] || t.conditions[0] };
                    });
                  const remaining = teethWithConditions.length - 3;

                  return (
                    <tr
                      key={c.chart_id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-gray-50',
                        idx === currentIndex && 'bg-primary-50',
                      )}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {idx === currentIndex && (
                            <span className="h-2 w-2 rounded-full bg-primary-500" />
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{formatDate(c.date)}</p>
                            <p className="text-[10px] text-gray-400">{formatDateRelative(c.updated_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm font-medium text-gray-700">{c.teeth.length} teeth</span>
                        <span className="ml-1 text-xs text-gray-400">
                          ({teethWithConditions.length} with findings)
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {conditionSummary.map((s) => (
                            <span
                              key={s.tooth}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                              style={{ borderColor: s.color, color: s.color }}
                            >
                              #{s.tooth} {s.code}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <span className="text-[10px] text-gray-400">+{remaining} more</span>
                          )}
                          {teethWithConditions.length === 0 && (
                            <span className="text-xs text-gray-400">All healthy</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── PDA 5-Surface Tooth SVG ─────────────────────────────────────
function PDAToothSVG({
  number,
  condition,
  isSelected,
  onClick,
  size = 42,
  isChild,
  pdaMap,
}: {
  number: number;
  condition: ToothCondition | null;
  isSelected: boolean;
  onClick: () => void;
  size?: number;
  isChild?: boolean;
  pdaMap?: Record<string, { code: string; fill: string }>;
}) {
  const _pda = pdaMap ?? buildConditionToPDA(DEFAULT_LEGEND);
  const fillColor = condition ? (_pda[condition]?.fill || '#e2e8f0') : '#fff';
  const isMissing = condition === 'missing' || condition === 'congenitally_missing';
  const strokeColor = isSelected ? '#3b82f6' : '#6b7280';
  const strokeWidth = isSelected ? 2.5 : 1.2;

  // 5-surface tooth: Buccal(top), Lingual(bottom), Mesial(left), Distal(right), Occlusal(center)
  // Viewbox 0 0 40 40
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center transition-transform',
        'hover:scale-110 focus:outline-none',
        isSelected && 'scale-110',
      )}
      title={`Tooth #${number}${condition ? ` - ${DEFAULT_CONDITION_LABELS[condition] || condition}` : ''}`}
      style={{ width: size, height: size + 14 }}
    >
      {/* Tooth number */}
      <span className={cn(
        'text-[9px] font-bold leading-none',
        isChild ? 'text-gray-400' : 'text-gray-600',
      )}>
        {number}
      </span>
      <svg
        viewBox="0 0 40 40"
        width={size - 6}
        height={size - 6}
        className="mt-px"
      >
        {/* Outer circle */}
        <circle cx="20" cy="20" r="18" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />

        {isMissing ? (
          /* X mark for missing tooth */
          <>
            <line x1="8" y1="8" x2="32" y2="32" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="32" y1="8" x2="8" y2="32" stroke="#94a3b8" strokeWidth="2.5" />
          </>
        ) : (
          <>
            {/* Buccal (top) */}
            <path
              d="M 20,2 L 32,12 L 28,16 L 12,16 L 8,12 Z"
              fill={condition ? fillColor : 'white'}
              stroke={strokeColor}
              strokeWidth="0.8"
              className="tooth-surface"
              opacity={condition === 'caries' || condition === 'composite_filling' || condition === 'temporary_filling' || !condition ? 1 : 0.5}
            />
            {/* Distal (right) */}
            <path
              d="M 38,20 L 28,32 L 24,28 L 24,12 L 28,8 Z"
              fill={condition ? fillColor : 'white'}
              stroke={strokeColor}
              strokeWidth="0.8"
              className="tooth-surface"
              opacity={0.7}
            />
            {/* Lingual (bottom) */}
            <path
              d="M 20,38 L 8,28 L 12,24 L 28,24 L 32,28 Z"
              fill={condition ? fillColor : 'white'}
              stroke={strokeColor}
              strokeWidth="0.8"
              className="tooth-surface"
              opacity={0.7}
            />
            {/* Mesial (left) */}
            <path
              d="M 2,20 L 12,8 L 16,12 L 16,28 L 12,32 Z"
              fill={condition ? fillColor : 'white'}
              stroke={strokeColor}
              strokeWidth="0.8"
              className="tooth-surface"
              opacity={0.7}
            />
            {/* Occlusal (center) */}
            <rect
              x="12"
              y="12"
              width="16"
              height="16"
              rx="1"
              fill={condition ? fillColor : 'white'}
              stroke={strokeColor}
              strokeWidth="0.8"
              className="tooth-surface"
            />
            {/* PDA code in center */}
            {condition && _pda[condition] && (
              <text
                x="20"
                y="22"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fontWeight="bold"
                fill="white"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="0.3"
              >
                {_pda[condition].code}
              </text>
            )}
          </>
        )}
      </svg>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 4: TREATMENTS
// ═════════════════════════════════════════════════════════════════
function TreatmentsTab({
  patientId,
  patient,
  treatments,
  dentists,
  services,
  onRefresh,
}: {
  patientId: number;
  patient: Patient;
  treatments: TreatmentRecord[];
  dentists: Dentist[];
  services: ServiceItem[];
  onRefresh: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  type ProcedureItem = { name: string; fee: string };
  const [form, setForm] = useState({
    date: todayISO(),
    tooth_numbers: '',
    dentist_id: '',
    notes: '',
    status: 'done',
    // Discount
    discount_type: 'none' as 'none' | 'pwd' | 'senior',
    // Payment fields (always required — no toggle)
    payment_amount: '',
    payment_method: 'cash',
    payment_reference: '',
    // Prescription toggle
    add_prescription: false,
  });
  const [procedures, setProcedures] = useState<ProcedureItem[]>([{ name: '', fee: '' }]);
  const totalFee = procedures.reduce((sum, p) => sum + (parseFloat(p.fee) || 0), 0);
  // PWD/Senior discount: 20% of the 40% non-professional fee portion = 8% of total fee
  const discountRate = form.discount_type !== 'none' ? 0.08 : 0;
  const discountAmount = Math.round(totalFee * discountRate * 100) / 100;
  const netFee = totalFee - discountAmount;
  const [rxItems, setRxItems] = useState<{ drug_name: string; dosage: string; quantity: number; sig: string }[]>([]);
  const [rxNotes, setRxNotes] = useState('');
  const [drugCatalog, setDrugCatalog] = useState<Drug[]>([]);

  // Record Payment modal for existing treatments
  const [payModalTx, setPayModalTx] = useState<TreatmentRecord | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', date: todayISO() });
  const [paySaving, setPaySaving] = useState(false);

  // Edit treatment modal state
  const [editTx, setEditTx] = useState<TreatmentRecord | null>(null);
  const [editTxForm, setEditTxForm] = useState({
    date: '', procedure_type: '', dentist_id: '',
    tooth_numbers: '', fee: '', status: 'done', notes: '',
  });
  const [editTxSaving, setEditTxSaving] = useState(false);

  const openEditTx = (tx: TreatmentRecord) => {
    setEditTx(tx);
    setEditTxForm({
      date: tx.date,
      procedure_type: tx.procedure_type,
      dentist_id: String(tx.dentist_id),
      tooth_numbers: (tx.tooth_numbers || []).join(', '),
      fee: String(tx.fee_charged_int / 100),
      status: tx.status,
      notes: tx.notes || '',
    });
  };

  const handleSaveEditTx = async () => {
    if (!editTx) return;
    const fee = Number(editTxForm.fee);
    if (!editTxForm.date || !editTxForm.procedure_type.trim() || !editTxForm.dentist_id || isNaN(fee) || fee < 0) {
      showToast('error', 'Please fill in date, procedure, dentist, and a valid fee.');
      return;
    }
    const teeth = editTxForm.tooth_numbers
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 11 && n <= 85);

    setEditTxSaving(true);
    try {
      await api.updateTreatment(editTx.treatment_id, {
        date: editTxForm.date,
        procedure_type: editTxForm.procedure_type.trim(),
        dentist_id: Number(editTxForm.dentist_id),
        tooth_numbers: teeth,
        fee_charged_int: pesosToCentavos(fee),
        status: editTxForm.status as 'planned' | 'in_progress' | 'done',
        notes: editTxForm.notes,
      });
      showToast('success', 'Treatment updated');
      setEditTx(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to update treatment', msg);
    } finally {
      setEditTxSaving(false);
    }
  };

  const handleDeleteTx = async (tx: TreatmentRecord) => {
    if (!confirm(`Delete this treatment?\n\n${tx.procedure_type}\n${formatDate(tx.date)} — ${formatMoney(tx.fee_charged_int)}\n\nThis cannot be undone.`)) return;
    try {
      await api.deleteTreatment(tx.treatment_id);
      showToast('success', 'Treatment deleted');
      onRefresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to delete treatment', msg);
    }
  };

  // Fetch drug catalog + latest dental chart
  const [latestChart, setLatestChart] = useState<DentalChart | null>(null);
  useEffect(() => {
    api.getDrugs().then(setDrugCatalog).catch(() => {});
    api.getDentalChart(patientId).then((c) => setLatestChart(c ?? null)).catch(() => {});
  }, [patientId]);

  // Teeth with conditions from the latest chart (for tooth picker)
  const chartTeethOptions = useMemo(() => {
    if (!latestChart) return [];
    return latestChart.teeth
      .filter((t) => t.conditions.length > 0)
      .map((t) => ({
        number: t.tooth_number,
        label: `#${t.tooth_number}`,
        conditions: t.conditions,
      }))
      .sort((a, b) => a.number - b.number);
  }, [latestChart]);

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  // Quick-add states
  const [addDentistOpen, setAddDentistOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [newDentist, setNewDentist] = useState({ first_name: '', last_name: '', specialization: 'General Dentistry', license_no: '' });
  const [newService, setNewService] = useState({ name: '', default_price: '', category: 'General' });
  const [localDentists, setLocalDentists] = useState(dentists);
  const [localServices, setLocalServices] = useState(services);

  useEffect(() => { setLocalDentists(dentists); }, [dentists]);
  useEffect(() => { setLocalServices(services); }, [services]);

  // Auto-select the first dentist when the list loads (especially handy
  // for single-dentist clinics — no need to pick from a one-item dropdown).
  useEffect(() => {
    if (!form.dentist_id && localDentists.length > 0) {
      setForm((prev) => (prev.dentist_id ? prev : { ...prev, dentist_id: String(localDentists[0].dentist_id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDentists]);

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
      setForm((prev) => ({ ...prev, dentist_id: String(created.dentist_id) }));
      setAddDentistOpen(false);
      setNewDentist({ first_name: '', last_name: '', specialization: 'General Dentistry', license_no: '' });
      showToast('success', `Dr. ${created.last_name} added`);
      onRefresh();
    } catch {
      showToast('error', 'Failed to add dentist');
    }
  };

  const handleQuickAddService = async () => {
    if (!newService.name) return;
    try {
      const created = await api.createService({
        name: newService.name,
        category: newService.category,
        default_price_int: Math.round(Number(newService.default_price) * 100) || 0,
        description: '',
        is_active: true,
      });
      setLocalServices((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, procedure_type: created.name, fee_charged: newService.default_price || '' }));
      setAddServiceOpen(false);
      setNewService({ name: '', default_price: '', category: 'General' });
      showToast('success', `${created.name} added`);
      onRefresh();
    } catch {
      showToast('error', 'Failed to add service');
    }
  };

  // Load clinic settings
  useEffect(() => {
    (async () => {
      try {
        const settings = await api.getClinicSettings();
        setClinicSettings(settings);
      } catch {
        // silent
      }
    })();
  }, []);

  const getDentistName = (dentistId: number): string => {
    const d = dentists.find((doc) => doc.dentist_id === dentistId);
    return d ? `Dr. ${d.last_name}` : '--';
  };

  const getDentist = (dentistId: number): Dentist | undefined => {
    return dentists.find((doc) => doc.dentist_id === dentistId);
  };

  // Print treatment receipt
  const printTreatmentReceipt = (txs: TreatmentRecord | TreatmentRecord[]) => {
    const txList = Array.isArray(txs) ? txs : [txs];
    if (txList.length === 0) return;

    const clinic = clinicSettings;
    const pName = getFullName(patient);
    const pAge = computeAge(patient.birthdate);
    const pAddress = [patient.address_street, patient.address_barangay, patient.address_city, patient.address_province].filter(Boolean).join(', ');

    const logoSrc = clinic?.logo || '';
    const logoSize = clinic?.logo_size_px ?? 44;
    const logoPosX = clinic?.logo_pos_x_pct ?? 0;
    const logoPosY = clinic?.logo_pos_y_px ?? 0;
    const logoOnLeft = logoPosX <= 50;
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:4px;" />`
      : `<div style="width:${logoSize}px;height:${logoSize}px;background:#000;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(logoSize * 0.36)}px;font-weight:bold;">${(clinic?.clinic_name || 'DC').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>`;
    const headerTextAlign = logoOnLeft ? 'right' : 'left';

    // Build row HTML helper
    const buildRowHtml = (tx: TreatmentRecord) => {
      const d = getDentist(tx.dentist_id);
      const dName = d ? `Dr. ${d.last_name}` : '--';
      const teeth = tx.tooth_numbers.length > 0 ? tx.tooth_numbers.join(', ') : '--';
      const fee = (tx.fee_charged_int / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });
      const paid = (tx.amount_paid_int / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });
      const bal = ((tx.fee_charged_int - tx.amount_paid_int) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });
      const balRaw = tx.fee_charged_int - tx.amount_paid_int;
      return `<tr>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px;white-space:nowrap">${formatDate(tx.date)}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px">${tx.procedure_type}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px;text-align:center">${teeth}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px">${dName}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px;text-align:right">&#8369;${fee}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px;text-align:right">&#8369;${paid}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:9px;text-align:right;font-weight:${balRaw > 0 ? '600' : '400'};color:${balRaw > 0 ? '#dc2626' : '#1a1a1a'}">&#8369;${bal}</td>
      </tr>`;
    };

    // Paginate: first page fits ~12 rows (has header/patient info), continuation ~20
    const FIRST_PAGE_ROWS = 12;
    const NEXT_PAGE_ROWS = 20;
    const pages: TreatmentRecord[][] = [];
    let remaining = [...txList];
    pages.push(remaining.splice(0, FIRST_PAGE_ROWS));
    while (remaining.length > 0) pages.push(remaining.splice(0, NEXT_PAGE_ROWS));
    const totalPages = pages.length;

    // Notes (only for items that have notes)
    const notesHtml = txList.filter((tx) => tx.notes).map((tx) => `
      <div style="font-size:8px;color:#555;margin-bottom:2px"><strong>${tx.procedure_type}:</strong> ${tx.notes}</div>
    `).join('');

    // Totals
    const totalFee = txList.reduce((s, t) => s + t.fee_charged_int, 0);
    const totalPaid = txList.reduce((s, t) => s + t.amount_paid_int, 0);
    const totalBal = totalFee - totalPaid;
    const fmtFee = (totalFee / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const fmtPaid = (totalPaid / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const fmtBal = (totalBal / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });

    // Use first treatment's dentist for signature
    const primaryDentist = getDentist(txList[0].dentist_id);
    const sigName = primaryDentist ? `Dr. ${primaryDentist.first_name} ${primaryDentist.last_name}` : 'Unknown';
    const sigLicense = primaryDentist?.license_no || '';

    const tableHead = `<thead><tr>
      <th>Date</th><th>Procedure</th><th class="c">Tooth</th><th>Dentist</th><th class="r">Fee</th><th class="r">Paid</th><th class="r">Balance</th>
    </tr></thead>`;

    const html = `<!DOCTYPE html><html><head>
      <title>Treatment Receipt - ${pName}</title>
      <style>
        /* margin:0 suppresses Chrome/Edge's default page header/footer
           (date, URL, page numbers) and lets the page fill the physical
           paper edge-to-edge. */
        @page { margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; }
        body { font-family:'Segoe UI','Arial',sans-serif; font-size:13px; line-height:1.5; background:#fff; }
        .receipt-page {
          width:100%; min-height:100vh;
          padding:0.5in 0.6in;
          display:flex; flex-direction:column;
          page-break-after:always;
        }
        .receipt-page:last-child { page-break-after:auto; }
        /* Landscape: render the page at portrait dimensions then CSS-zoom
           the whole thing so it becomes an exact miniature of the portrait
           layout, anchored to the top-left half of the landscape sheet.
           min-height = 100vh / 0.65 so the box, after zoom, is exactly the
           landscape page height — eliminates the dead space below the
           footer that appears when min-height was only 11in. */
        @media print and (orientation: landscape) {
          body { margin:0; padding:0; }
          .receipt-page {
            width:8.5in !important;
            min-height:calc(100vh / 0.65) !important;
            height:auto !important;
            padding:0.5in 0.6in !important;
            margin:0 auto 0 0 !important;
            font-size:13px !important;
            zoom:0.65;
            page-break-inside:avoid;
            page-break-after:auto;
          }
        }
        /* Logo absolutely positioned so its size doesn't push the divider line. */
        .receipt-header { position:relative; margin-bottom:10px; padding-bottom:10px; border-bottom:2px solid #000; min-height:60px; }
        .receipt-logo {
          position:absolute;
          bottom:${12 + logoPosY}px;
          left:calc((100% - ${logoSize}px) * ${logoPosX / 100});
          width:${logoSize}px; height:${logoSize}px;
        }
        .receipt-header-info {
          text-align:${headerTextAlign};
          ${logoOnLeft ? `padding-left:${logoSize + 12}px;` : `padding-right:${logoSize + 12}px;`}
        }
        .receipt-header-info h2 { font-size:18px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase; color:#000; }
        .receipt-header-info .sub { font-size:11px; color:#555; margin:2px 0 0; }
        .receipt-title { text-align:center; margin:14px 0 12px; }
        .receipt-title h1 { font-size:20px; font-weight:bold; color:#000; letter-spacing:2px; text-transform:uppercase; }
        .receipt-title .rno { font-size:12px; color:#666; margin-top:3px; }
        .receipt-patient { background:#f8fafc; padding:12px 16px; border-radius:8px; margin-bottom:14px; font-size:13px; }
        .receipt-patient .row { display:flex; margin-bottom:4px; }
        .receipt-patient .label { font-weight:600; color:#555; min-width:100px; }
        .receipt-patient .value { color:#1a1a1a; }
        table.tx-table { width:100%; border-collapse:collapse; margin-bottom:10px; }
        table.tx-table th { padding:8px 10px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#555; border-bottom:2px solid #000; text-align:left; font-weight:700; }
        table.tx-table th.r { text-align:right; }
        table.tx-table th.c { text-align:center; }
        .tx-totals-wrap { margin-top:auto; padding-top:14px; border-top:1px solid #cbd5e1; }
        .tx-totals { display:flex; justify-content:flex-end; }
        .tx-totals table { border-collapse:collapse; }
        .tx-totals td { padding:5px 14px; font-size:13px; }
        .tx-totals td.lbl { color:#555; text-align:right; }
        .tx-totals td.val { text-align:right; font-weight:600; min-width:120px; }
        .tx-totals tr.main td { font-size:16px; font-weight:bold; padding-top:6px; }
        .tx-totals tr.main td.bal { color:#dc2626; }
        .receipt-notes { margin:10px 0; padding:10px 14px; background:#fefce8; border-radius:6px; font-size:12px; }
        .receipt-signature { margin-top:22px; text-align:center; }
        .receipt-signature .sig-block { display:inline-block; min-width:280px; }
        .receipt-signature .line { border-bottom:1px solid #333; padding-bottom:3px; font-weight:600; font-size:14px; }
        .receipt-signature .license { font-size:11px; color:#555; margin-top:3px; }
        .receipt-footer { margin-top:16px; text-align:center; font-size:11px; color:#888; border-top:1px solid #e2e8f0; padding-top:10px; }
        .receipt-toolbar {
          position:fixed; top:0; left:0; right:0; z-index:100;
          background:#000; color:#fff; padding:8px 20px;
          display:flex; align-items:center; justify-content:space-between;
          font-family:system-ui,-apple-system,sans-serif; font-size:13px;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
        }
        .receipt-toolbar button { padding:6px 18px; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; margin-left:8px; }
        .receipt-toolbar .btn-print { background:#fff; color:#000; }
        .receipt-toolbar .btn-close { background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.3); }
        .receipt-content { margin-top:52px; padding:16px; display:flex; flex-direction:column; align-items:center; gap:20px; }
        .page-num { font-size:8px; color:#999; text-align:center; margin-top:4px; }
        @media print { .receipt-toolbar{display:none!important} .receipt-content{margin-top:0;padding:0;gap:0} .page-num{margin-top:auto;padding-top:4px} }
      </style>
    </head><body>
      <div class="receipt-toolbar">
        <span>Treatment Receipt - ${pName}${totalPages > 1 ? ` (${totalPages} pages)` : ''}</span>
        <div>
          <button class="btn-close" onclick="window.close()">Close</button>
          <button class="btn-print" onclick="window.print()">Print</button>
        </div>
      </div>
      <div class="receipt-content">
        ${pages.map((pageTxs, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === totalPages - 1;
          return `<div class="receipt-page">
            ${isFirst ? `
              <div class="receipt-header">
                <div class="receipt-logo">${logoHtml}</div>
                <div class="receipt-header-info">
                  <h2>${clinic?.clinic_name || 'Dental Clinic'}</h2>
                  ${clinic?.address ? `<p class="sub">${clinic.address}</p>` : ''}
                  <p class="sub">${clinic?.phone || ''}${clinic?.phone && clinic?.email ? ' | ' : ''}${clinic?.email || ''}</p>
                </div>
              </div>
              <div class="receipt-title">
                <h1>Treatment Receipt</h1>
                <p class="rno">${txList.length === 1 ? `Receipt No: TR-${txList[0].treatment_id}` : `${txList.length} Treatments`}</p>
              </div>
              <div class="receipt-patient">
                <div class="row"><span class="label">Patient:</span><span class="value">${pName}</span></div>
                <div class="row"><span class="label">Age / Sex:</span><span class="value">${pAge} yrs / ${patient.sex === 'male' ? 'Male' : 'Female'}</span></div>
                ${pAddress ? `<div class="row"><span class="label">Address:</span><span class="value">${pAddress}</span></div>` : ''}
              </div>
            ` : `
              <div style="font-size:9px;color:#888;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;display:flex;justify-content:space-between">
                <span>${pName} — Treatment Receipt (cont.)</span>
                <span>${clinic?.clinic_name || ''}</span>
              </div>
            `}

            <table class="tx-table">
              ${tableHead}
              <tbody>${pageTxs.map(buildRowHtml).join('')}</tbody>
            </table>

            ${isLast ? `
              ${notesHtml ? `<div class="receipt-notes">${notesHtml}</div>` : ''}
              <div class="tx-totals-wrap">
                <div class="tx-totals">
                  <table>
                    <tr><td class="lbl">Total Fee</td><td class="val">&#8369;${fmtFee}</td></tr>
                    <tr><td class="lbl">Total Paid</td><td class="val">&#8369;${fmtPaid}</td></tr>
                    <tr class="main"><td class="lbl">Balance Due</td><td class="val ${totalBal > 0 ? 'bal' : ''}">&#8369;${fmtBal}</td></tr>
                  </table>
                </div>
              </div>
              <div class="receipt-signature">
                <div class="sig-block">
                  <div class="line">${sigName}, D.M.D.</div>
                  <p class="license">License No.: ${sigLicense || '___________'}</p>
                </div>
              </div>
              <div class="receipt-footer">
                <p>Thank you for choosing ${clinic?.clinic_name || 'our clinic'}!</p>
                <p>This serves as your official treatment receipt.</p>
              </div>
            ` : ''}
            ${totalPages > 1 ? `<div class="page-num">Page ${pageIdx + 1} of ${totalPages}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const resetForm = () => {
    setForm({
      date: todayISO(),
      tooth_numbers: '',
      dentist_id: localDentists.length > 0 ? String(localDentists[0].dentist_id) : '',
      notes: '',
      status: 'done',
      discount_type: 'none',
      payment_amount: '',
      payment_method: 'cash',
      payment_reference: '',
      add_prescription: false,
    });
    setProcedures([{ name: '', fee: '' }]);
    setSelectedTeeth([]);
    setRxItems([]);
    setRxNotes('');
  };

  const handleSave = async () => {
    const validProcedures = procedures.filter((p) => p.name.trim());
    if (validProcedures.length === 0) {
      showToast('warning', 'Please add at least one procedure');
      return;
    }
    if (!form.dentist_id) {
      showToast('warning', 'Please select a dentist');
      return;
    }
    const payAmt = parseFloat(form.payment_amount) || 0;
    if (netFee > 0 && payAmt <= 0) {
      showToast('warning', 'Please enter a payment amount');
      return;
    }
    setSaving(true);
    try {
      const toothNums = selectedTeeth;

      // Create one treatment per procedure, applying discount proportionally
      let lastResult: Awaited<ReturnType<typeof api.createTreatmentWithPayment>> | null = null;
      for (let i = 0; i < validProcedures.length; i++) {
        const proc = validProcedures[i];
        const feePhp = parseFloat(proc.fee) || 0;
        const procDiscount = Math.round(feePhp * discountRate * 100) / 100;
        const procNet = feePhp - procDiscount;
        const isLast = i === validProcedures.length - 1;
        const discountLabel = form.discount_type === 'pwd' ? ' [PWD Discount]' : form.discount_type === 'senior' ? ' [Senior Citizen Discount]' : '';
        const notesWithDiscount = form.discount_type !== 'none' && procDiscount > 0
          ? `${form.notes.trim()}${form.notes.trim() ? '. ' : ''}${discountLabel.trim()}: -${formatMoney(pesosToCentavos(procDiscount))} (Original: ${formatMoney(pesosToCentavos(feePhp))})`
          : form.notes.trim();

        lastResult = await api.createTreatmentWithPayment({
          treatment: {
            patient_id: patientId,
            date: form.date,
            tooth_numbers: toothNums,
            procedure_type: proc.name,
            dentist_id: parseInt(form.dentist_id, 10),
            fee_charged_int: pesosToCentavos(procNet),
            amount_paid_int: 0,
            notes: notesWithDiscount,
            status: form.status as 'planned' | 'in_progress' | 'done',
            next_appointment: null,
          },
          // Payment on the last procedure only (covers total net after discount)
          payment: isLast && netFee > 0 && payAmt > 0 ? {
            amount_int: pesosToCentavos(payAmt),
            method: form.payment_method,
            reference_no: form.payment_reference,
            date: form.date,
          } : undefined,
          // Prescription on the first procedure
          prescription: i === 0 && form.add_prescription && rxItems.filter((r) => r.drug_name.trim()).length > 0 ? {
            patient_id: patientId,
            dentist_id: parseInt(form.dentist_id, 10),
            treatment_id: null,
            date: form.date,
            items: rxItems.filter((r) => r.drug_name.trim()),
            notes: rxNotes,
          } : undefined,
        });
      }

      const parts = [`${validProcedures.length} procedure${validProcedures.length > 1 ? 's' : ''} recorded`];
      if (lastResult?.payment) parts.push('payment collected');
      if (lastResult?.prescription) parts.push('prescription added');
      showToast('success', parts.join(', '));
      setModalOpen(false);
      resetForm();
      onRefresh();
    } catch {
      showToast('error', 'Failed to save treatment');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payModalTx) return;
    const amt = parseFloat(payForm.amount) || 0;
    if (amt <= 0) { showToast('warning', 'Enter a valid amount'); return; }
    setPaySaving(true);
    try {
      await api.recordTreatmentPayment({
        treatment_id: payModalTx.treatment_id,
        patient_id: patientId,
        amount_int: pesosToCentavos(amt),
        method: payForm.method,
        reference_no: payForm.reference,
        date: payForm.date,
      });
      showToast('success', 'Payment recorded');
      setPayModalTx(null);
      setPayForm({ amount: '', method: 'cash', reference: '', date: todayISO() });
      onRefresh();
    } catch {
      showToast('error', 'Failed to record payment');
    } finally {
      setPaySaving(false);
    }
  };

  // Auto-fill fee when procedure is selected
  const handleProcedureSelect = (index: number, value: string) => {
    const service = localServices.find((s) => s.name === value);
    setProcedures((prev) => prev.map((p, i) =>
      i === index ? { ...p, name: value, fee: service ? String(service.default_price_int / 100) : p.fee } : p,
    ));
  };

  // ─── Group treatments by [plan #X] tag in notes (for legacy import) ──
  // Each group is either a multi-procedure plan (collapsible header + rows)
  // or a standalone treatment that renders as a single row with no header.
  type TxGroup = {
    key: string;
    planId: string | null;
    planName: string;
    date: string;
    treatments: TreatmentRecord[];
    totalFee: number;
    totalPaid: number;
  };
  const txGroups = useMemo<TxGroup[]>(() => {
    const map = new Map<string, TxGroup>();
    for (const tx of treatments) {
      const m = (tx.notes || '').match(/\[plan #(\d+)\]/);
      const planId = m ? m[1] : null;
      const key = planId ? `plan-${planId}` : `solo-${tx.treatment_id}`;
      if (!map.has(key)) {
        // Pull the plan name from the second segment of "[plan #X] | Name | ..."
        const parts = (tx.notes || '').split('|').map((s) => s.trim());
        const planName = parts[1] && !/^\[plan/.test(parts[1]) ? parts[1] : 'Plan';
        map.set(key, {
          key,
          planId,
          planName,
          date: tx.date,
          treatments: [],
          totalFee: 0,
          totalPaid: 0,
        });
      }
      const g = map.get(key)!;
      g.treatments.push(tx);
      g.totalFee += tx.fee_charged_int;
      g.totalPaid += tx.amount_paid_int;
      if (tx.date > g.date) g.date = tx.date;
    }
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [treatments]);

  const togglePlan = (key: string) =>
    setExpandedPlans((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">
          Treatment Records
        </h3>
        <div className="flex items-center gap-2">
          {selectedTxIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => {
                const selected = treatments.filter((t) => selectedTxIds.has(t.treatment_id));
                if (selected.length > 0) printTreatmentReceipt(selected);
              }}
            >
              Print {selectedTxIds.size} Selected
            </Button>
          )}
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          >
            Add Treatment
          </Button>
        </div>
      </div>

      <Card padding={false}>
        {treatments.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No treatments yet"
            description="Add the patient's first treatment record."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setModalOpen(true)}
              >
                Add Treatment
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th className="w-8">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    checked={treatments.length > 0 && selectedTxIds.size === treatments.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTxIds(new Set(treatments.map((t) => t.treatment_id)));
                      else setSelectedTxIds(new Set());
                    }}
                  />
                </Th>
                <Th>Date</Th>
                <Th>Tooth #</Th>
                <Th>Procedure</Th>
                <Th>Dentist</Th>
                <Th className="text-right">Charged</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Balance</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {txGroups.map((g) => {
                const isPlan = g.planId !== null && g.treatments.length > 1;
                const expanded = !isPlan || expandedPlans.has(g.key);
                const groupBalance = g.totalFee - g.totalPaid;
                return (
                  <Fragment key={g.key}>
                    {isPlan && (
                      <Tr className="bg-primary-50/40 hover:bg-primary-50/60">
                        <Td>
                          <button
                            type="button"
                            onClick={() => togglePlan(g.key)}
                            className="text-primary-600 hover:text-primary-800"
                            title={expanded ? 'Collapse plan' : 'Expand plan'}
                          >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </Td>
                        <Td className="whitespace-nowrap font-medium text-gray-800">
                          {formatDate(g.date)}
                        </Td>
                        <Td colSpan={3}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary-700">{g.planName}</span>
                            <Badge variant="info">{g.treatments.length} procedures</Badge>
                          </div>
                        </Td>
                        <Td className="text-right whitespace-nowrap font-medium text-gray-800">
                          {formatMoney(g.totalFee)}
                        </Td>
                        <Td className="text-right whitespace-nowrap text-gray-700">
                          {formatMoney(g.totalPaid)}
                        </Td>
                        <Td className="text-right whitespace-nowrap">
                          <span className={cn(groupBalance > 0 && 'font-semibold text-danger-600')}>
                            {formatMoney(groupBalance)}
                          </span>
                        </Td>
                        <Td />
                      </Tr>
                    )}
                    {expanded && g.treatments.map((tx) => {
                      const bal = tx.fee_charged_int - tx.amount_paid_int;
                      return (
                        <Tr key={tx.treatment_id} className={isPlan ? 'bg-primary-50/10' : ''}>
                          <Td>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                              checked={selectedTxIds.has(tx.treatment_id)}
                              onChange={(e) => {
                                setSelectedTxIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(tx.treatment_id);
                                  else next.delete(tx.treatment_id);
                                  return next;
                                });
                              }}
                            />
                          </Td>
                          <Td className={cn('whitespace-nowrap', isPlan && 'pl-8 text-gray-500 text-xs')}>
                            {isPlan ? '' : formatDate(tx.date)}
                          </Td>
                          <Td>
                            {tx.tooth_numbers.length > 0 ? tx.tooth_numbers.join(', ') : '--'}
                          </Td>
                          <Td className="font-medium text-gray-800">
                            {tx.procedure_type}
                          </Td>
                          <Td>{getDentistName(tx.dentist_id)}</Td>
                          <Td className="text-right whitespace-nowrap">
                            {formatMoney(tx.fee_charged_int)}
                          </Td>
                          <Td className="text-right whitespace-nowrap">
                            {formatMoney(tx.amount_paid_int)}
                          </Td>
                          <Td className="text-right whitespace-nowrap">
                            <span className={cn(bal > 0 && 'font-semibold text-danger-600')}>
                              {formatMoney(bal)}
                            </span>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-1">
                              {bal > 0 && (
                                <button
                                  onClick={() => {
                                    setPayModalTx(tx);
                                    setPayForm({ amount: String(bal / 100), method: 'cash', reference: '', date: todayISO() });
                                  }}
                                  className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                                  title="Record Payment"
                                >
                                  Pay
                                </button>
                              )}
                              <button
                                onClick={() => openEditTx(tx)}
                                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title="Edit treatment"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => printTreatmentReceipt(tx)}
                                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title="Print Receipt"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx)}
                                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                                title="Delete treatment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>

      {/* Add Treatment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Treatment"
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Treatment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tooth</label>
              {chartTeethOptions.length > 0 ? (
                <>
                  <select
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      if (num && !selectedTeeth.includes(num)) setSelectedTeeth((prev) => [...prev, num]);
                      e.target.value = '';
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 sm:py-2 text-sm text-gray-900 min-h-[44px] focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Select tooth...</option>
                    {chartTeethOptions.filter((t) => !selectedTeeth.includes(t.number)).map((t) => {
                      const mainCondition = t.conditions.find((c) => c !== 'present') || t.conditions[0];
                      const label = DEFAULT_CONDITION_LABELS[mainCondition] || mainCondition;
                      return (
                        <option key={t.number} value={t.number}>
                          #{t.number} — {label}
                        </option>
                      );
                    })}
                  </select>
                  {selectedTeeth.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {selectedTeeth.map((num) => {
                        const t = chartTeethOptions.find((o) => o.number === num);
                        const mainCondition = t?.conditions.find((c) => c !== 'present') || t?.conditions[0] || '';
                        const label = DEFAULT_CONDITION_LABELS[mainCondition] || mainCondition;
                        return (
                          <span
                            key={num}
                            className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
                          >
                            #{num} {label}
                            <button
                              type="button"
                              onClick={() => setSelectedTeeth((prev) => prev.filter((n) => n !== num))}
                              className="ml-0.5 text-primary-400 hover:text-primary-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400 py-2">No teeth in dental chart yet.</p>
              )}
            </div>
          </div>

          <SelectWithAdd
            label="Dentist *"
            placeholder="Select dentist"
            value={form.dentist_id}
            onChange={(v) => setForm((prev) => ({ ...prev, dentist_id: v }))}
            options={localDentists.map((d) => ({
              value: String(d.dentist_id),
              label: `Dr. ${d.first_name} ${d.last_name}`,
            }))}
            addLabel="+ Add New Dentist"
            onAdd={() => setAddDentistOpen(true)}
          />

          {/* Procedures List — card-style like prescriptions */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Procedures <span className="text-danger-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setProcedures((prev) => [...prev, { name: '', fee: '' }])}
                className="inline-flex items-center gap-1 rounded-md border border-primary-300 px-2.5 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {procedures.map((proc, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Item {idx + 1}
                    </span>
                    {procedures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setProcedures((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove this procedure"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Procedure</label>
                      <SelectWithAdd
                        placeholder="Select procedure"
                        value={proc.name}
                        onChange={(v) => handleProcedureSelect(idx, v)}
                        options={localServices.map((s) => ({
                          value: s.name,
                          label: `${s.name} (${formatMoney(s.default_price_int)})`,
                        }))}
                        addLabel="+ Add New Procedure"
                        onAdd={() => setAddServiceOpen(true)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Fee (PHP)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={proc.fee}
                        onChange={(e) => setProcedures((prev) => prev.map((p, i) => i === idx ? { ...p, fee: e.target.value } : p))}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 sm:py-2 text-sm text-gray-900 min-h-[44px] focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {procedures.length > 1 && (
              <p className="mt-2 text-right text-sm font-semibold text-gray-700">
                Subtotal: {formatMoney(pesosToCentavos(totalFee))}
              </p>
            )}
          </div>

          {/* ── PWD / Senior Discount ── */}
          {totalFee > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
              <label className="mb-2 block text-sm font-semibold text-purple-800">Discount</label>
              <div className="flex flex-wrap gap-3">
                {([['none', 'No Discount'], ['pwd', 'PWD (20% of 40%)'], ['senior', 'Senior Citizen (20% of 40%)']] as const).map(([val, lbl]) => (
                  <label key={val} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="discount_type"
                      value={val}
                      checked={form.discount_type === val}
                      onChange={() => setForm((prev) => ({
                        ...prev,
                        discount_type: val,
                        // Sync payment amount to net fee whenever the discount changes
                        payment_amount: String(
                          totalFee - Math.round(totalFee * (val !== 'none' ? 0.08 : 0) * 100) / 100,
                        ),
                      }))}
                      className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{lbl}</span>
                  </label>
                ))}
              </div>
              {form.discount_type !== 'none' && (
                <div className="mt-3 rounded-md bg-white border border-purple-100 p-3 text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Original Fee</span>
                    <span>{formatMoney(pesosToCentavos(totalFee))}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>40% Non-Professional Fee</span>
                    <span>{formatMoney(pesosToCentavos(totalFee * 0.4))}</span>
                  </div>
                  <div className="flex justify-between text-purple-700 font-medium">
                    <span>{form.discount_type === 'pwd' ? 'PWD' : 'Senior'} Discount (20% of 40%)</span>
                    <span>-{formatMoney(pesosToCentavos(discountAmount))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-purple-100 pt-1">
                    <span>Net Amount</span>
                    <span>{formatMoney(pesosToCentavos(netFee))}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Treatment notes, observations..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* ── Quick Payment Section (always visible — payment is required) ── */}
          {netFee > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-green-800">
                  Collect payment <span className="text-danger-500">*</span>
                </p>
                <div className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-green-700">
                    Total due
                  </p>
                  <p className="text-base font-bold text-green-900 leading-tight">
                    {formatMoney(pesosToCentavos(netFee))}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="Amount (PHP) *"
                  type="number"
                  placeholder={netFee > 0 ? netFee.toFixed(2) : '0.00'}
                  value={form.payment_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_amount: e.target.value }))}
                />
                <Select
                  label="Method *"
                  value={form.payment_method}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'gcash', label: 'GCash' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'card', label: 'Credit/Debit Card' },
                  ]}
                />
                {form.payment_method !== 'cash' && (
                  <Input
                    label="Reference #"
                    placeholder="Transaction ref"
                    value={form.payment_reference}
                    onChange={(e) => setForm((prev) => ({ ...prev, payment_reference: e.target.value }))}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Quick Prescription Section ── */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.add_prescription}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, add_prescription: e.target.checked }));
                  if (e.target.checked && rxItems.length === 0) {
                    setRxItems([{ drug_name: '', dosage: '', quantity: 1, sig: '' }]);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-blue-800">Add prescription</span>
            </label>
            {form.add_prescription && (
              <div className="mt-3 space-y-2">
                {rxItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Drug</label>
                      <input
                        type="text"
                        value={item.drug_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRxItems((prev) => prev.map((r, i) => i === idx ? { ...r, drug_name: val } : r));
                        }}
                        list={`drug-list-${idx}`}
                        placeholder="Search drug..."
                        className="block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <datalist id={`drug-list-${idx}`}>
                        {drugCatalog
                          .filter((d) => d.is_active && (d.generic_name.toLowerCase().includes(item.drug_name.toLowerCase()) || (d.brand_name || '').toLowerCase().includes(item.drug_name.toLowerCase())))
                          .slice(0, 10)
                          .map((d) => (
                            <option key={d.drug_id} value={`${d.generic_name} ${d.strength} ${d.form}`} />
                          ))}
                      </datalist>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Dosage</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => setRxItems((prev) => prev.map((r, i) => i === idx ? { ...r, dosage: e.target.value } : r))}
                        placeholder="500mg"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => setRxItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: parseInt(e.target.value) || 1 } : r))}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-center focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Sig (Directions)</label>
                      <input
                        type="text"
                        value={item.sig}
                        onChange={(e) => setRxItems((prev) => prev.map((r, i) => i === idx ? { ...r, sig: e.target.value } : r))}
                        placeholder="1 cap 3x a day"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {rxItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRxItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRxItems((prev) => [...prev, { drug_name: '', dosage: '', quantity: 1, sig: '' }])}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Add Drug
                </button>
              </div>
            )}
          </div>
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

      {/* Quick Add Service Modal */}
      <Modal
        isOpen={addServiceOpen}
        onClose={() => setAddServiceOpen(false)}
        title="Add New Procedure"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddServiceOpen(false)}>Cancel</Button>
            <Button onClick={handleQuickAddService} disabled={!newService.name}>Add Procedure</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Procedure Name *"
            placeholder="e.g. Tooth Extraction"
            value={newService.name}
            onChange={(e) => setNewService((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Default Price (PHP)"
            type="number"
            placeholder="0.00"
            value={newService.default_price}
            onChange={(e) => setNewService((p) => ({ ...p, default_price: e.target.value }))}
          />
          <Select
            label="Category"
            value={newService.category}
            onChange={(e) => setNewService((p) => ({ ...p, category: e.target.value }))}
            options={[
              { value: 'General', label: 'General' },
              { value: 'Cosmetic', label: 'Cosmetic' },
              { value: 'Orthodontics', label: 'Orthodontics' },
              { value: 'Prosthodontics', label: 'Prosthodontics' },
              { value: 'Surgery', label: 'Surgery' },
              { value: 'Preventive', label: 'Preventive' },
            ]}
          />
        </div>
      </Modal>

      {/* Edit Treatment Modal */}
      <Modal
        isOpen={editTx !== null}
        onClose={() => setEditTx(null)}
        title="Edit Treatment"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTx(null)} disabled={editTxSaving}>Cancel</Button>
            <Button onClick={handleSaveEditTx} loading={editTxSaving}>Save Changes</Button>
          </>
        }
      >
        {editTx && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  value={editTxForm.date}
                  onChange={(e) => setEditTxForm((p) => ({ ...p, date: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Select
                label="Status"
                value={editTxForm.status}
                onChange={(e) => setEditTxForm((p) => ({ ...p, status: e.target.value }))}
                options={[
                  { value: 'planned', label: 'Planned' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'done', label: 'Done' },
                ]}
              />
            </div>

            <Input
              label="Procedure *"
              value={editTxForm.procedure_type}
              onChange={(e) => setEditTxForm((p) => ({ ...p, procedure_type: e.target.value }))}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Dentist *"
                value={editTxForm.dentist_id}
                onChange={(e) => setEditTxForm((p) => ({ ...p, dentist_id: e.target.value }))}
                options={localDentists.map((d) => ({
                  value: String(d.dentist_id),
                  label: `Dr. ${d.first_name} ${d.last_name}`,
                }))}
              />
              <Input
                label="Tooth Numbers"
                placeholder="e.g. 11, 21, 36"
                value={editTxForm.tooth_numbers}
                onChange={(e) => setEditTxForm((p) => ({ ...p, tooth_numbers: e.target.value }))}
                helperText="Comma-separated FDI numbers (11–85)"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Fee Charged (PHP) *</label>
              <div className="relative">
                <PhilippinePeso className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editTxForm.fee}
                  onChange={(e) => setEditTxForm((p) => ({ ...p, fee: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {editTx.amount_paid_int > 0 && (
                <p className="mt-1 text-xs text-warning-600">
                  Already paid: {formatMoney(editTx.amount_paid_int)} — make sure the new fee isn't lower than this.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                value={editTxForm.notes}
                onChange={(e) => setEditTxForm((p) => ({ ...p, notes: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal (for existing treatments) */}
      <Modal
        isOpen={payModalTx !== null}
        onClose={() => setPayModalTx(null)}
        title="Record Payment"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayModalTx(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} loading={paySaving}>Record Payment</Button>
          </>
        }
      >
        {payModalTx && (() => {
          const bal = payModalTx.fee_charged_int - payModalTx.amount_paid_int;
          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-800">{payModalTx.procedure_type}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Fee</span>
                    <p className="font-semibold">{formatMoney(payModalTx.fee_charged_int)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Paid</span>
                    <p className="font-semibold text-green-600">{formatMoney(payModalTx.amount_paid_int)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Balance</span>
                    <p className="font-semibold text-red-600">{formatMoney(bal)}</p>
                  </div>
                </div>
              </div>
              <Input
                label="Amount (PHP)"
                type="number"
                placeholder="0.00"
                value={payForm.amount}
                onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
              />
              <Select
                label="Payment Method"
                value={payForm.method}
                onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'gcash', label: 'GCash' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'card', label: 'Credit/Debit Card' },
                ]}
              />
              {payForm.method !== 'cash' && (
                <Input
                  label="Reference #"
                  placeholder="Transaction reference"
                  value={payForm.reference}
                  onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
                />
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Payment Date</label>
                <input
                  type="date"
                  value={payForm.date}
                  onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 5: BILLING
// ═════════════════════════════════════════════════════════════════
function BillingTab({
  patientId,
  invoices,
  onRefresh,
}: {
  patientId: number;
  invoices: Invoice[];
  onRefresh: () => void;
}) {
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference_no: '',
    date: todayISO(),
  });

  // Create Invoice Modal
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<{ id: number; description: string; qty: number; unitPrice: string }[]>([
    { id: 1, description: '', qty: 1, unitPrice: '' },
  ]);
  const [invoiceDiscount, setInvoiceDiscount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState(todayISO());

  const invoiceSubtotal = invoiceItems.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice) || 0;
    return sum + price * item.qty;
  }, 0);
  const invoiceDiscountAmt = parseFloat(invoiceDiscount) || 0;
  const invoiceTotal = Math.max(0, invoiceSubtotal - invoiceDiscountAmt);

  const resetInvoiceForm = () => {
    setInvoiceItems([{ id: 1, description: '', qty: 1, unitPrice: '' }]);
    setInvoiceDiscount('');
    setInvoiceDueDate(todayISO());
  };

  const handleCreateInvoice = async () => {
    // Validate
    const validItems = invoiceItems.filter(
      (it) => it.description.trim() && parseFloat(it.unitPrice) > 0
    );
    if (validItems.length === 0) {
      showToast('warning', 'Add at least one item with description and price');
      return;
    }
    if (invoiceTotal <= 0) {
      showToast('warning', 'Total must be greater than 0');
      return;
    }

    setInvoiceSaving(true);
    try {
      const items: InvoiceItem[] = validItems.map((it) => ({
        item_id: generateId(),
        description: it.description,
        treatment_id: null,
        qty: it.qty,
        unit_price_int: pesosToCentavos(parseFloat(it.unitPrice) || 0),
        line_total_int: pesosToCentavos((parseFloat(it.unitPrice) || 0) * it.qty),
      }));
      const subtotalInt = items.reduce((s, i) => s + i.line_total_int, 0);
      const discountInt = pesosToCentavos(invoiceDiscountAmt);
      const totalInt = subtotalInt - discountInt;

      await api.createInvoice({
        patient_id: patientId,
        items,
        subtotal_int: subtotalInt,
        discount_int: discountInt,
        total_int: totalInt,
        payment_terms: 'full',
        due_date: invoiceDueDate,
      });

      showToast('success', 'Invoice created', 'New invoice has been created.');
      setShowCreateInvoice(false);
      resetInvoiceForm();
      onRefresh();
    } catch {
      showToast('error', 'Failed to create invoice');
    } finally {
      setInvoiceSaving(false);
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total_int, 0);
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + inv.amount_paid_int,
    0,
  );
  const outstanding = totalBilled - totalPaid;

  const handleRecordPayment = async () => {
    if (!paymentModal) return;
    const amountPhp = parseFloat(paymentForm.amount);
    if (!amountPhp || amountPhp <= 0) {
      showToast('warning', 'Enter a valid payment amount');
      return;
    }
    const remaining = paymentModal.total_int - paymentModal.amount_paid_int;
    if (pesosToCentavos(amountPhp) > remaining) {
      showToast('warning', 'Amount exceeds remaining balance');
      return;
    }
    setPaymentSaving(true);
    try {
      const payload: Payment = {
        payment_id: generateId(),
        invoice_id: paymentModal.invoice_id,
        patient_id: patientId,
        amount_int: pesosToCentavos(amountPhp),
        method: paymentForm.method as Payment['method'],
        reference_no: paymentForm.reference_no.trim(),
        date: paymentForm.date,
        created_at: nowISO(),
      };
      await api.createPayment(payload);
      showToast(
        'success',
        'Bayad recorded (Resibo)',
        `${formatMoney(payload.amount_int)} payment recorded.`,
      );
      setPaymentModal(null);
      setPaymentForm({
        amount: '',
        method: 'cash',
        reference_no: '',
        date: todayISO(),
      });
      onRefresh();
    } catch {
      showToast('error', 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  const getInvoiceStatusVariant = (
    status: string,
  ): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'sent':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreateInvoice(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Total Billed
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatMoney(totalBilled)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Total Paid
          </p>
          <p className="mt-1 text-xl font-bold text-success-600">
            {formatMoney(totalPaid)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Outstanding Balance
          </p>
          <p
            className={cn(
              'mt-1 text-xl font-bold',
              outstanding > 0 ? 'text-danger-600' : 'text-gray-900',
            )}
          >
            {formatMoney(outstanding)}
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <Card padding={false} title="Invoices (Resibo)">
        {invoices.length === 0 ? (
          <EmptyState
            icon={PhilippinePeso}
            title="No invoices yet"
            description="Invoices will appear here once billing records are created."
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Invoice #</Th>
                <Th>Date</Th>
                <Th>Items</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {invoices.map((inv) => {
                const isExpanded = expandedInvoice === inv.invoice_id;
                const invBalance = inv.total_int - inv.amount_paid_int;
                return (
                  <InvoiceRows
                    key={inv.invoice_id}
                    invoice={inv}
                    isExpanded={isExpanded}
                    invBalance={invBalance}
                    statusVariant={getInvoiceStatusVariant(inv.status)}
                    onToggleExpand={() =>
                      setExpandedInvoice(isExpanded ? null : inv.invoice_id)
                    }
                    onRecordPayment={() => setPaymentModal(inv)}
                  />
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModal !== null}
        onClose={() => setPaymentModal(null)}
        title={`Record Payment - ${paymentModal?.invoice_no || ''}`}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setPaymentModal(null)}
              disabled={paymentSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} loading={paymentSaving}>
              Record Bayad
            </Button>
          </>
        }
      >
        {paymentModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice Total</span>
                <span className="font-medium">
                  {formatMoney(paymentModal.total_int)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-medium text-success-600">
                  {formatMoney(paymentModal.amount_paid_int)}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 text-sm">
                <span className="font-medium text-gray-700">Remaining</span>
                <span className="font-bold text-danger-600">
                  {formatMoney(
                    paymentModal.total_int - paymentModal.amount_paid_int,
                  )}
                </span>
              </div>
            </div>

            <Input
              label="Amount (PHP) *"
              type="number"
              placeholder="0.00"
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              helperText={`Max: ${formatMoney(paymentModal.total_int - paymentModal.amount_paid_int)}`}
            />

            <Select
              label="Payment Method"
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  method: e.target.value,
                }))
              }
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'gcash', label: 'GCash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'card', label: 'Credit/Debit Card' },
              ]}
            />

            <Input
              label="Reference #"
              placeholder="Transaction/reference number"
              value={paymentForm.reference_no}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  reference_no: e.target.value,
                }))
              }
            />

            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentForm.date}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateInvoice}
        onClose={() => {
          setShowCreateInvoice(false);
          resetInvoiceForm();
        }}
        title="Create Invoice"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateInvoice(false);
                resetInvoiceForm();
              }}
              disabled={invoiceSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice} loading={invoiceSaving}>
              Create Invoice
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Line Items */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Items
            </label>
            <div className="space-y-2">
              {invoiceItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Description (e.g., Tooth Extraction)"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...invoiceItems];
                      newItems[idx].description = e.target.value;
                      setInvoiceItems(newItems);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => {
                      const newItems = [...invoiceItems];
                      newItems[idx].qty = parseInt(e.target.value) || 1;
                      setInvoiceItems(newItems);
                    }}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...invoiceItems];
                      newItems[idx].unitPrice = e.target.value;
                      setInvoiceItems(newItems);
                    }}
                    className="w-28"
                  />
                  {invoiceItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
                      }}
                      className="p-2 text-gray-400 hover:text-danger-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInvoiceItems([
                  ...invoiceItems,
                  { id: Date.now(), description: '', qty: 1, unitPrice: '' },
                ]);
              }}
              className="mt-2"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Discount */}
          <Input
            label="Discount (PHP)"
            type="number"
            placeholder="0.00"
            value={invoiceDiscount}
            onChange={(e) => setInvoiceDiscount(e.target.value)}
          />

          {/* Due Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={invoiceDueDate}
              onChange={(e) => setInvoiceDueDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatMoney(pesosToCentavos(invoiceSubtotal))}</span>
            </div>
            {invoiceDiscountAmt > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-danger-600">
                  -{formatMoney(pesosToCentavos(invoiceDiscountAmt))}
                </span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-lg">{formatMoney(pesosToCentavos(invoiceTotal))}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Invoice Expandable Row ──────────────────────────────────────
function InvoiceRows({
  invoice: inv,
  isExpanded,
  invBalance,
  statusVariant,
  onToggleExpand,
  onRecordPayment,
}: {
  invoice: Invoice;
  isExpanded: boolean;
  invBalance: number;
  statusVariant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onToggleExpand: () => void;
  onRecordPayment: () => void;
}) {
  return (
    <>
      <Tr className="cursor-pointer" onClick={onToggleExpand}>
        <Td className="font-medium text-gray-800">
          <div className="flex items-center gap-1.5">
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            )}
            {inv.invoice_no}
          </div>
        </Td>
        <Td className="whitespace-nowrap">{formatDate(inv.created_at)}</Td>
        <Td className="text-gray-600">
          {inv.items.length} item{inv.items.length !== 1 && 's'}
        </Td>
        <Td className="text-right whitespace-nowrap">
          {formatMoney(inv.total_int)}
        </Td>
        <Td className="text-right whitespace-nowrap">
          {formatMoney(inv.amount_paid_int)}
        </Td>
        <Td className="text-right whitespace-nowrap">
          <span
            className={cn(invBalance > 0 && 'font-semibold text-danger-600')}
          >
            {formatMoney(invBalance)}
          </span>
        </Td>
        <Td>
          <Badge variant={statusVariant}>
            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
          </Badge>
        </Td>
        <Td>
          {invBalance > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment();
              }}
            >
              Record Payment
            </Button>
          )}
        </Td>
      </Tr>
      {isExpanded && (
        <Tr>
          <Td colSpan={8} className="!bg-gray-50/80 !p-0">
            <div className="space-y-3 px-8 py-4">
              <h4 className="text-sm font-semibold text-gray-700">
                Line Items
              </h4>
              <div className="space-y-1">
                {inv.items.map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between rounded border border-gray-100 bg-white px-3 py-2"
                  >
                    <div>
                      <span className="text-sm text-gray-800">
                        {item.description}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        x{item.qty}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {formatMoney(item.line_total_int)}
                    </span>
                  </div>
                ))}
              </div>
              {inv.discount_int > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-success-600">
                    -{formatMoney(inv.discount_int)}
                  </span>
                </div>
              )}
              {inv.payment_terms === 'installment' && (
                <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Hulugan (Installment Plan)
                  </p>
                  <p className="mt-0.5 text-xs text-yellow-600">
                    This invoice is on an installment payment plan.
                  </p>
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs text-yellow-700">
                      <span>{formatMoney(inv.amount_paid_int)} paid</span>
                      <span>{formatMoney(inv.total_int)} total</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-yellow-200">
                      <div
                        className="h-2 rounded-full bg-yellow-500 transition-all"
                        style={{
                          width: `${Math.min(100, inv.total_int > 0 ? (inv.amount_paid_int / inv.total_int) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Td>
        </Tr>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 6: PRESCRIPTIONS (Rx)
// ═════════════════════════════════════════════════════════════════

type RxFormItem = { drug_name: string; dosage: string; quantity: number; sig: string };

function PrescriptionsTab({
  patientId,
  patient,
  dentists,
}: {
  patientId: number;
  patient: Patient;
  dentists: Dentist[];
}) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  // Editable preview state
  const [editRx, setEditRx] = useState<{
    clinicName: string; clinicAddress: string; clinicPhone: string; clinicEmail: string;
    dentistName: string; dentistSpec: string; dentistLicense: string;
    items: { drug_name: string; quantity: number; sig: string }[];
    notes: string;
  } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [rxDate, setRxDate] = useState(todayISO());
  const [rxDentistId, setRxDentistId] = useState('');
  const [rxItems, setRxItems] = useState<RxFormItem[]>([
    { drug_name: '', dosage: '', quantity: 1, sig: '' },
  ]);
  const [rxNotes, setRxNotes] = useState('');

  // Drug search state
  const [drugSearches, setDrugSearches] = useState<Record<number, string>>({});
  const [activeDrugDropdown, setActiveDrugDropdown] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rxList, drugList, settings] = await Promise.all([
        api.getPatientPrescriptions(patientId),
        api.getDrugs(),
        api.getClinicSettings(),
      ]);
      setPrescriptions(rxList);
      setDrugs(drugList.filter((d) => d.is_active));
      setClinicSettings(settings);
    } catch {
      showToast('error', 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-select the first dentist for the new-prescription form (handy
  // for single-dentist clinics — no manual pick needed).
  useEffect(() => {
    if (!rxDentistId && dentists.length > 0) {
      setRxDentistId(String(dentists[0].dentist_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentists]);

  const getDentistName = (dentistId: number): string => {
    const d = dentists.find((doc) => doc.dentist_id === dentistId);
    return d ? `Dr. ${d.first_name} ${d.last_name}` : '--';
  };

  const getDentist = (dentistId: number): Dentist | undefined => {
    return dentists.find((doc) => doc.dentist_id === dentistId);
  };

  const resetForm = () => {
    setRxDate(todayISO());
    setRxDentistId(dentists.length > 0 ? String(dentists[0].dentist_id) : '');
    setRxItems([{ drug_name: '', dosage: '', quantity: 1, sig: '' }]);
    setRxNotes('');
    setDrugSearches({});
    setActiveDrugDropdown(null);
  };

  const handleAddItem = () => {
    setRxItems((prev) => [...prev, { drug_name: '', dosage: '', quantity: 1, sig: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (rxItems.length <= 1) return;
    setRxItems((prev) => prev.filter((_, i) => i !== index));
    setDrugSearches((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof RxFormItem, value: string | number) => {
    setRxItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleDrugSelect = (index: number, drug: Drug) => {
    const drugLabel = `${drug.generic_name} ${drug.strength} ${drug.form}`;
    handleItemChange(index, 'drug_name', drugLabel);
    handleItemChange(index, 'dosage', drug.strength);
    setDrugSearches((prev) => ({ ...prev, [index]: '' }));
    setActiveDrugDropdown(null);
  };

  const getFilteredDrugs = (index: number): Drug[] => {
    const search = (drugSearches[index] || '').toLowerCase();
    if (!search) return drugs.slice(0, 20);
    return drugs.filter(
      (d) =>
        d.generic_name.toLowerCase().includes(search) ||
        d.brand_name.toLowerCase().includes(search) ||
        d.form.toLowerCase().includes(search),
    ).slice(0, 20);
  };

  const handleSavePrescription = async () => {
    if (!rxDentistId) {
      showToast('warning', 'Please select a dentist');
      return;
    }
    const validItems = rxItems.filter((item) => item.drug_name.trim());
    if (validItems.length === 0) {
      showToast('warning', 'Please add at least one drug');
      return;
    }
    setSaving(true);
    try {
      await api.createPrescription({
        patient_id: patientId,
        dentist_id: parseInt(rxDentistId, 10),
        treatment_id: null,
        date: rxDate,
        items: validItems.map((item) => ({
          drug_name: item.drug_name.trim(),
          dosage: item.dosage.trim(),
          quantity: item.quantity,
          sig: item.sig.trim(),
        })),
        notes: rxNotes.trim(),
      });
      showToast('success', 'Prescription created');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch {
      showToast('error', 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await api.deletePrescription(id);
      showToast('success', 'Prescription deleted');
      fetchData();
    } catch {
      showToast('error', 'Failed to delete prescription');
    }
  };

  // Edit prescription modal state
  const [editingRx, setEditingRx] = useState<Prescription | null>(null);
  const [editRxForm, setEditRxForm] = useState({
    date: '', dentist_id: '', notes: '',
    items: [] as RxFormItem[],
  });
  const [editRxSaving, setEditRxSaving] = useState(false);

  const openEditRx = (rx: Prescription) => {
    setEditingRx(rx);
    setEditRxForm({
      date: rx.date,
      dentist_id: String(rx.dentist_id),
      notes: rx.notes || '',
      items: rx.items.map((i) => ({
        drug_name: i.drug_name,
        dosage: i.dosage || '',
        quantity: i.quantity,
        sig: i.sig || '',
      })),
    });
  };

  const handleSaveEditRx = async () => {
    if (!editingRx) return;
    if (!editRxForm.date || !editRxForm.dentist_id) {
      showToast('error', 'Please fill in date and dentist.');
      return;
    }
    const items = editRxForm.items
      .filter((i) => i.drug_name.trim())
      .map((i) => ({
        drug_name: i.drug_name.trim(),
        dosage: i.dosage,
        quantity: Math.max(1, Number(i.quantity) || 1),
        sig: i.sig,
      }));
    if (items.length === 0) {
      showToast('error', 'Add at least one drug item.');
      return;
    }
    setEditRxSaving(true);
    try {
      await api.updatePrescription(editingRx.prescription_id, {
        date: editRxForm.date,
        dentist_id: Number(editRxForm.dentist_id),
        notes: editRxForm.notes,
        items,
      });
      showToast('success', 'Prescription updated');
      setEditingRx(null);
      fetchData();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to update prescription', msg);
    } finally {
      setEditRxSaving(false);
    }
  };

  const handlePrint = (rx: Prescription) => {
    setSelectedRx(rx);
    const rxDentist = getDentist(rx.dentist_id);
    setEditRx({
      clinicName: clinicSettings?.clinic_name || 'Dental Clinic',
      clinicAddress: clinicSettings?.address || '',
      clinicPhone: clinicSettings?.phone || '',
      clinicEmail: clinicSettings?.email || '',
      dentistName: rxDentist ? `${rxDentist.first_name} ${rxDentist.last_name}` : 'Unknown',
      dentistSpec: rxDentist?.specialization || 'General Dentistry',
      dentistLicense: rxDentist?.license_no || '',
      items: rx.items.map((i) => ({ drug_name: i.drug_name, quantity: i.quantity, sig: i.sig })),
      notes: rx.notes,
    });
    setPreviewLogo(clinicSettings?.logo || null);
    setShowPrintPreview(true);
  };

  // Compute patient info for prescription
  const patientFullName = getFullName(patient);
  const patientAge = computeAge(patient.birthdate);
  const patientAddress = [
    patient.address_street,
    patient.address_barangay,
    patient.address_city,
    patient.address_province,
  ]
    .filter(Boolean)
    .join(', ');
  const patientSex = patient.sex === 'male' ? 'Male' : 'Female';

  const executePrint = (rxOverride?: Prescription) => {
    const rx = rxOverride || selectedRx;
    if (!rx) return;
    // Use editable state if available, otherwise fall back to original data
    const dName = editRx?.dentistName || (() => { const d = getDentist(rx.dentist_id); return d ? `${d.first_name} ${d.last_name}` : 'Unknown'; })();
    const dSpec = editRx?.dentistSpec || getDentist(rx.dentist_id)?.specialization || 'General Dentistry';
    const dLicense = editRx?.dentistLicense || getDentist(rx.dentist_id)?.license_no || '';
    const cName = editRx?.clinicName || clinicSettings?.clinic_name || 'Dental Clinic';
    const cAddress = editRx?.clinicAddress || clinicSettings?.address || '';
    const cPhone = editRx?.clinicPhone || clinicSettings?.phone || '';
    const cEmail = editRx?.clinicEmail || clinicSettings?.email || '';
    const printItems = editRx?.items || rx.items;
    const printNotes = editRx?.notes ?? rx.notes;

    const buildDrugHtml = (item: { drug_name: string; quantity: number; sig: string }) => `
      <div class="rx-drug">
        <p class="name">${item.drug_name}</p>
        <p class="sig">#${item.quantity}${item.sig ? `<span style="margin-left:6px">Sig: ${item.sig}</span>` : ''}</p>
      </div>
    `;

    const notesHtml = printNotes
      ? `<div class="rx-note">Note: ${printNotes}</div>`
      : '';

    // Paginate drugs: first page ~8 (has header/patient), continuation ~14
    const FIRST_PAGE_DRUGS = 8;
    const NEXT_PAGE_DRUGS = 14;
    const rxPages: typeof printItems[] = [];
    const rxRemaining = [...printItems];
    rxPages.push(rxRemaining.splice(0, FIRST_PAGE_DRUGS));
    while (rxRemaining.length > 0) rxPages.push(rxRemaining.splice(0, NEXT_PAGE_DRUGS));
    const rxTotalPages = rxPages.length;

    const logoSrc = previewLogo || clinicSettings?.logo || '';
    const logoSize = clinicSettings?.logo_size_px ?? 52;
    const logoPosX = clinicSettings?.logo_pos_x_pct ?? 0;
    const logoPosY = clinicSettings?.logo_pos_y_px ?? 0;
    const logoOnLeft = logoPosX <= 50;
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:4px;" />`
      : `<div style="width:${logoSize}px;height:${logoSize}px;background:#000;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(logoSize * 0.34)}px;font-weight:bold;">${cName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>`;
    const headerTextAlign = logoOnLeft ? 'right' : 'left';

    const html = `<!DOCTYPE html><html><head>
      <title>Rx - ${patientFullName}</title>
      <style>
        /* margin:0 suppresses Chrome/Edge's default page header/footer
           (date, URL, page numbers) on most browsers, and lets the page
           fill the physical paper edge-to-edge. */
        @page { margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; }
        body { font-family:'Georgia','Times New Roman',serif; font-size:11px; line-height:1.4; background:#fff; }
        .rx-page {
          width:100%; min-height:100vh;
          padding:0.5in 0.5in;
          display:flex; flex-direction:column;
          page-break-after:always;
        }
        .rx-page:last-child { page-break-after:auto; }
        /* Landscape: render the page at portrait dimensions then CSS-zoom
           the whole thing so it becomes an exact miniature of the portrait
           layout, anchored to the top-left half of the landscape sheet.
           min-height = 100vh / 0.65 so the box, after zoom, is exactly the
           landscape page height — eliminates the dead space below the
           footer that appears when min-height was only 11in. */
        @media print and (orientation: landscape) {
          body { margin:0; padding:0; }
          .rx-page {
            width:8.5in !important;
            min-height:calc(100vh / 0.65) !important;
            height:auto !important;
            padding:0.5in 0.5in !important;
            margin:0 auto 0 0 !important;
            font-size:11px !important;
            zoom:0.65;
            page-break-inside:avoid;
            page-break-after:auto;
          }
        }
        /* Logo absolutely positioned so its size doesn't push the divider line. */
        .rx-header { position:relative; margin-bottom:6px; padding-bottom:8px; border-bottom:2px solid #000; min-height:60px; }
        .rx-logo {
          position:absolute;
          bottom:${10 + logoPosY}px;
          left:calc((100% - ${logoSize}px) * ${logoPosX / 100});
          width:${logoSize}px; height:${logoSize}px;
        }
        .rx-header-info {
          text-align:${headerTextAlign};
          ${logoOnLeft ? `padding-left:${logoSize + 10}px;` : `padding-right:${logoSize + 10}px;`}
        }
        .rx-header-info h2 { font-size:18px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase; margin:0; color:#000; }
        .rx-header-info .address { font-size:10px; color:#555; margin:2px 0 0; }
        .rx-header-info .contact { font-size:10px; color:#555; margin:1px 0 0; }
        .rx-header-info .dentist { font-size:14px; font-weight:bold; margin:5px 0 0; }
        .rx-header-info .spec { font-size:11px; color:#555; margin:0; }
        .rx-date-row { text-align:right; font-size:13px; margin-bottom:8px; }
        .rx-underline { border-bottom:1px solid #333; padding-bottom:1px; display:inline-block; }
        .rx-patient { font-size:13px; margin-bottom:10px; line-height:1.9; }
        .rx-patient .row { display:flex; gap:14px; }
        .rx-patient .field { flex:1; }
        .rx-symbol-row { margin:14px 0 12px; }
        .rx-symbol { font-size:42px; font-weight:bold; line-height:1; font-family:'Georgia',serif; }
        .rx-body { padding:6px 26px 0; }
        .rx-drugs { width:100%; max-width:420px; }
        .rx-drug { margin-bottom:12px; text-align:left; }
        .rx-drug .name { font-size:15px; font-weight:bold; font-style:italic; margin:0; }
        .rx-drug .sig { font-size:13px; margin:2px 0 0 18px; color:#333; }
        .rx-note { margin-top:12px; font-size:11px; color:#555; font-style:italic; }
        .rx-signature { text-align:right; margin-top:auto; padding-right:20px; }
        .rx-signature .sig-block { display:inline-block; min-width:240px; max-width:300px; }
        .rx-signature .line { border-bottom:1px solid #333; padding-bottom:3px; font-size:13px; font-weight:bold; text-align:center; }
        .rx-signature .license { font-size:10px; color:#555; margin:3px 0 0; text-align:center; }
        .rx-footer { margin-top:14px; border-top:1px solid #ccc; padding-top:6px; text-align:center; font-size:9px; color:#888; }
        .rx-footer p { margin:1px 0; }
        .rx-toolbar {
          position:fixed; top:0; left:0; right:0; z-index:100;
          background:#000; color:#fff; padding:10px 20px;
          display:flex; align-items:center; justify-content:space-between;
          font-family:system-ui,-apple-system,sans-serif; font-size:14px;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
        }
        .rx-toolbar button {
          padding:8px 20px; border:none; border-radius:6px; cursor:pointer;
          font-size:14px; font-weight:600; margin-left:8px;
        }
        .rx-toolbar .btn-print { background:#fff; color:#000; }
        .rx-toolbar .btn-print:hover { background:#e2e8f0; }
        .rx-toolbar .btn-close { background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.3); }
        .rx-toolbar .btn-close:hover { background:rgba(255,255,255,0.1); }
        .rx-content { margin-top:60px; padding:20px; display:flex; flex-direction:column; align-items:center; gap:20px; }
        .rx-page-num { font-size:7px; color:#999; text-align:center; margin-top:2px; }
        @media print {
          .rx-toolbar { display:none !important; }
          .rx-content { margin-top:0; padding:0; gap:0; }
          .rx-page-num { margin-top:auto; padding-top:2px; }
        }
      </style>
    </head><body>
      <div class="rx-toolbar">
        <span>Prescription - ${patientFullName}${rxTotalPages > 1 ? ` (${rxTotalPages} pages)` : ''}</span>
        <div>
          <button class="btn-close" onclick="window.close()">Close</button>
          <button class="btn-print" onclick="window.print()">Print</button>
        </div>
      </div>
      <div class="rx-content">
        ${rxPages.map((pageDrugs, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === rxTotalPages - 1;
          return `<div class="rx-page">
            ${isFirst ? `
              <div class="rx-header">
                <div class="rx-logo">${logoHtml}</div>
                <div class="rx-header-info">
                  <h2>${cName}</h2>
                  ${cAddress ? `<p class="address">${cAddress}</p>` : ''}
                  <p class="contact">${cPhone}${cPhone && cEmail ? ' | ' : ''}${cEmail}</p>
                  <p class="dentist">${dName}, D.M.D.</p>
                  <p class="spec">${dSpec}</p>
                </div>
              </div>
              <div class="rx-patient">
                <div class="row">
                  <div class="field">Name: <span class="rx-underline" style="min-width:180px">${patientFullName}</span></div>
                  <div>Date: <span class="rx-underline" style="min-width:90px;text-align:center">${formatDate(rx.date)}</span></div>
                </div>
                <div class="row">
                  <div class="field">Address: <span class="rx-underline" style="min-width:180px">${patientAddress || '--'}</span></div>
                  <div>Age: <span class="rx-underline" style="min-width:30px;text-align:center">${patientAge}</span></div>
                  <div>Gender: <span class="rx-underline" style="min-width:50px;text-align:center">${patientSex}</span></div>
                </div>
              </div>
              <div class="rx-symbol-row">
                <span class="rx-symbol">&#8478;</span>
              </div>
            ` : `
              <div style="font-size:8px;color:#888;margin-bottom:6px;border-bottom:1px solid #ccc;padding-bottom:4px;display:flex;justify-content:space-between">
                <span>${patientFullName} — Rx (cont.)</span>
                <span>${dName}, D.M.D.</span>
              </div>
              <div class="rx-symbol-row" style="margin:2px 0 6px">
                <span class="rx-symbol" style="font-size:22px">&#8478;</span>
              </div>
            `}

            <div class="rx-body">
              <div class="rx-drugs">${pageDrugs.map(buildDrugHtml).join('')}</div>
              ${isLast ? notesHtml : ''}
            </div>

            ${isLast ? `
              <div class="rx-signature">
                <div class="sig-block">
                  <div class="line">${dName}, D.M.D.</div>
                  <p class="license">License No.: ${dLicense || '___________'}</p>
                </div>
              </div>
              <div class="rx-footer">
                <p>This prescription is valid for one (1) year from date of issue.</p>
              </div>
            ` : ''}
            ${rxTotalPages > 1 ? `<div class="rx-page-num">Page ${pageIdx + 1} of ${rxTotalPages}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ─── Reusable Rx Pad renderer (modal preview) ───────────────
  const renderEditableRxPad = () => {
    if (!editRx || !selectedRx) return null;
    const ul = { borderBottom: '1.5px solid #333', paddingBottom: '2px', display: 'inline-block' as const };
    const eInput = (value: string, onChange: (v: string) => void, style?: React.CSSProperties) => (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 bg-transparent outline-none focus:bg-blue-50/50 rounded px-0.5 transition-colors"
        style={{ ...style, font: 'inherit', color: 'inherit', width: '100%' }}
      />
    );

    const clinicInitials = editRx.clinicName.split(' ').map(w => w[0]).join('').slice(0, 2);

    return (
      <div style={{
        width: '100%',
        aspectRatio: '5 / 8',
        padding: '20px 24px',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        backgroundColor: '#fff',
        fontSize: '13px',
        lineHeight: 1.5,
        display: 'flex',
        flexDirection: 'column' as const,
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
      }}>
        {/* Header: logo + info — logo absolutely positioned via X/Y from clinic
            settings so its size doesn't push the divider line down. */}
        {(() => {
          const sz = clinicSettings?.logo_size_px ?? 56;
          const xPct = clinicSettings?.logo_pos_x_pct ?? 0;
          const yPx = clinicSettings?.logo_pos_y_px ?? 0;
          const onLeft = xPct <= 50;
          const textAlign: 'left' | 'right' = onLeft ? 'right' : 'left';
          const logoBox = (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="group relative"
              title="Click to change logo"
              style={{ display: 'inline-block' }}
            >
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" style={{ width: `${sz}px`, height: `${sz}px`, objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <div style={{ width: `${sz}px`, height: `${sz}px`, background: '#000', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: `${Math.round(sz * 0.36)}px`, fontWeight: 'bold' }}>
                  {clinicInitials}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </button>
          );
          const logoInput = (
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => setPreviewLogo(reader.result as string);
              reader.readAsDataURL(file);
            }} />
          );
          const textBlock = (
            <>
              <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#000' }}>
                {eInput(editRx.clinicName, (v) => setEditRx((p) => p ? { ...p, clinicName: v } : p), { textAlign, fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#000', fontSize: '16px' })}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>
                {eInput(editRx.clinicAddress, (v) => setEditRx((p) => p ? { ...p, clinicAddress: v } : p), { fontSize: '10px', textAlign })}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>
                {eInput(`${editRx.clinicPhone}${editRx.clinicPhone && editRx.clinicEmail ? ' | ' : ''}${editRx.clinicEmail}`, () => {}, { fontSize: '10px', textAlign })}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '5px' }}>
                {eInput(`${editRx.dentistName}, D.M.D.`, (v) => setEditRx((p) => p ? { ...p, dentistName: v.replace(/, D\.M\.D\.$/, '') } : p), { fontWeight: 'bold', textAlign })}
              </div>
              <div style={{ fontSize: '11px', color: '#555' }}>
                {eInput(editRx.dentistSpec, (v) => setEditRx((p) => p ? { ...p, dentistSpec: v } : p), { fontSize: '11px', textAlign })}
              </div>
            </>
          );
          return (
            <div style={{ position: 'relative', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2.5px solid #000' }}>
              <div
                style={{
                  position: 'absolute',
                  bottom: `${10 + yPx}px`,
                  left: `calc((100% - ${sz}px) * ${xPct / 100})`,
                  width: `${sz}px`,
                  height: `${sz}px`,
                }}
              >
                {logoBox}
              </div>
              {logoInput}
              <div
                style={{
                  textAlign,
                  paddingLeft: onLeft ? `${sz + 14}px` : 0,
                  paddingRight: onLeft ? 0 : `${sz + 14}px`,
                }}
              >
                {textBlock}
              </div>
            </div>
          );
        })()}

        {/* Patient + Date — Row 1: Name | Date | Row 2: Address | Age | Gender */}
        <div style={{ fontSize: '13px', marginBottom: '10px', lineHeight: 2 }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>Name: <span style={{ ...ul, minWidth: '200px' }}>{patientFullName}</span></div>
            <div>Date: <span style={{ ...ul, minWidth: '110px', textAlign: 'center' }}>{formatDate(selectedRx.date)}</span></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>Address: <span style={{ ...ul, minWidth: '200px' }}>{patientAddress || '--'}</span></div>
            <div>Age: <span style={{ ...ul, minWidth: '36px', textAlign: 'center' }}>{patientAge}</span></div>
            <div>Gender: <span style={{ ...ul, minWidth: '55px', textAlign: 'center' }}>{patientSex}</span></div>
          </div>
        </div>

        {/* Rx Symbol */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '36px', fontWeight: 'bold', lineHeight: 1, fontFamily: "'Georgia', serif" }}>&#8478;</span>
        </div>

        {/* Drugs - Editable */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '0 20px' }}>
          <div style={{ width: '100%', maxWidth: '300px' }}>
            {editRx.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '10px', textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic' }}>
                  {eInput(item.drug_name, (v) => setEditRx((p) => p ? { ...p, items: p.items.map((it, i) => i === idx ? { ...it, drug_name: v } : it) } : p), { fontWeight: 'bold', fontStyle: 'italic', fontSize: '14px' })}
                </div>
                <div style={{ fontSize: '12px', marginLeft: '12px', color: '#333', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  #<input type="number" value={item.quantity} min={1} onChange={(e) => setEditRx((p) => p ? { ...p, items: p.items.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it) } : p)} className="w-8 border-0 bg-transparent outline-none text-center focus:bg-blue-50/50 rounded" style={{ font: 'inherit' }} />
                  Sig: {eInput(item.sig, (v) => setEditRx((p) => p ? { ...p, items: p.items.map((it, i) => i === idx ? { ...it, sig: v } : it) } : p), { fontSize: '12px' })}
                  {editRx.items.length > 1 && (
                    <button type="button" onClick={() => setEditRx((p) => p ? { ...p, items: p.items.filter((_, i) => i !== idx) } : p)} className="text-red-400 hover:text-red-600 ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setEditRx((p) => p ? { ...p, items: [...p.items, { drug_name: '', quantity: 1, sig: '' }] } : p)} className="text-[10px] text-primary-600 hover:text-primary-800">+ Add Drug</button>
          </div>
          {editRx.notes !== undefined && (
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#555', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
              Note: {eInput(editRx.notes, (v) => setEditRx((p) => p ? { ...p, notes: v } : p), { fontSize: '11px', fontStyle: 'italic', textAlign: 'center' })}
            </div>
          )}
        </div>

        {/* Signature — fixed-width sig-block so the license sits directly
            under the dentist name line, both centered as a unit. */}
        <div style={{ textAlign: 'right', marginTop: 'auto', paddingRight: '10px' }}>
          <div style={{ display: 'inline-block', minWidth: '180px', maxWidth: '220px' }}>
            <div style={{ borderBottom: '1.5px solid #333', paddingBottom: '3px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
              {editRx.dentistName}, D.M.D.
            </div>
            <div style={{ fontSize: '11px', color: '#555', textAlign: 'center', marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              License No.: {eInput(editRx.dentistLicense || '', (v) => setEditRx((p) => p ? { ...p, dentistLicense: v } : p), { fontSize: '11px', textAlign: 'center', maxWidth: '120px' })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '12px', borderTop: '1px solid #ccc', paddingTop: '5px', textAlign: 'center', fontSize: '10px', color: '#888' }}>
          <p style={{ margin: '1px 0' }}>This prescription is valid for one (1) year from date of issue.</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading prescriptions..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">Prescriptions</h3>
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Prescription
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No prescriptions yet"
            description="Create a prescription for this patient."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                New Prescription
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Dentist</Th>
                <Th>Items</Th>
                <Th>Notes</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {prescriptions.map((rx) => (
                <Tr key={rx.prescription_id}>
                  <Td className="whitespace-nowrap">{formatDate(rx.date)}</Td>
                  <Td className="whitespace-nowrap">{getDentistName(rx.dentist_id)}</Td>
                  <Td>
                    <Badge variant="info">{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</Badge>
                    <div className="mt-1 text-xs text-gray-500">
                      {rx.items.map((item) => item.drug_name).join(', ')}
                    </div>
                  </Td>
                  <Td className="max-w-[200px] truncate text-xs text-gray-500">{rx.notes || '--'}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrint(rx)}
                        title="View Prescription"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditRx(rx)}
                        title="Edit Prescription"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => executePrint(rx)}
                        title="Print Prescription"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rx.prescription_id)}
                        title="Delete Prescription"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {/* ── Create Prescription Modal ───────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="New Prescription"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePrescription} loading={saving}>
              Save Prescription
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Date & Dentist */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                value={rxDate}
                onChange={(e) => setRxDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Select
              label="Dentist *"
              value={rxDentistId}
              onChange={(e) => setRxDentistId(e.target.value)}
              options={dentists
                .filter((d) => d.is_active)
                .map((d) => ({
                  value: String(d.dentist_id),
                  label: `Dr. ${d.first_name} ${d.last_name}`,
                }))}
              placeholder="Select dentist"
            />
          </div>

          {/* Drug Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Prescription Items *</label>
              <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={handleAddItem}>
                Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {rxItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Item {index + 1}</span>
                    {rxItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                        title="Remove item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Drug Name with search */}
                    <div className="relative sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Drug Name</label>
                      <input
                        type="text"
                        value={activeDrugDropdown === index ? (drugSearches[index] ?? item.drug_name) : item.drug_name}
                        onChange={(e) => {
                          setDrugSearches((prev) => ({ ...prev, [index]: e.target.value }));
                          handleItemChange(index, 'drug_name', e.target.value);
                          setActiveDrugDropdown(index);
                        }}
                        onFocus={() => {
                          setActiveDrugDropdown(index);
                          setDrugSearches((prev) => ({ ...prev, [index]: item.drug_name }));
                        }}
                        onBlur={() => {
                          // Delay to allow click on dropdown
                          setTimeout(() => setActiveDrugDropdown(null), 200);
                        }}
                        placeholder="Search drug catalog..."
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {activeDrugDropdown === index && getFilteredDrugs(index).length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          {getFilteredDrugs(index).map((drug) => (
                            <button
                              key={drug.drug_id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary-50"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleDrugSelect(index, drug);
                              }}
                            >
                              <span className="font-medium text-gray-800">
                                {drug.generic_name} {drug.strength} {drug.form}
                              </span>
                              {drug.brand_name && (
                                <span className="ml-2 text-xs text-gray-400">({drug.brand_name})</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                        onBlur={(e) => { if (!e.target.value || parseInt(e.target.value, 10) < 1) handleItemChange(index, 'quantity', 1); }}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Sig (Directions)
                      </label>
                      <input
                        type="text"
                        value={item.sig}
                        onChange={(e) => handleItemChange(index, 'sig', e.target.value)}
                        placeholder="e.g. 1 cap 3x a day for 7 days"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              value={rxNotes}
              onChange={(e) => setRxNotes(e.target.value)}
              placeholder="Additional instructions or notes..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </Modal>

      {/* ── Print Preview Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showPrintPreview}
        onClose={() => {
          setShowPrintPreview(false);
          setSelectedRx(null);
        }}
        title="Prescription Preview"
        size="2xl"
        footer={
          <div className="no-print flex w-full items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowPrintPreview(false);
                setSelectedRx(null);
              }}
            >
              Close
            </Button>
            <Button leftIcon={<Printer className="h-4 w-4" />} onClick={() => executePrint()}>
              Print
            </Button>
          </div>
        }
      >
        {selectedRx && renderEditableRxPad()}
      </Modal>

      {/* Edit Prescription Modal */}
      <Modal
        isOpen={editingRx !== null}
        onClose={() => setEditingRx(null)}
        title="Edit Prescription"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingRx(null)} disabled={editRxSaving}>Cancel</Button>
            <Button onClick={handleSaveEditRx} loading={editRxSaving}>Save Changes</Button>
          </>
        }
      >
        {editingRx && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  value={editRxForm.date}
                  onChange={(e) => setEditRxForm((p) => ({ ...p, date: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Select
                label="Dentist *"
                value={editRxForm.dentist_id}
                onChange={(e) => setEditRxForm((p) => ({ ...p, dentist_id: e.target.value }))}
                options={dentists.map((d) => ({
                  value: String(d.dentist_id),
                  label: `Dr. ${d.first_name} ${d.last_name}`,
                }))}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Drug Items</label>
                <button
                  type="button"
                  onClick={() => setEditRxForm((p) => ({
                    ...p,
                    items: [...p.items, { drug_name: '', dosage: '', quantity: 1, sig: '' }],
                  }))}
                  className="text-xs font-medium text-primary-600 hover:text-primary-800"
                >
                  + Add item
                </button>
              </div>
              <div className="space-y-2">
                {editRxForm.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Input
                        label={`Drug #${idx + 1}`}
                        placeholder="e.g. Amoxicillin (Amoxil) 500mg/cap"
                        value={item.drug_name}
                        onChange={(e) => setEditRxForm((p) => ({
                          ...p,
                          items: p.items.map((it, i) => i === idx ? { ...it, drug_name: e.target.value } : it),
                        }))}
                      />
                      <button
                        type="button"
                        onClick={() => setEditRxForm((p) => ({
                          ...p,
                          items: p.items.filter((_, i) => i !== idx),
                        }))}
                        className="mt-7 rounded p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        value={String(item.quantity)}
                        onChange={(e) => setEditRxForm((p) => ({
                          ...p,
                          items: p.items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value) || 1) } : it),
                        }))}
                      />
                      <Input
                        label="Dosage"
                        placeholder="optional"
                        value={item.dosage}
                        onChange={(e) => setEditRxForm((p) => ({
                          ...p,
                          items: p.items.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it),
                        }))}
                      />
                    </div>
                    <Input
                      label="Sig (directions)"
                      placeholder="e.g. Take 1 capsule 3x a day for 7 days"
                      value={item.sig}
                      onChange={(e) => setEditRxForm((p) => ({
                        ...p,
                        items: p.items.map((it, i) => i === idx ? { ...it, sig: e.target.value } : it),
                      }))}
                    />
                  </div>
                ))}
                {editRxForm.items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
                    No items. Click "+ Add item" above.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes / Instructions</label>
              <textarea
                rows={2}
                value={editRxForm.notes}
                onChange={(e) => setEditRxForm((p) => ({ ...p, notes: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// TAB 7: FILES
// ═════════════════════════════════════════════════════════════════
function FilesTab({ patientId }: { patientId: number }) {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    preview: '',
    category: 'photo' as FileAsset['category'],
    notes: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPatientFiles(patientId);
      setFiles(data);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let preview = '';
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }
    setUploadForm((prev) => ({ ...prev, file, preview }));
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      showToast('warning', 'Please select a file');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const fileUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadForm.file!);
      });

      const payload: FileAsset = {
        file_id: generateId(),
        patient_id: patientId,
        file_name: uploadForm.file.name,
        file_type: uploadForm.file.type,
        file_url: fileUrl,
        category: uploadForm.category,
        uploaded_at: nowISO(),
        notes: uploadForm.notes.trim(),
      };

      await api.uploadFile(payload);
      showToast('success', 'File uploaded', uploadForm.file.name);
      setUploadModalOpen(false);
      setUploadForm({ file: null, preview: '', category: 'photo', notes: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFiles();
    } catch {
      showToast('error', 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'xray':
        return 'X-Ray';
      case 'photo':
        return 'Photo';
      case 'document':
        return 'Document';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading files..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">
          Patient Files
        </h3>
        <Button
          size="sm"
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={() => setUploadModalOpen(true)}
        >
          Upload File
        </Button>
      </div>

      {files.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No files uploaded yet"
            description="Upload X-rays, photos, documents, or other files for this patient."
            action={
              <Button
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setUploadModalOpen(true)}
              >
                Upload File
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => (
            <div
              key={file.file_id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="flex h-36 items-center justify-center overflow-hidden bg-gray-50">
                {file.file_type.startsWith('image/') ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : file.category === 'xray' ? (
                  <FileImage className="h-8 w-8 text-blue-400" />
                ) : file.category === 'document' ? (
                  <FileText className="h-8 w-8 text-orange-400" />
                ) : (
                  <File className="h-8 w-8 text-gray-400" />
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p
                  className="truncate text-sm font-medium text-gray-800"
                  title={file.file_name}
                >
                  {file.file_name}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <Badge
                    variant={
                      file.category === 'xray'
                        ? 'info'
                        : file.category === 'photo'
                          ? 'success'
                          : file.category === 'document'
                            ? 'warning'
                            : 'default'
                    }
                  >
                    {getCategoryLabel(file.category)}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {formatDate(file.uploaded_at)}
                  </span>
                </div>
                {file.notes && (
                  <p
                    className="mt-1.5 truncate text-xs text-gray-500"
                    title={file.notes}
                  >
                    {file.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload File"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={uploading}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* File Input Area */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Select File *
            </label>
            {uploadForm.file ? (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                {uploadForm.preview ? (
                  <img
                    src={uploadForm.preview}
                    alt="Preview"
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <File className="h-8 w-8 text-gray-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {uploadForm.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadForm.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (uploadForm.preview) URL.revokeObjectURL(uploadForm.preview);
                    setUploadForm((prev) => ({
                      ...prev,
                      file: null,
                      preview: '',
                    }));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 transition-colors hover:border-primary-400 hover:bg-primary-50"
              >
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to select a file</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Images, PDFs, documents
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Image Preview */}
          {uploadForm.preview && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <img
                src={uploadForm.preview}
                alt="Preview"
                className="max-h-48 w-full bg-gray-100 object-contain"
              />
            </div>
          )}

          <Select
            label="Category"
            value={uploadForm.category}
            onChange={(e) =>
              setUploadForm((prev) => ({
                ...prev,
                category: e.target.value as FileAsset['category'],
              }))
            }
            options={[
              { value: 'xray', label: 'X-Ray' },
              { value: 'photo', label: 'Photo' },
              { value: 'document', label: 'Document' },
              { value: 'other', label: 'Other' },
            ]}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={2}
              value={uploadForm.notes}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Optional description..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Shared Loading Spinner ──────────────────────────────────────
function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
      {text && <span className="ml-2 text-sm text-gray-500">{text}</span>}
    </div>
  );
}

// ─── Edit Patient Modal ──────────────────────────────────────────
const EDIT_TAG_OPTIONS = ['Ortho', 'Pedia', 'VIP', 'Senior', 'Regular'] as const;

type EditPatientForm = {
  first_name: string;
  middle_name: string;
  last_name: string;
  sex: string;
  birthdate: string;
  mobile_number: string;
  email: string;
  address_street: string;
  address_barangay: string;
  address_city: string;
  address_province: string;
  occupation: string;
  religion: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  insurance_provider: string;
  notes: string;
  tags: string[];
  recall_date: string;
};

function patientToForm(p: Patient): EditPatientForm {
  return {
    first_name: p.first_name,
    middle_name: p.middle_name || '',
    last_name: p.last_name,
    sex: p.sex,
    birthdate: isoToBirthdateInput(p.birthdate),
    mobile_number: p.mobile_number,
    email: p.email || '',
    address_street: p.address_street || '',
    address_barangay: p.address_barangay || '',
    address_city: p.address_city || '',
    address_province: p.address_province || '',
    occupation: p.occupation || '',
    religion: p.religion || '',
    emergency_contact_name: p.emergency_contact_name || '',
    emergency_contact_number: p.emergency_contact_number || '',
    insurance_provider: p.insurance_provider || '',
    notes: p.notes || '',
    tags: p.tags || [],
    recall_date: p.recall_date ? isoToBirthdateInput(p.recall_date) : '',
  };
}

function EditPatientModal({
  isOpen,
  patient,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  patient: Patient;
  onClose: () => void;
  onSaved: (updated: Patient) => void;
}) {
  const [form, setForm] = useState<EditPatientForm>(() => patientToForm(patient));
  const [errors, setErrors] = useState<Partial<Record<keyof EditPatientForm, string>>>({});
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the modal re-opens for a (possibly different) patient.
  useEffect(() => {
    if (isOpen) {
      setForm(patientToForm(patient));
      setErrors({});
    }
  }, [isOpen, patient]);

  const update = <K extends keyof EditPatientForm>(key: K, value: EditPatientForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof EditPatientForm, string>> = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    if (!form.sex) errs.sex = 'Sex is required';
    if (!form.birthdate.trim()) {
      errs.birthdate = 'Birthdate is required';
    } else if (parseTypedDate(form.birthdate) === null) {
      errs.birthdate = 'Use MM/DD/YYYY or YYYY-MM-DD';
    }
    if (!form.mobile_number.trim()) {
      errs.mobile_number = 'Mobile number is required';
    } else {
      const cleaned = form.mobile_number.replace(/\D/g, '');
      if (cleaned.length !== 11 || !cleaned.startsWith('09')) {
        errs.mobile_number = 'Enter a valid 11-digit mobile number (09XX...)';
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const updated = await api.updatePatient(patient.patient_id, {
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        last_name: form.last_name.trim(),
        sex: form.sex as 'male' | 'female',
        birthdate: parseTypedDate(form.birthdate) || form.birthdate,
        mobile_number: form.mobile_number.replace(/\D/g, ''),
        email: form.email.trim(),
        address_street: form.address_street.trim(),
        address_barangay: form.address_barangay.trim(),
        address_city: form.address_city.trim(),
        address_province: form.address_province.trim(),
        occupation: form.occupation.trim(),
        religion: form.religion.trim(),
        emergency_contact_name: form.emergency_contact_name.trim(),
        emergency_contact_number: form.emergency_contact_number.trim(),
        insurance_provider: form.insurance_provider.trim(),
        notes: form.notes.trim(),
        tags: form.tags,
        recall_date: form.recall_date.trim() ? (parseTypedDate(form.recall_date) || form.recall_date) : null,
      });
      onSaved(updated);
    } catch (err) {
      console.error('Failed to update patient:', err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to update patient', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Patient"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Name */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="First Name *"
            value={form.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            error={errors.first_name}
          />
          <Input
            label="Middle Name"
            value={form.middle_name}
            onChange={(e) => update('middle_name', e.target.value)}
          />
          <Input
            label="Last Name *"
            value={form.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            error={errors.last_name}
          />
        </div>

        {/* Sex & Birthdate */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Sex *"
            placeholder="Select sex"
            value={form.sex}
            onChange={(e) => update('sex', e.target.value)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            error={errors.sex}
          />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Birthdate *
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="MM/DD/YYYY"
              autoComplete="bday"
              maxLength={10}
              value={form.birthdate}
              onChange={(e) => update('birthdate', maskBirthdateInput(e.target.value))}
              className={cn(
                'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.birthdate ? 'border-danger-500' : 'border-gray-300',
              )}
            />
            {errors.birthdate ? (
              <p className="mt-1 text-xs text-danger-500">{errors.birthdate}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">e.g. 03/15/1990</p>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Mobile Number *"
            placeholder="09XX XXX XXXX"
            value={form.mobile_number}
            onChange={(e) => update('mobile_number', e.target.value)}
            error={errors.mobile_number}
            helperText="11-digit number starting with 09"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
          />
        </div>

        {/* Address */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Address</h4>
          <Input
            label="Street"
            value={form.address_street}
            onChange={(e) => update('address_street', e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Barangay"
              value={form.address_barangay}
              onChange={(e) => update('address_barangay', e.target.value)}
            />
            <Input
              label="City / Municipality"
              value={form.address_city}
              onChange={(e) => update('address_city', e.target.value)}
            />
            <Input
              label="Province"
              value={form.address_province}
              onChange={(e) => update('address_province', e.target.value)}
            />
          </div>
        </div>

        {/* Personal */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Occupation"
            value={form.occupation}
            onChange={(e) => update('occupation', e.target.value)}
          />
          <Input
            label="Religion"
            value={form.religion}
            onChange={(e) => update('religion', e.target.value)}
          />
        </div>

        {/* Emergency Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Emergency Contact</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contact Name"
              value={form.emergency_contact_name}
              onChange={(e) => update('emergency_contact_name', e.target.value)}
            />
            <Input
              label="Contact Number"
              placeholder="09XX XXX XXXX"
              value={form.emergency_contact_number}
              onChange={(e) => update('emergency_contact_number', e.target.value)}
            />
          </div>
        </div>

        {/* Insurance + Recall */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Insurance Provider"
            placeholder="e.g. Maxicare, PhilHealth"
            value={form.insurance_provider}
            onChange={(e) => update('insurance_provider', e.target.value)}
          />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Recall Date</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="MM/DD/YYYY"
              maxLength={10}
              value={form.recall_date}
              onChange={(e) => update('recall_date', maskBirthdateInput(e.target.value))}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-400">When should this patient come back?</p>
          </div>
        </div>

        {/* Notes */}
        <div className="w-full">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Tags</label>
          <div className="flex flex-wrap gap-2">
            {EDIT_TAG_OPTIONS.map((tag) => {
              const isSelected = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                    isSelected
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600',
                  )}
                >
                  {isSelected && '✓ '}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
