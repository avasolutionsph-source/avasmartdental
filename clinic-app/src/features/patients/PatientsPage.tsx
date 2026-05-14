import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Camera,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Patient } from '@/types/models';
import {
  formatDate,
  formatAge,
  formatPhone,
  formatMoney,
  getFullName,
  getShortName,
  getInitials,
  todayISO,
  parseTypedDate,
  maskBirthdateInput,
  isoToBirthdateInput,
  cn,
} from '@/lib/utils';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhotoCaptureModal } from '@/components/ui/PhotoCapture';
import { showToast } from '@/components/ui/ToastContainer';

// ─── Constants ────────────────────────────────────────────────────
const TAG_OPTIONS = ['Ortho', 'Pedia', 'VIP', 'Senior', 'Regular'] as const;
const PAGE_SIZE = 10;

const TAG_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
  Ortho: 'info',
  Pedia: 'purple',
  VIP: 'warning',
  Senior: 'success',
  Regular: 'default',
};

// ─── Form State ──────────────────────────────────────────────────
interface PatientFormData {
  patient_photo: string | null;
  first_name: string;
  last_name: string;
  middle_name: string;
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
}

const INITIAL_FORM: PatientFormData = {
  patient_photo: null,
  first_name: '',
  last_name: '',
  middle_name: '',
  sex: '',
  birthdate: '',
  mobile_number: '',
  email: '',
  address_street: '',
  address_barangay: '',
  address_city: '',
  address_province: '',
  occupation: '',
  religion: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  insurance_provider: '',
  notes: '',
  tags: [],
  recall_date: '',
};

type FormErrors = Partial<Record<keyof PatientFormData, string>>;

