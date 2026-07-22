import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Star,
  Minus,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge, paymentTone } from '../components/ui/Badge';
import { TextArea, TextField } from '../components/ui/Field';
import { api, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes2, number, shortDateTime } from '../lib/format';
import type {
  ApiEnvelope,
  Customer,
  CustomerPayload,
  CustomerSale,
  PaginationMeta,
} from '../types';

// ── Permission (ADMIN, MANAGER & CASHIER all hold this) ───────────────────────
const PERM_MANAGE = 'customer:manage';

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const PAGE_SIZE = 15;

type Filter = 'all' | 'balance';

// ── Page ─────────────────────────────────────────────────────────────────────

export function Customers() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERM_MANAGE);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The top bar links here with ?search=… , so seed the box from the URL.
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [filter, setFilter] = useState<Filter>(
    params.get('filter') === 'balance' ? 'balance' : 'all',
  );
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // 'new' opens the create modal; a Customer opens the edit modal.
  const [editing, setEditing] = useState<'new' | Customer | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Keep the toolbar in sync when the top bar links here again while already mounted.
  useEffect(() => {
    setSearch(params.get('search') ?? '');
    if (params.get('filter') === 'balance') setFilter('balance');
  }, [params]);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // Load customers (debounced on search).
  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      const q = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy: 'name',
        sortOrder: 'asc',
      });
      if (search.trim()) q.set('search', search.trim());
      if (filter === 'balance') q.set('hasBalance', 'true');

      getList<Customer>(`/customers?${q.toString()}`)
        .then(({ data, meta: m }) => {
          if (!active) return;
          setCustomers(data);
          setMeta((m as PaginationMeta) ?? null);
        })
        .catch((err) => active && setError(apiErrorMessage(err, 'Could not load customers')))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [canManage, search, filter, page, refreshKey]);

  if (!canManage) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <Users size={32} className="mx-auto mb-3 text-content-muted/50" />
        <h1 className="font-heading text-lg font-semibold text-content">Customers</h1>
        <p className="mt-1 text-sm text-content-muted">
          You don't have permission to manage customers.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Customers</h1>
          <p className="text-sm text-content-muted">
            {meta ? `${number(meta.total)} customers` : 'Manage your customer base'}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
        >
          <Plus size={16} /> New customer
        </button>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or email…"
              className="w-full rounded-full border border-hairline bg-surface py-2.5 pl-11 pr-4 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1 rounded-full border border-hairline p-1">
            {(['all', 'balance'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-ink-900 text-white'
                    : 'text-content-secondary hover:bg-slate-100'
                }`}
              >
                {f === 'all' ? 'All' : 'Owing balance'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3 text-right">Points</th>
                <th className="px-6 py-3 text-right">Owes</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-content-muted">
                    Loading customers…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-content-muted">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const owed = toNum(c.outstandingBalance);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setEditing(c)}
                      className="cursor-pointer hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3 font-medium text-content">{c.name}</td>
                      <td className="px-6 py-3 text-content-secondary">
                        <div className="space-y-0.5">
                          {c.phone && (
                            <p className="flex items-center gap-1.5 text-xs">
                              <Phone size={12} className="text-content-muted" /> {c.phone}
                            </p>
                          )}
                          {c.email && (
                            <p className="flex items-center gap-1.5 text-xs">
                              <Mail size={12} className="text-content-muted" /> {c.email}
                            </p>
                          )}
                          {!c.phone && !c.email && <span className="text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-content-secondary">
                          <Star size={13} className="text-amber-500" /> {number(c.loyaltyPoints)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {owed > 0 ? (
                          <Badge tone="warning">{kes2(owed)}</Badge>
                        ) : (
                          <span className="text-content-muted">{kes2(0)}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                          <Pencil size={13} /> Edit
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
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
        <CustomerFormModal
          customer={editing === 'new' ? null : editing}
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
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

function toForm(c: Customer | null): Form {
  return {
    name: c?.name ?? '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    address: c?.address ?? '',
    notes: c?.notes ?? '',
  };
}

function CustomerFormModal({
  customer,
  onClose,
  onSaved,
  onDeleted,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState<Form>(() => toForm(customer));
  const [points, setPoints] = useState(customer?.loyaltyPoints ?? 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const owed = toNum(customer?.outstandingBalance);

  const save = async () => {
    if (!form.name.trim()) return setError('Customer name is required');

    const payload: CustomerPayload = { name: form.name.trim() };
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    setSaving(true);
    setError(null);
    try {
      if (isEdit && customer) {
        await api.patch<ApiEnvelope<Customer>>(`/customers/${customer.id}`, payload);
      } else {
        await api.post<ApiEnvelope<Customer>>('/customers', payload);
      }
      onSaved();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save customer'));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!customer) return;
    if (owed > 0) return setError('Cannot delete a customer with an outstanding balance');
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete<ApiEnvelope<null>>(`/customers/${customer.id}`);
      onDeleted();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not delete customer'));
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
        className="my-8 w-full max-w-xl p-0"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-heading text-base font-semibold text-content">
            {isEdit ? 'Edit customer' : 'New customer'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-content-muted hover:bg-slate-100 hover:text-content"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          {/* Account summary (edit only) */}
          {isEdit && customer && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-hairline px-4 py-3">
                <p className="text-xs text-content-muted">Outstanding balance</p>
                <p
                  className={`font-heading text-lg font-bold ${
                    owed > 0 ? 'text-amber-700' : 'text-content'
                  }`}
                >
                  {kes2(owed)}
                </p>
              </div>
              <div className="rounded-lg border border-hairline px-4 py-3">
                <p className="text-xs text-content-muted">Loyalty points</p>
                <p className="flex items-center gap-1.5 font-heading text-lg font-bold text-content">
                  <Star size={16} className="text-amber-500" /> {number(points)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Name *"
              value={form.name}
              onChange={(v) => set('name', v)}
              className="sm:col-span-2"
            />
            <TextField label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
            <TextField label="Email" value={form.email} onChange={(v) => set('email', v)} />
            <TextField
              label="Address"
              value={form.address}
              onChange={(v) => set('address', v)}
              className="sm:col-span-2"
            />
            <TextArea
              label="Notes"
              value={form.notes}
              onChange={(v) => set('notes', v)}
              className="sm:col-span-2"
            />
          </div>

          {/* Loyalty + purchase history (edit only) */}
          {isEdit && customer && (
            <>
              <LoyaltyAdjuster
                customerId={customer.id}
                onAdjusted={(newTotal) => setPoints(newTotal)}
              />
              <PurchaseHistory customerId={customer.id} />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hairline px-6 py-4">
          {isEdit ? (
            <button
              onClick={remove}
              disabled={busy || owed > 0}
              title={owed > 0 ? 'Settle the outstanding balance first' : undefined}
              className="flex items-center gap-1.5 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              {isEdit ? 'Save changes' : 'Create customer'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Loyalty point adjuster ───────────────────────────────────────────────────

function LoyaltyAdjuster({
  customerId,
  onAdjusted,
}: {
  customerId: string;
  onAdjusted: (newTotal: number) => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (sign: 1 | -1) => {
    const pts = Math.floor(toNum(amount));
    if (pts <= 0) return setError('Enter a number of points');
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<ApiEnvelope<Customer>>(`/customers/${customerId}/loyalty`, {
        points: sign * pts,
        reason: reason.trim() || undefined,
      });
      onAdjusted(res.data.data.loyaltyPoints);
      setAmount('');
      setReason('');
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not adjust points'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-hairline p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
        Adjust loyalty points
      </p>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Points"
          className="w-24 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none"
        />
        <button
          onClick={() => apply(1)}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
        >
          <Plus size={14} /> Add
        </button>
        <button
          onClick={() => apply(-1)}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
        >
          <Minus size={14} /> Redeem
        </button>
      </div>
    </div>
  );
}

// ── Purchase history ─────────────────────────────────────────────────────────

function PurchaseHistory({ customerId }: { customerId: string }) {
  const [sales, setSales] = useState<CustomerSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getList<CustomerSale>(`/customers/${customerId}/purchase-history?pageSize=5`)
      .then(({ data }) => active && setSales(data))
      .catch(() => active && setSales([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [customerId]);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
        Recent purchases
      </p>
      {loading ? (
        <p className="py-3 text-sm text-content-muted">Loading…</p>
      ) : sales.length === 0 ? (
        <p className="py-3 text-sm text-content-muted">No purchases yet.</p>
      ) : (
        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {sales.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-content">{s.receiptNumber}</p>
                <p className="text-xs text-content-muted">
                  {shortDateTime(s.soldAt)} · {number(s._count?.items ?? 0)} items
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={paymentTone(s.paymentStatus)}>{s.paymentStatus}</Badge>
                <span className="text-sm font-semibold text-content">{kes2(s.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
