import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TextArea } from '../components/ui/Field';
import { api, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes2, number } from '../lib/format';
import type { ApiEnvelope, Expense, ExpensePayload, PaginationMeta } from '../types';

// ── Permission ────────────────────────────────────────────────────────────────
// Expenses feed profit reporting, so the backend gates every route behind
// `report:view` (ADMIN & MANAGER hold it; CASHIER does not).
const PERM_VIEW = 'report:view';

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

// Common expense categories — used for the filter dropdown and form suggestions.
const CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Transport',
  'Marketing',
  'Supplies',
  'Maintenance',
  'Internet',
  'Licenses',
  'Bank Charges',
  'Miscellaneous',
];

const PAGE_SIZE = 20;

const dateOnly = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

function isoStart(d: string): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function isoEnd(d: string): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}
function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Expenses() {
  const { hasPermission } = useAuth();
  const canView = hasPermission(PERM_VIEW);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // 'new' opens the create modal; an Expense opens the edit modal.
  const [editing, setEditing] = useState<'new' | Expense | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [category, from, to]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy: 'incurredAt',
      sortOrder: 'desc',
    });
    if (category) q.set('category', category);
    if (from) q.set('from', isoStart(from));
    if (to) q.set('to', isoEnd(to));

    getList<Expense>(`/expenses?${q.toString()}`)
      .then(({ data, meta: m }) => {
        if (!active) return;
        setExpenses(data);
        setMeta((m as PaginationMeta) ?? null);
      })
      .catch((err) => active && setError(apiErrorMessage(err, 'Could not load expenses')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [canView, category, from, to, page, refreshKey]);

  const pageTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + toNum(e.amount), 0),
    [expenses],
  );

  if (!canView) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <Receipt size={32} className="mx-auto mb-3 text-content-muted/50" />
        <h1 className="font-heading text-lg font-semibold text-content">Expenses</h1>
        <p className="mt-1 text-sm text-content-muted">
          You don't have permission to view expenses. This area is available to managers and
          administrators.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Expenses</h1>
          <p className="text-sm text-content-muted">
            {meta ? `${number(meta.total)} expenses recorded` : 'Track operating costs'}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
        >
          <Plus size={16} /> New expense
        </button>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm text-content-secondary focus:border-primary focus:outline-none lg:flex-1"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              max={to || todayInput()}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-hairline bg-surface px-3 py-2 text-content focus:border-primary focus:outline-none"
            />
            <span className="text-content-muted">to</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayInput()}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-hairline bg-surface px-3 py-2 text-content focus:border-primary focus:outline-none"
            />
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                className="rounded-lg border border-hairline px-3 py-2 text-content-secondary hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-content-muted">
                    Loading expenses…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-content-muted">
                    No expenses match your filters.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setEditing(e)}
                    className="cursor-pointer hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3 text-content-secondary">{dateOnly(e.incurredAt)}</td>
                    <td className="px-6 py-3">
                      <Badge tone="neutral">{e.category}</Badge>
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-content-secondary">
                      {e.description || '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-content">
                      {kes2(e.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                        <Pencil size={13} /> Edit
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && expenses.length > 0 && (
              <tfoot>
                <tr className="border-t border-hairline bg-slate-50 text-sm">
                  <td colSpan={3} className="px-6 py-3 font-medium text-content-secondary">
                    Page total
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-content">
                    {kes2(pageTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-hairline px-6 py-3 text-sm">
            <span className="text-content-muted">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrev}
                className="flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-content-secondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNext}
                className="flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-content-secondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <ExpenseFormModal
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          onDeleted={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Create / edit form ───────────────────────────────────────────────────────

interface Form {
  category: string;
  amount: string;
  incurredAt: string;
  description: string;
}

function toForm(e: Expense | null): Form {
  return {
    category: e?.category ?? '',
    amount: e ? String(toNum(e.amount)) : '',
    incurredAt: e ? new Date(e.incurredAt).toISOString().slice(0, 10) : todayInput(),
    description: e?.description ?? '',
  };
}

function ExpenseFormModal({
  expense,
  onClose,
  onSaved,
  onDeleted,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isEdit = !!expense;
  const [form, setForm] = useState<Form>(() => toForm(expense));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.category.trim()) return setError('Category is required');
    const amount = toNum(form.amount);
    if (amount <= 0) return setError('Amount must be greater than zero');

    const payload: ExpensePayload = {
      category: form.category.trim(),
      amount,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.incurredAt) payload.incurredAt = new Date(form.incurredAt).toISOString();

    setSaving(true);
    setError(null);
    try {
      if (isEdit && expense) {
        await api.patch<ApiEnvelope<Expense>>(`/expenses/${expense.id}`, payload);
      } else {
        await api.post<ApiEnvelope<Expense>>('/expenses', payload);
      }
      onSaved();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save expense'));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!expense || !window.confirm('Delete this expense?')) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete<ApiEnvelope<null>>(`/expenses/${expense.id}`);
      onDeleted();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not delete expense'));
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <Card
        className="my-8 w-full max-w-lg p-0"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-heading text-base font-semibold text-content">
            {isEdit ? 'Edit expense' : 'New expense'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-content-muted hover:bg-slate-100 hover:text-content"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-medium text-content-secondary">
                Category *
              </span>
              <input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                list="expense-categories"
                placeholder="e.g. Rent"
                className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <datalist id="expense-categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-content-secondary">
                Amount (KES) *
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-content-secondary">
                Date incurred
              </span>
              <input
                type="date"
                value={form.incurredAt}
                max={todayInput()}
                onChange={(e) => set('incurredAt', e.target.value)}
                className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <TextArea
              label="Description"
              value={form.description}
              onChange={(v) => set('description', v)}
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hairline px-6 py-4">
          {isEdit ? (
            <button
              onClick={remove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={15} />}{' '}
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Record expense'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
