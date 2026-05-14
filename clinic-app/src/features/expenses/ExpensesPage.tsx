import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  CalendarRange,
  PhilippinePeso,
} from 'lucide-react';
import * as api from '@/lib/api';
import type { Expense, ExpenseCategory } from '@/types/models';
import { formatDate, formatMoney, pesosToCentavos, centavosToPesos, todayISO, cn } from '@/lib/utils';
import {
  Button, Card, Input, Select, Modal, Badge,
  Table, Thead, Tbody, Tr, Th, Td,
  EmptyState,
} from '@/components/ui';
import { showToast } from '@/components/ui/ToastContainer';

const PAYMENT_METHODS = ['cash', 'card', 'gcash', 'bank_transfer', 'cheque'] as const;

const CATEGORY_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#f97316',
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(todayISO());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [exp, cat] = await Promise.all([api.getExpenses(), api.getExpenseCategories()]);
      setExpenses(exp);
      setCategories(cat);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const categoryById = useMemo(() => {
    const m = new Map<number, ExpenseCategory>();
    for (const c of categories) m.set(c.category_id, c);
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (e.date < dateFrom || e.date > dateTo) return false;
      if (categoryFilter !== 'all') {
        const id = categoryFilter === 'none' ? null : Number(categoryFilter);
        if (e.category_id !== id) return false;
      }
      return true;
    });
  }, [expenses, dateFrom, dateTo, categoryFilter]);

  const total = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount_int, 0),
    [filtered],
  );

  const byCategory = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const e of filtered) {
      map.set(e.category_id, (map.get(e.category_id) || 0) + e.amount_int);
    }
    return [...map.entries()]
      .map(([id, amt]) => ({
        id,
        name: id === null ? 'Uncategorized' : (categoryById.get(id)?.name || 'Uncategorized'),
        color: id === null ? '#9ca3af' : (categoryById.get(id)?.color || '#6366f1'),
        total: amt,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, categoryById]);

  const confirmDeleteExpense = async () => {
    if (!deleteExpenseTarget) return;
    setDeletingExpense(true);
    try {
      await api.deleteExpense(deleteExpenseTarget.expense_id);
      setExpenses((prev) => prev.filter((e) => e.expense_id !== deleteExpenseTarget.expense_id));
      showToast('success', 'Expense deleted');
      setDeleteExpenseTarget(null);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to delete expense');
    } finally {
      setDeletingExpense(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            Track clinic spending by category and payment method.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            leftIcon={<Tag className="h-4 w-4" />}
            onClick={() => setCategoryModalOpen(true)}
          >
            Categories
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditingExpense(null); setExpenseModalOpen(true); }}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters + Total */}
      <Card padding={true}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:flex-1">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All categories' },
                { value: 'none', label: 'Uncategorized' },
                ...categories.map((c) => ({ value: String(c.category_id), label: c.name })),
              ]}
            />
          </div>
          <div className="rounded-lg bg-primary-50 px-4 py-3 sm:min-w-[180px] sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary-700">
              Period total
            </p>
            <p className="mt-0.5 text-xl font-bold text-primary-900">
              {formatMoney(total)}
            </p>
            <p className="text-[11px] text-primary-700/70">
              {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
        </div>
      </Card>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <Card padding={true}>
          <div className="mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">By category</h3>
          </div>
          <div className="space-y-2">
            {byCategory.map((row) => {
              const pct = total > 0 ? (row.total / total) * 100 : 0;
              return (
                <div key={String(row.id)} className="flex items-center gap-3">
                  <div className="flex w-44 shrink-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                    <span className="truncate text-sm text-gray-700">{row.name}</span>
                  </div>
                  <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, background: row.color }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-sm font-medium text-gray-900">
                    {formatMoney(row.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Expense list */}
      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
            <span className="ml-3 text-sm text-gray-500">Loading expenses...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PhilippinePeso}
            title="No expenses in this period"
            description="Adjust the date range or add a new expense."
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => { setEditingExpense(null); setExpenseModalOpen(true); }}
              >
                Add Expense
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Method</Th>
                <Th>Remarks</Th>
                <Th className="text-right">Amount</Th>
                <Th className="w-24" />
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((e) => {
                const cat = e.category_id != null ? categoryById.get(e.category_id) : null;
                return (
                  <Tr key={e.expense_id}>
                    <Td className="whitespace-nowrap">{formatDate(e.date)}</Td>
                    <Td>
                      {cat ? (
                        <Badge variant="default">
                          <span
                            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                            style={{ background: cat.color }}
                          />
                          {cat.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </Td>
                    <Td className="capitalize text-gray-600">{e.payment_method.replace('_', ' ')}</Td>
                    <Td className="max-w-md">
                      <span className="line-clamp-2 text-gray-700">{e.remarks || <span className="text-gray-400">--</span>}</span>
                    </Td>
                    <Td className="text-right font-medium whitespace-nowrap">{formatMoney(e.amount_int)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingExpense(e); setExpenseModalOpen(true); }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteExpenseTarget(e)}
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
        )}
      </Card>

      <ExpenseModal
        isOpen={expenseModalOpen}
        expense={editingExpense}
        categories={categories}
        onClose={() => setExpenseModalOpen(false)}
        onSaved={() => { setExpenseModalOpen(false); fetchAll(); }}
      />

      <CategoryManagerModal
        isOpen={categoryModalOpen}
        categories={categories}
        onClose={() => setCategoryModalOpen(false)}
        onChanged={fetchAll}
      />

      {/* Delete Expense Confirmation */}
      <Modal
        isOpen={deleteExpenseTarget !== null}
        onClose={() => setDeleteExpenseTarget(null)}
        title="Delete Expense"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteExpenseTarget(null)} disabled={deletingExpense}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteExpense} loading={deletingExpense}>
              Delete
            </Button>
          </>
        }
      >
        {deleteExpenseTarget && (
          <p className="text-sm text-gray-600">
            Permanently delete this expense entry of {formatMoney(deleteExpenseTarget.amount_int)} from{' '}
            {formatDate(deleteExpenseTarget.date)}?
          </p>
        )}
      </Modal>
    </div>
  );
}

// ─── Expense Add/Edit Modal ──────────────────────────────────────
function ExpenseModal({
  isOpen, expense, categories, onClose, onSaved,
}: {
  isOpen: boolean;
  expense: Expense | null;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    category_id: '' as string,
    date: todayISO(),
    amount: '',
    payment_method: 'cash' as string,
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (expense) {
      setForm({
        category_id: expense.category_id == null ? '' : String(expense.category_id),
        date: expense.date,
        amount: String(centavosToPesos(expense.amount_int)),
        payment_method: expense.payment_method,
        remarks: expense.remarks,
      });
    } else {
      setForm({
        category_id: '',
        date: todayISO(),
        amount: '',
        payment_method: 'cash',
        remarks: '',
      });
    }
    setErrors({});
  }, [isOpen, expense]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.date) errs.date = 'Date is required';
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        category_id: form.category_id ? Number(form.category_id) : null,
        date: form.date,
        amount_int: pesosToCentavos(Number(form.amount)),
        payment_method: form.payment_method,
        remarks: form.remarks.trim(),
      };
      if (expense) {
        await api.updateExpense(expense.expense_id, payload);
        showToast('success', 'Expense updated');
      } else {
        await api.createExpense(payload);
        showToast('success', 'Expense added');
      }
      onSaved();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', expense ? 'Failed to update expense' : 'Failed to add expense', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? 'Edit Expense' : 'Add Expense'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {expense ? 'Save Changes' : 'Add Expense'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className={cn(
                'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.date ? 'border-danger-500' : 'border-gray-300',
              )}
            />
            {errors.date && <p className="mt-1 text-xs text-danger-500">{errors.date}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount (PHP) *</label>
            <div className="relative">
              <PhilippinePeso className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className={cn(
                  'block w-full rounded-lg border bg-white pl-9 pr-3 py-2 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  errors.amount ? 'border-danger-500' : 'border-gray-300',
                )}
              />
            </div>
            {errors.amount && <p className="mt-1 text-xs text-danger-500">{errors.amount}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={form.category_id}
            onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
            options={[
              { value: '', label: 'Uncategorized' },
              ...categories.map((c) => ({ value: String(c.category_id), label: c.name })),
            ]}
          />
          <Select
            label="Payment Method"
            value={form.payment_method}
            onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m.replace('_', ' ') }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Remarks</label>
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
            placeholder="What was this for?"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Category Manager Modal ──────────────────────────────────────
function CategoryManagerModal({
  isOpen, categories, onClose, onChanged,
}: {
  isOpen: boolean;
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  useEffect(() => {
    if (isOpen) { setName(''); setColor(CATEGORY_COLORS[0]); }
  }, [isOpen]);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await api.createExpenseCategory({ name: trimmed, color });
      showToast('success', 'Category added');
      setName('');
      onChanged();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      showToast('error', 'Failed to add category', message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingCat(true);
    try {
      await api.deleteExpenseCategory(deleteTarget.category_id);
      showToast('success', 'Category deleted');
      setDeleteTarget(null);
      onChanged();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to delete category');
    } finally {
      setDeletingCat(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expense Categories" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 p-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">New category</h4>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Name"
                placeholder="e.g. Utilities"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform',
                      color === c ? 'scale-110 border-gray-700' : 'border-transparent',
                    )}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} loading={saving} disabled={!name.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Existing</h4>
          {categories.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
              No categories yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {categories.map((c) => (
                <li key={c.category_id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                    <span className="text-sm text-gray-800">{c.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    className="rounded p-1 text-gray-400 hover:bg-danger-50 hover:text-danger-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletingCat}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deletingCat}>
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-gray-600">
            Delete <strong>{deleteTarget.name}</strong>? Expenses using this category will become uncategorized.
          </p>
        )}
      </Modal>
    </Modal>
  );
}