// ─── Component ───────────────────────────────────────────────────
export default function PatientsPage() {
  const navigate = useNavigate();

  // Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [balanceByPatient, setBalanceByPatient] = useState<Map<number, number>>(new Map());
  const [lastVisitByPatient, setLastVisitByPatient] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [recallDueOnly, setRecallDueOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [form, setForm] = useState<PatientFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);

  // ─── Fetch Patients + per-patient balance & last-visit aggregates ────
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const [pats, invs, lastVisits] = await Promise.all([
        api.getPatients(),
        api.getInvoices(),
        api.getLatestTreatmentDates(),
      ]);

      const balances = new Map<number, number>();
      for (const inv of invs) {
        if (inv.balance_int && inv.balance_int > 0) {
          balances.set(inv.patient_id, (balances.get(inv.patient_id) || 0) + inv.balance_int);
        }
      }

      setPatients(pats);
      setBalanceByPatient(balances);
      setLastVisitByPatient(lastVisits);
    } catch {
      showToast('error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ─── Filtered & Sorted ──────────────────────────────────────
  const today = todayISO();
  const filtered = patients
    .filter((p) => {
      const q = search.toLowerCase();
      const name = `${p.first_name} ${p.last_name} ${p.middle_name}`.toLowerCase();
      const mobile = p.mobile_number.toLowerCase();
      const matchesSearch = !q || name.includes(q) || mobile.includes(q);
      const matchesRecall = !recallDueOnly || (p.recall_date && p.recall_date <= today);
      return matchesSearch && matchesRecall;
    })
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, recallDueOnly]);

  // ─── Photo Upload ────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Invalid file', 'Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File too large', 'Maximum file size is 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, patient_photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // ─── Form Helpers ────────────────────────────────────────────
  const updateField = <K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) => {
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

  // ─── Validation ──────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {};
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

  // ─── Submit ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Omit<Patient, 'patient_id' | 'created_at' | 'updated_at'> = {
        patient_photo: form.patient_photo,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name.trim(),
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
      };
      if (editingPatientId !== null) {
        const updated = await api.updatePatient(editingPatientId, payload);
        setPatients((prev) => prev.map((p) => (p.patient_id === editingPatientId ? updated : p)));
        showToast('success', 'Patient updated', `${getShortName(updated)} saved.`);
      } else {
        const saved = await api.createPatient(payload);
        setPatients((prev) => [...prev, saved]);
        showToast('success', 'Patient added', `${getShortName(saved)} has been registered.`);
      }
      setModalOpen(false);
      setEditingPatientId(null);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (err) {
      console.error('Failed to save patient:', err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to save patient', message);
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setEditingPatientId(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatientId(patient.patient_id);
    setForm({
      patient_photo: patient.patient_photo,
      first_name: patient.first_name,
      last_name: patient.last_name,
      middle_name: patient.middle_name,
      sex: patient.sex,
      birthdate: isoToBirthdateInput(patient.birthdate),
      mobile_number: patient.mobile_number,
      email: patient.email,
      address_street: patient.address_street,
      address_barangay: patient.address_barangay,
      address_city: patient.address_city,
      address_province: patient.address_province,
      occupation: patient.occupation,
      religion: patient.religion,
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_number: patient.emergency_contact_number,
      insurance_provider: patient.insurance_provider,
      notes: patient.notes,
      tags: patient.tags,
      recall_date: patient.recall_date ? isoToBirthdateInput(patient.recall_date) : '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePatient(deleteTarget.patient_id);
      setPatients((prev) => prev.filter((p) => p.patient_id !== deleteTarget.patient_id));
      showToast('success', 'Patient deleted', `${getShortName(deleteTarget)} removed.`);
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to delete patient', message);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            Manage your patient records and information.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openModal} className="w-full sm:w-auto">
          Add Patient
        </Button>
      </div>

      {/* Search & Recall Filter */}
      <Card padding={true}>
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 sm:py-2 pl-10 pr-3 text-base sm:text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setRecallDueOnly((v) => !v)}
              className={cn(
                'rounded-full px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors shrink-0 active:scale-95 border',
                recallDueOnly
                  ? 'bg-warning-500 text-white border-warning-500 shadow-sm'
                  : 'bg-white text-warning-700 border-warning-200 hover:bg-warning-50',
              )}
              title="Show only patients whose recall date is today or earlier"
            >
              Recall Due
            </button>
          </div>
        </div>
      </Card>

      {/* Patients Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
            <span className="ml-3 text-sm text-gray-500">Loading patients...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || recallDueOnly ? 'No patients found' : 'No patients yet'}
            description={
              search || recallDueOnly
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first patient record.'
            }
            action={
              !search && !recallDueOnly ? (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openModal}>
                  Add Patient
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <Thead>
                <Tr>
                  <Th className="w-12" />
                  <Th>Patient Name</Th>
                  <Th>Age / Sex</Th>
                  <Th>Mobile</Th>
                  <Th>Last Visit</Th>
                  <Th className="text-right">Balance</Th>
                  <Th>Tags</Th>
                  <Th className="w-24 text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paged.map((patient) => {
                  const age = formatAge(patient.birthdate);
                  const sex = patient.sex === 'male' ? 'M' : 'F';
                  const balance = balanceByPatient.get(patient.patient_id) || 0;
                  const lastVisit = lastVisitByPatient.get(patient.patient_id) || null;
                  return (
                    <Tr
                      key={patient.patient_id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.patient_id}`)}
                    >
                      <Td>
                        <Avatar
                          src={patient.patient_photo || undefined}
                          name={getShortName(patient)}
                          initials={getInitials(patient.first_name, patient.last_name)}
                          size="sm"
                        />
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className="text-left font-medium text-primary-600 hover:text-primary-700 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.patient_id}`);
                            }}
                          >
                            {getFullName(patient)}
                          </button>
                          {patient.recall_date && patient.recall_date <= today && (
                            <Badge variant="warning">Recall</Badge>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-gray-700">{age}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-gray-700">{sex}</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatPhone(patient.mobile_number)}
                      </Td>
                      <Td className="whitespace-nowrap text-gray-500">
                        {lastVisit ? formatDate(lastVisit) : '--'}
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <span className={cn(balance > 0 && 'font-semibold text-danger-600')}>
                          {formatMoney(balance)}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {patient.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant={TAG_BADGE_VARIANT[tag] || 'default'}
                            >
                              {tag}
                            </Badge>
                          ))}
                          {patient.tags.length === 0 && (
                            <span className="text-xs text-gray-400">--</span>
                          )}
                        </div>
                      </Td>
                      <Td className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openEditModal(patient)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(patient)}
                            className="rounded p-1 text-gray-400 hover:bg-danger-50 hover:text-danger-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 px-3 sm:px-6 py-3">
              <p className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                Showing <span className="font-medium">{showingFrom}</span> -{' '}
                <span className="font-medium">{showingTo}</span> of{' '}
                <span className="font-medium">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                  className="flex-1 sm:flex-none"
                >
                  Prev
                </Button>
                <span className="min-w-[50px] sm:min-w-[60px] text-center text-xs sm:text-sm text-gray-600">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                  className="flex-1 sm:flex-none"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ─── Add / Edit Patient Modal ─────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPatientId(null); }}
        title={editingPatientId !== null ? 'Edit Patient' : 'Add New Patient'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingPatientId(null); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingPatientId !== null ? 'Save Changes' : 'Save Patient'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Photo Upload / Take Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.patient_photo ? (
                <div className="relative">
                  <img
                    src={form.patient_photo}
                    alt="Patient photo"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoCaptureOpen(true)}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('patient_photo', null)}
                    className="absolute -top-1 -right-1 rounded-full bg-danger-500 p-0.5 text-white shadow-sm hover:bg-danger-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary-400 hover:bg-primary-50"
                  onClick={() => setPhotoCaptureOpen(true)}
                >
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setPhotoCaptureOpen(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                {form.patient_photo ? 'Change Photo' : 'Upload or Take Photo'}
              </button>
              <p className="text-xs text-gray-500 mt-0.5">Take a photo or upload JPG, PNG up to 5MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          <PhotoCaptureModal
            isOpen={photoCaptureOpen}
            onClose={() => setPhotoCaptureOpen(false)}
            onCapture={(dataUrl) => updateField('patient_photo', dataUrl)}
          />

          {/* Name Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="First Name *"
              placeholder="Juan"
              value={form.first_name}
              onChange={(e) => updateField('first_name', e.target.value)}
              error={errors.first_name}
            />
            <Input
              label="Middle Name"
              placeholder="Dela"
              value={form.middle_name}
              onChange={(e) => updateField('middle_name', e.target.value)}
            />
            <Input
              label="Last Name *"
              placeholder="Cruz"
              value={form.last_name}
              onChange={(e) => updateField('last_name', e.target.value)}
              error={errors.last_name}
            />
          </div>

          {/* Sex & Birthdate */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Sex *"
              placeholder="Select sex"
              value={form.sex}
              onChange={(e) => updateField('sex', e.target.value)}
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
                onChange={(e) => updateField('birthdate', maskBirthdateInput(e.target.value))}
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
              onChange={(e) => updateField('mobile_number', e.target.value)}
              error={errors.mobile_number}
              helperText="11-digit number starting with 09"
            />
            <Input
              label="Email"
              type="email"
              placeholder="patient@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={errors.email}
            />
          </div>

          {/* Address */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Address</h4>
            <Input
              label="Street"
              placeholder="123 Main Street"
              value={form.address_street}
              onChange={(e) => updateField('address_street', e.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Barangay"
                placeholder="Brgy. Sample"
                value={form.address_barangay}
                onChange={(e) => updateField('address_barangay', e.target.value)}
              />
              <Input
                label="City / Municipality"
                placeholder="Quezon City"
                value={form.address_city}
                onChange={(e) => updateField('address_city', e.target.value)}
              />
              <Input
                label="Province"
                placeholder="Metro Manila"
                value={form.address_province}
                onChange={(e) => updateField('address_province', e.target.value)}
              />
            </div>
          </div>

          {/* Personal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Occupation"
              placeholder="e.g. Teacher"
              value={form.occupation}
              onChange={(e) => updateField('occupation', e.target.value)}
            />
            <Input
              label="Religion"
              placeholder="e.g. Catholic"
              value={form.religion}
              onChange={(e) => updateField('religion', e.target.value)}
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Emergency Contact</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Contact Name"
                placeholder="Full name"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
              />
              <Input
                label="Contact Number"
                placeholder="09XX XXX XXXX"
                value={form.emergency_contact_number}
                onChange={(e) => updateField('emergency_contact_number', e.target.value)}
              />
            </div>
          </div>

          {/* Insurance + Recall */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Insurance Provider"
              placeholder="e.g. Maxicare, PhilHealth"
              value={form.insurance_provider}
              onChange={(e) => updateField('insurance_provider', e.target.value)}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Recall Date</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM/DD/YYYY"
                maxLength={10}
                value={form.recall_date}
                onChange={(e) => updateField('recall_date', maskBirthdateInput(e.target.value))}
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
              placeholder="Additional notes about the patient..."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => {
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

      {/* ─── Delete Confirmation Modal ─────────────────────────── */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete patient?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              loading={deleting}
              className="bg-danger-600 text-white hover:bg-danger-700"
            >
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-gray-700">
            Permanently delete <strong>{getFullName(deleteTarget)}</strong>? This will remove the patient
            record and cannot be undone. Related treatments, invoices, and appointments may also be
            affected depending on database constraints.
          </p>
        )}
      </Modal>
    </div>
  );
}
