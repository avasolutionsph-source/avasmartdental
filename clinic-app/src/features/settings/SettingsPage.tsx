import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Stethoscope, Wrench, CreditCard, Pill,
  Plus, Pencil, Loader2, Save, Upload, ToggleLeft, ToggleRight, Trash2,
} from 'lucide-react';
import type { Dentist, ServiceItem, PaymentTermOption, ClinicSettings, ClinicBilling, Drug } from '@/types/models';
import { api } from '@/lib/api';
import { formatMoney, cn } from '@/lib/utils';
import {
  Card, Tabs, Button, Input, Modal, Badge, EmptyState, Select,
  Table, Thead, Tbody, Tr, Th, Td, Avatar,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { PayInvoiceCard } from '@/features/billing/PayInvoiceCard';
import { useClinicBilling, useRefetchClinicBilling } from '@/features/billing/useClinicBilling';

// ─── Service Categories ───────────────────────────────────────────
const SERVICE_CATEGORIES = [
  'General',
  'Cosmetic',
  'Orthodontics',
  'Prosthodontics',
  'Surgery',
  'Preventive',
] as const;

// ─── Drug Form Options ───────────────────────────────────────────
const DRUG_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Mouthwash',
  'Gargle',
  'Drops',
  'Cream',
  'Gel',
  'Other',
] as const;

// ─── SettingsPage ─────────────────────────────────────────────────

const TAB_KEYS = ['clinic', 'services', 'terms', 'drugs', 'billing'];

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(initialTab && TAB_KEYS.includes(initialTab) ? initialTab : 'clinic');

  // Billing is shared with the app-wide AccessBanner (Layout shell) via
  // react-query, so a payment made here also clears the banner elsewhere
  // without a page reload.
  const { data: billing = null } = useClinicBilling();
  const refetchBilling = useRefetchClinicBilling();

  // Data state
  const [clinic, setClinic] = useState<ClinicSettings | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermOption[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);

  // Form state for Clinic Profile
  const [clinicForm, setClinicForm] = useState({
    clinic_name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(56);
  const [logoPosX, setLogoPosX] = useState<number>(0);
  const [logoPosY, setLogoPosY] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [dentistModalOpen, setDentistModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingTerm, setEditingTerm] = useState<PaymentTermOption | null>(null);
  const [drugModalOpen, setDrugModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  // Note: hard-delete on dentists is intentionally not exposed in the UI.
  // FK constraints from treatments/appointments would always block it.
  // Use the active-toggle (Deactivate) instead to hide them from dropdowns.

  // Dentist form
  const [dentistForm, setDentistForm] = useState({
    first_name: '',
    last_name: '',
    specialization: '',
    license_no: '',
  });

  // Service form
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'General',
    default_price: '',
    description: '',
  });

  // Payment term form
  const [termForm, setTermForm] = useState({
    name: '',
    months: '',
    description: '',
  });

  // Drug form
  const [drugForm, setDrugForm] = useState({
    generic_name: '',
    brand_name: '',
    form: 'Tablet',
    strength: '',
  });

  // ─── Load Data ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, d, s, pt, dr] = await Promise.all([
          api.getClinicSettings(),
          api.getDentists(),
          api.getServices(),
          api.getPaymentTerms(),
          api.getDrugs(),
        ]);
        if (!cancelled) {
          setClinic(c);
          setDentists(d);
          setServices(s);
          setPaymentTerms(pt);
          setDrugs(dr);
          setClinicForm({
            clinic_name: c.clinic_name,
            address: c.address,
            phone: c.phone,
            email: c.email,
          });
          setLogoSize(c.logo_size_px || 56);
          setLogoPosX(typeof c.logo_pos_x_pct === 'number' ? c.logo_pos_x_pct : 0);
          setLogoPosY(typeof c.logo_pos_y_px === 'number' ? c.logo_pos_y_px : 0);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Handlers ───────────────────────────────────────────────

  const handleSaveClinic = async () => {
    setSaving(true);
    try {
      await api.updateClinicSettings({
        clinic_name: clinicForm.clinic_name,
        address: clinicForm.address,
        phone: clinicForm.phone,
        email: clinicForm.email,
        logo_size_px: logoSize,
        logo_pos_x_pct: logoPosX,
        logo_pos_y_px: logoPosY,
        ...(logoPreview ? { logo: logoPreview } : {}),
      });
      setClinic((prev) =>
        prev
          ? {
              ...prev,
              ...clinicForm,
              logo: logoPreview ?? prev.logo,
              logo_size_px: logoSize,
              logo_pos_x_pct: logoPosX,
              logo_pos_y_px: logoPosY,
            }
          : prev,
      );
      toast.success('Clinic profile saved successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save clinic profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Dentist handlers
  const openAddDentist = () => {
    setEditingDentist(null);
    setDentistForm({ first_name: '', last_name: '', specialization: '', license_no: '' });
    setDentistModalOpen(true);
  };

  const openEditDentist = (d: Dentist) => {
    setEditingDentist(d);
    setDentistForm({
      first_name: d.first_name,
      last_name: d.last_name,
      specialization: d.specialization,
      license_no: d.license_no,
    });
    setDentistModalOpen(true);
  };

  const handleSaveDentist = async () => {
    try {
      if (editingDentist) {
        const updated = await api.updateDentist(editingDentist.dentist_id, dentistForm);
        setDentists((prev) =>
          prev.map((d) => (d.dentist_id === editingDentist.dentist_id ? updated : d)),
        );
        toast.success('Dentist updated successfully!');
      } else {
        const created = await api.createDentist({
          ...dentistForm,
          photo: null,
          is_active: true,
        });
        setDentists((prev) => [...prev, created]);
        toast.success('Dentist added successfully!');
      }
      setDentistModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save dentist');
    }
  };

  const toggleDentistActive = async (id: number) => {
    const target = dentists.find((d) => d.dentist_id === id);
    if (!target) return;
    try {
      const updated = await api.updateDentist(id, { is_active: !target.is_active });
      setDentists((prev) => prev.map((d) => (d.dentist_id === id ? updated : d)));
      toast.info('Dentist status updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update dentist');
    }
  };


  const handleLicenseBlur = async (dentistId: number, newLicense: string) => {
    try {
      await api.updateDentist(dentistId, { license_no: newLicense });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save license');
    }
  };

  // Service handlers
  const openAddService = () => {
    setEditingService(null);
    setServiceForm({ name: '', category: 'General', default_price: '', description: '' });
    setServiceModalOpen(true);
  };

  const openEditService = (s: ServiceItem) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      category: s.category,
      default_price: String(s.default_price_int / 100),
      description: s.description,
    });
    setServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    const priceInt = Math.round(parseFloat(serviceForm.default_price || '0') * 100);
    try {
      if (editingService) {
        const updated = await api.updateService(editingService.service_id, {
          name: serviceForm.name,
          category: serviceForm.category,
          default_price_int: priceInt,
          description: serviceForm.description,
        });
        setServices((prev) =>
          prev.map((s) => (s.service_id === editingService.service_id ? updated : s)),
        );
        toast.success('Service updated successfully!');
      } else {
        const created = await api.createService({
          name: serviceForm.name,
          category: serviceForm.category,
          default_price_int: priceInt,
          description: serviceForm.description,
          is_active: true,
        });
        setServices((prev) => [...prev, created]);
        toast.success('Service added successfully!');
      }
      setServiceModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save service');
    }
  };

  const toggleServiceActive = async (id: number) => {
    const target = services.find((s) => s.service_id === id);
    if (!target) return;
    try {
      const updated = await api.updateService(id, { is_active: !target.is_active });
      setServices((prev) => prev.map((s) => (s.service_id === id ? updated : s)));
      toast.info('Service status updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update service');
    }
  };

  // Payment term handlers
  const openAddTerm = () => {
    setEditingTerm(null);
    setTermForm({ name: '', months: '', description: '' });
    setTermModalOpen(true);
  };

  const openEditTerm = (t: PaymentTermOption) => {
    setEditingTerm(t);
    setTermForm({ name: t.name, months: String(t.months), description: t.description });
    setTermModalOpen(true);
  };

  const handleSaveTerm = async () => {
    const months = parseInt(termForm.months || '0', 10);
    try {
      if (editingTerm) {
        const updated = await api.updatePaymentTerm(editingTerm.term_id, {
          name: termForm.name,
          months,
          description: termForm.description,
        });
        setPaymentTerms((prev) =>
          prev.map((t) => (t.term_id === editingTerm.term_id ? updated : t)),
        );
        toast.success('Payment term updated!');
      } else {
        const created = await api.createPaymentTerm({
          name: termForm.name,
          months,
          description: termForm.description,
        });
        setPaymentTerms((prev) => [...prev, created]);
        toast.success('Payment term added!');
      }
      setTermModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save term');
    }
  };

  // Drug handlers
  const openAddDrug = () => {
    setEditingDrug(null);
    setDrugForm({ generic_name: '', brand_name: '', form: 'Tablet', strength: '' });
    setDrugModalOpen(true);
  };

  const openEditDrug = (d: Drug) => {
    setEditingDrug(d);
    setDrugForm({
      generic_name: d.generic_name,
      brand_name: d.brand_name,
      form: d.form,
      strength: d.strength,
    });
    setDrugModalOpen(true);
  };

  const handleSaveDrug = async () => {
    try {
      if (editingDrug) {
        const updated = await api.updateDrug(editingDrug.drug_id, drugForm);
        setDrugs((prev) =>
          prev.map((d) => (d.drug_id === editingDrug.drug_id ? updated : d)),
        );
        toast.success('Drug updated successfully!');
      } else {
        const created = await api.createDrug({
          ...drugForm,
          is_active: true,
        });
        setDrugs((prev) => [...prev, created]);
        toast.success('Drug added successfully!');
      }
      setDrugModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save drug');
    }
  };

  const toggleDrugActive = async (id: number) => {
    const target = drugs.find((d) => d.drug_id === id);
    if (!target) return;
    try {
      const updated = await api.updateDrug(id, { is_active: !target.is_active });
      setDrugs((prev) => prev.map((d) => (d.drug_id === id ? updated : d)));
      toast.info('Drug status updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update drug');
    }
  };

  // ─── Tabs Config ────────────────────────────────────────────

  const tabs = [
    { key: 'clinic', label: 'Clinic Profile' },
    { key: 'services', label: 'Services', count: services.length },
    { key: 'terms', label: 'Payment Terms', count: paymentTerms.length },
    { key: 'drugs', label: 'Drug List', count: drugs.length },
    { key: 'billing', label: 'Billing' },
  ];

  // ─── Loading State ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your clinic configuration, staff, and services.</p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('tab', tab);
            return next;
          }, { replace: true });
        }}
      />

      <div className="mt-6">
        {/* ═══ Tab 1: Clinic Profile ═══ */}
        {activeTab === 'clinic' && (<>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Form Fields */}
            <Card>
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-800">Clinic Information</h3>
                {/* Logo Upload */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                      {logoPreview || clinic?.logo ? (
                        <img src={logoPreview || clinic?.logo || ''} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
                        <Upload className="h-3.5 w-3.5" />
                        Upload Logo
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  </div>
                  {(logoPreview || clinic?.logo) && (
                    <>
                      <div>
                        <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                          <span>Logo size</span>
                          <span className="font-mono text-gray-500">{logoSize}px</span>
                        </label>
                        <input
                          type="range"
                          min={24}
                          max={240}
                          step={2}
                          value={logoSize}
                          onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-600"
                        />
                      </div>
                      <div>
                        <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                          <span>Horizontal position (left ↔ right)</span>
                          <span className="font-mono text-gray-500">{logoPosX}%</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={logoPosX}
                          onChange={(e) => setLogoPosX(parseInt(e.target.value, 10))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-600"
                        />
                      </div>
                      <div>
                        <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                          <span>Vertical position (down ↔ up)</span>
                          <span className="font-mono text-gray-500">{logoPosY}px</span>
                        </label>
                        <input
                          type="range"
                          min={-150}
                          max={150}
                          step={1}
                          value={logoPosY}
                          onChange={(e) => setLogoPosY(parseInt(e.target.value, 10))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-600"
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                          Drag to resize and reposition. Negative lowers the logo past the divider; positive lifts it up.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <Input
                  label="Clinic Name"
                  value={clinicForm.clinic_name}
                  onChange={(e) => setClinicForm((f) => ({ ...f, clinic_name: e.target.value }))}
                  placeholder="Enter clinic name"
                />
                <Input
                  label="Address"
                  value={clinicForm.address}
                  onChange={(e) => setClinicForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full clinic address"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Phone"
                    value={clinicForm.phone}
                    onChange={(e) => setClinicForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(02) 8XXX-XXXX"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={clinicForm.email}
                    onChange={(e) => setClinicForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="clinic@email.com"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveClinic} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>

            {/* Right: Live Preview */}
            <Card>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Preview — How it looks on prescriptions &amp; receipts</h3>
                <div
                  className="rounded-lg border border-gray-200 bg-white p-5"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  {/* Rx Header Preview — logo positioned via continuous X/Y sliders.
                      The logo is absolutely placed so its size never pushes the
                      divider line; only the text determines the row height. */}
                  {(() => {
                    const hasLogo = !!(logoPreview || clinic?.logo);
                    const logoNode = hasLogo ? (
                      <img
                        src={logoPreview || clinic?.logo || ''}
                        alt="Logo"
                        className="rounded-md object-contain"
                        style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded-md bg-[#000] font-bold text-white"
                        style={{ width: `${logoSize}px`, height: `${logoSize}px`, fontSize: `${Math.round(logoSize * 0.36)}px` }}
                      >
                        {clinicForm.clinic_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                    );
                    const textBlock = (
                      <>
                        <p className="text-sm font-bold uppercase tracking-wider text-[#000]">
                          {clinicForm.clinic_name || 'Clinic Name'}
                        </p>
                        {clinicForm.address && <p className="text-[9px] text-gray-600">{clinicForm.address}</p>}
                        <p className="text-[9px] text-gray-600">
                          {clinicForm.phone}{clinicForm.phone && clinicForm.email ? ' | ' : ''}{clinicForm.email}
                        </p>
                        <p className="mt-1 text-xs font-bold">Dr. Sample, D.M.D.</p>
                        <p className="text-[9px] text-gray-600">General Dentistry</p>
                      </>
                    );
                    // Decide text alignment + padding based on which half the logo is in.
                    // Logo on the left half → text right-aligned with left padding.
                    // Logo on the right half → text left-aligned with right padding.
                    const onLeft = logoPosX <= 50;
                    const textAlignClass = onLeft ? 'text-right' : 'text-left';
                    const padLeft = onLeft ? `${logoSize + 12}px` : 0;
                    const padRight = onLeft ? 0 : `${logoSize + 12}px`;
                    return (
                      <div className="relative border-b-2 border-[#000] pb-3">
                        {hasLogo && (
                          <div
                            className="absolute"
                            style={{
                              bottom: `${12 + logoPosY}px`,
                              left: `calc((100% - ${logoSize}px) * ${logoPosX / 100})`,
                              width: `${logoSize}px`,
                              height: `${logoSize}px`,
                            }}
                          >
                            {logoNode}
                          </div>
                        )}
                        <div
                          className={textAlignClass}
                          style={{ paddingLeft: padLeft, paddingRight: padRight }}
                        >
                          {textBlock}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Rx Body Preview */}
                  <div className="mt-3 text-right text-[10px]">
                    Date: <span className="inline-block min-w-[80px] border-b border-gray-400 text-center">Apr 03, 2026</span>
                  </div>
                  <div className="mt-2 text-[10px] leading-6">
                    <div className="flex gap-2">
                      <div className="flex-1">Name: <span className="inline-block min-w-[150px] border-b border-gray-400">Juan Dela Cruz</span></div>
                      <div>Age: <span className="inline-block min-w-[25px] border-b border-gray-400 text-center">30</span></div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>&#8478;</span>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <div className="text-[10px] italic text-gray-400">Drug items will appear here...</div>
                  </div>
                  <div className="mt-8 text-right">
                    <div className="inline-block min-w-[140px] border-b border-gray-400 pb-0.5 text-center text-[10px] font-bold">
                      Dr. Sample, D.M.D.
                    </div>
                    <p className="text-[8px] text-gray-500">License No.: PRC-XXXXXXX</p>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-400">This preview updates as you edit the fields on the left</p>
              </div>
            </Card>
          </div>

          {/* Dentists Section - below clinic info */}
          <Card
            title="Dentists"
            headerAction={
              <Button size="sm" onClick={openAddDentist} leftIcon={<Plus className="h-4 w-4" />}>
                Add Dentist
              </Button>
            }
          >
            {dentists.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="No dentists added"
                description="Add your dental staff to get started."
                action={
                  <Button size="sm" onClick={openAddDentist} leftIcon={<Plus className="h-4 w-4" />}>
                    Add Dentist
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dentists.map((d) => (
                  <div
                    key={d.dentist_id}
                    className={cn(
                      'relative rounded-xl border-2 p-5 transition-colors',
                      d.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60',
                    )}
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    <div className="flex items-center gap-3 border-b-2 border-[#000] pb-3">
                      <Avatar name={`${d.first_name} ${d.last_name}`} size="sm" />
                      <div className="flex-1 text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#000]">
                          {clinicForm.clinic_name}
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {d.first_name} {d.last_name}, D.M.D.
                        </p>
                        <p className="text-[10px] text-gray-500">{d.specialization}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500">License No.:</span>
                      <input
                        type="text"
                        value={d.license_no}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDentists((prev) => prev.map((doc) =>
                            doc.dentist_id === d.dentist_id ? { ...doc, license_no: val } : doc,
                          ));
                        }}
                        onBlur={(e) => handleLicenseBlur(d.dentist_id, e.target.value)}
                        placeholder="Enter PRC license..."
                        className={cn(
                          'flex-1 border-0 bg-transparent px-1 py-0.5 text-xs font-mono outline-none transition-colors focus:bg-blue-50 rounded',
                          !d.license_no && 'text-red-400 placeholder-red-300',
                        )}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      <Badge variant={d.is_active ? 'success' : 'default'}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditDentist(d)}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleDentistActive(d.dentist_id)}
                          className={cn(
                            'rounded-lg p-1.5 transition',
                            d.is_active ? 'text-success-600 hover:bg-success-50' : 'text-gray-400 hover:bg-gray-100',
                          )}
                          title={d.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {d.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>)}

        {/* ═══ Tab 2: Services ═══ */}
        {activeTab === 'services' && (
          <Card
            title="Dental Services"
            headerAction={
              <Button size="sm" onClick={openAddService} leftIcon={<Plus className="h-4 w-4" />}>
                Add Service
              </Button>
            }
          >
            {services.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No services configured"
                description="Add your dental services and pricing."
                action={
                  <Button size="sm" onClick={openAddService} leftIcon={<Plus className="h-4 w-4" />}>
                    Add Service
                  </Button>
                }
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Service Name</Th>
                    <Th>Category</Th>
                    <Th>Default Price</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {services.map((s) => (
                    <Tr key={s.service_id}>
                      <Td>
                        <div>
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.description && (
                            <p className="text-xs text-gray-500">{s.description}</p>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="info">{s.category}</Badge>
                      </Td>
                      <Td className="font-medium">
                        {formatMoney(s.default_price_int)}
                      </Td>
                      <Td>
                        <Badge variant={s.is_active ? 'success' : 'default'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditService(s)}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleServiceActive(s.service_id)}
                            className={cn(
                              'rounded-lg p-1.5 transition',
                              s.is_active
                                ? 'text-success-600 hover:bg-success-50'
                                : 'text-gray-400 hover:bg-gray-100',
                            )}
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {s.is_active ? (
                              <ToggleRight className="h-5 w-5" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        )}

        {/* ═══ Tab 4: Payment Terms ═══ */}
        {activeTab === 'terms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Payment Terms</h3>
                <p className="text-sm text-gray-500">Configure installment options for patients.</p>
              </div>
              <Button size="sm" onClick={openAddTerm} leftIcon={<Plus className="h-4 w-4" />}>
                Add Term
              </Button>
            </div>

            {paymentTerms.length === 0 ? (
              <Card>
                <EmptyState
                  icon={CreditCard}
                  title="No payment terms"
                  description="Add payment term options for your patients."
                  action={
                    <Button size="sm" onClick={openAddTerm} leftIcon={<Plus className="h-4 w-4" />}>
                      Add Term
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paymentTerms.map((term) => (
                  <div
                    key={term.term_id}
                    className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <button
                        onClick={() => openEditTerm(term)}
                        className="rounded-lg p-1.5 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{term.name}</h4>
                    <p className="mt-0.5 text-xs text-gray-500">{term.description}</p>
                    <div className="mt-3">
                      <Badge variant={term.months === 0 ? 'success' : 'info'}>
                        {term.months === 0 ? 'One-time' : `${term.months} months`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab 5: Drug List ═══ */}
        {activeTab === 'drugs' && (
          <Card
            title="Drug List"
            headerAction={
              <Button size="sm" onClick={openAddDrug} leftIcon={<Plus className="h-4 w-4" />}>
                Add Drug
              </Button>
            }
          >
            {drugs.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="No drugs added"
                description="Add drugs to your catalog to get started."
                action={
                  <Button size="sm" onClick={openAddDrug} leftIcon={<Plus className="h-4 w-4" />}>
                    Add Drug
                  </Button>
                }
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Generic Name</Th>
                    <Th>Brand Name</Th>
                    <Th>Form</Th>
                    <Th>Strength</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {drugs.map((d) => (
                    <Tr key={d.drug_id}>
                      <Td>
                        <p className="font-medium text-gray-900">{d.generic_name}</p>
                      </Td>
                      <Td>{d.brand_name || <span className="text-gray-400">-</span>}</Td>
                      <Td>
                        <Badge variant="info">{d.form}</Badge>
                      </Td>
                      <Td className="font-mono text-xs">{d.strength}</Td>
                      <Td>
                        <Badge variant={d.is_active ? 'success' : 'default'}>
                          {d.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditDrug(d)}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleDrugActive(d.drug_id)}
                            className={cn(
                              'rounded-lg p-1.5 transition',
                              d.is_active
                                ? 'text-success-600 hover:bg-success-50'
                                : 'text-gray-400 hover:bg-gray-100',
                            )}
                            title={d.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {d.is_active ? (
                              <ToggleRight className="h-5 w-5" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        )}

        {/* ═══ Tab 6: Billing ═══ */}
        {activeTab === 'billing' && (
          <BillingSection billing={billing} onPaid={refetchBilling} />
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Dentist Modal */}
      <Modal
        isOpen={dentistModalOpen}
        onClose={() => setDentistModalOpen(false)}
        title={editingDentist ? 'Edit Dentist' : 'Add Dentist'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDentistModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDentist} leftIcon={<Save className="h-4 w-4" />}>
              {editingDentist ? 'Update' : 'Add'} Dentist
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={dentistForm.first_name}
              onChange={(e) => setDentistForm((f) => ({ ...f, first_name: e.target.value }))}
              placeholder="First name"
            />
            <Input
              label="Last Name"
              value={dentistForm.last_name}
              onChange={(e) => setDentistForm((f) => ({ ...f, last_name: e.target.value }))}
              placeholder="Last name"
            />
          </div>
          <Input
            label="Specialization"
            value={dentistForm.specialization}
            onChange={(e) => setDentistForm((f) => ({ ...f, specialization: e.target.value }))}
            placeholder="e.g., General Dentistry, Orthodontics"
          />
          <Input
            label="PRC License No."
            value={dentistForm.license_no}
            onChange={(e) => setDentistForm((f) => ({ ...f, license_no: e.target.value }))}
            placeholder="e.g., PRC-12345"
          />
        </div>
      </Modal>

      {/* Service Modal */}
      <Modal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingService ? 'Edit Service' : 'Add Service'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setServiceModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveService} leftIcon={<Save className="h-4 w-4" />}>
              {editingService ? 'Update' : 'Add'} Service
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Service Name"
            value={serviceForm.name}
            onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Oral Prophylaxis"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={serviceForm.category}
              onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))}
              className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <Input
            label="Default Price (PHP)"
            type="number"
            value={serviceForm.default_price}
            onChange={(e) => setServiceForm((f) => ({ ...f, default_price: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Description"
            value={serviceForm.description}
            onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of the service"
          />
        </div>
      </Modal>

      {/* Payment Term Modal */}
      <Modal
        isOpen={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        title={editingTerm ? 'Edit Payment Term' : 'Add Payment Term'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTermModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTerm} leftIcon={<Save className="h-4 w-4" />}>
              {editingTerm ? 'Update' : 'Add'} Term
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Term Name"
            value={termForm.name}
            onChange={(e) => setTermForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g., 6-Month Installment"
          />
          <Input
            label="Number of Months"
            type="number"
            value={termForm.months}
            onChange={(e) => setTermForm((f) => ({ ...f, months: e.target.value }))}
            placeholder="0 for full payment"
            helperText="Enter 0 for one-time full payment"
          />
          <Input
            label="Description"
            value={termForm.description}
            onChange={(e) => setTermForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Describe the payment term"
          />
        </div>
      </Modal>

      {/* Drug Modal */}
      <Modal
        isOpen={drugModalOpen}
        onClose={() => setDrugModalOpen(false)}
        title={editingDrug ? 'Edit Drug' : 'Add Drug'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDrugModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDrug} leftIcon={<Save className="h-4 w-4" />}>
              {editingDrug ? 'Update' : 'Add'} Drug
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Generic Name"
            value={drugForm.generic_name}
            onChange={(e) => setDrugForm((f) => ({ ...f, generic_name: e.target.value }))}
            placeholder="e.g., Amoxicillin"
          />
          <Input
            label="Brand Name"
            value={drugForm.brand_name}
            onChange={(e) => setDrugForm((f) => ({ ...f, brand_name: e.target.value }))}
            placeholder="e.g., Amoxil"
          />
          <Select
            label="Form"
            value={drugForm.form}
            onChange={(e) => setDrugForm((f) => ({ ...f, form: e.target.value }))}
            options={DRUG_FORMS.map((form) => ({ value: form, label: form }))}
          />
          <Input
            label="Strength"
            value={drugForm.strength}
            onChange={(e) => setDrugForm((f) => ({ ...f, strength: e.target.value }))}
            placeholder="e.g., 500mg"
          />
        </div>
      </Modal>

    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  Billing Section — Settings → Billing tab
// ────────────────────────────────────────────────────────────────────

const PLAN_DESCRIPTIONS: Record<string, string> = {
  tier_1: 'For single-location clinics',
  tier_2_6: 'For growing multi-location practices',
  tier_6plus: 'For chains and multi-location networks',
};

const STATUS_LABELS: Record<ClinicBilling['subscription_status'], { label: string; tone: 'info' | 'success' | 'warning' | 'danger' }> = {
  trialing: { label: 'Free trial', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  past_due: { label: 'Past due', tone: 'warning' },
  canceled: { label: 'Canceled', tone: 'danger' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.ceil(ms / 86_400_000);
}

function BillingSection({ billing, onPaid }: { billing: ClinicBilling | null; onPaid: () => void }) {
  if (!billing) {
    return (
      <Card title="Subscription">
        <EmptyState
          icon={CreditCard}
          title="No subscription on file"
          description="This account wasn't created through the standard signup flow, so we don't have billing details for it. Contact support if you believe this is a mistake."
        />
      </Card>
    );
  }

  const status = STATUS_LABELS[billing.subscription_status] ?? {
    label: billing.subscription_status,
    tone: 'info' as const,
  };
  const now = new Date().toISOString();
  const trialDaysLeft = daysBetween(now, billing.trial_end);
  const isTrialing = billing.subscription_status === 'trialing';
  const trialExpired = isTrialing && trialDaysLeft <= 0;

  return (
    <div className="space-y-6">
      {/* Plan hero */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{billing.planLabel}</h3>
              <Badge variant={status.tone}>{status.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">{PLAN_DESCRIPTIONS[billing.plan] ?? 'Custom plan'}</p>
            {(billing.planMonthlyCentavos != null || billing.planAnnualCentavos != null) && (
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold text-gray-900">
                {billing.planMonthlyCentavos != null && (
                  <span className={billing.billing_period === 'annual' ? 'text-gray-400' : ''}>
                    {formatMoney(billing.planMonthlyCentavos)}
                    <span className="ml-1 text-sm font-normal text-gray-500">/ mo</span>
                  </span>
                )}
                {billing.planMonthlyCentavos != null && billing.planAnnualCentavos != null && (
                  <span className="text-sm font-normal text-gray-400">or</span>
                )}
                {billing.planAnnualCentavos != null && (
                  <span className={billing.billing_period !== 'annual' ? 'text-gray-400' : ''}>
                    {formatMoney(billing.planAnnualCentavos)}
                    <span className="ml-1 text-sm font-normal text-gray-500">/ yr</span>
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Pay via QR — GCash, Maya, or any QRPh bank app */}
      <Card title="Pay your subscription">
        <p className="mb-4 text-sm text-gray-500">
          Generate a QR code to pay for the next billing period. Payment is confirmed
          automatically — no need to refresh this page.
        </p>
        <PayInvoiceCard onPaid={onPaid} />
      </Card>

      {/* Trial countdown card — only while trialing */}
      {isTrialing && (
        <Card>
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              trialExpired ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600',
            )}>
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1">
              {trialExpired ? (
                <>
                  <p className="text-base font-semibold text-gray-900">Your free trial has ended</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Trial ended on {formatDate(billing.trial_end)}. Add a payment method to keep
                    using Ava without interruption.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-900">
                    {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left in your free trial
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Your trial ends on {formatDate(billing.trial_end)}. You won't be charged until then.
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Account details */}
      <Card title="Account details">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Clinic name</dt>
            <dd className="mt-1 text-sm text-gray-900">{billing.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan</dt>
            <dd className="mt-1 text-sm text-gray-900">{billing.planLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Member since</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(billing.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {isTrialing ? 'Trial ends' : 'Next charge'}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(billing.trial_end)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Paid through</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {billing.paid_until ? formatDate(billing.paid_until) : '—'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Help footer */}
      <p className="text-xs text-gray-500">
        Need help with billing? Email{' '}
        <a
          className="font-medium text-primary-600 hover:underline"
          href="mailto:support@avasmartdental.ph"
        >
          support@avasmartdental.ph
        </a>
        .
      </p>
    </div>
  );
}
