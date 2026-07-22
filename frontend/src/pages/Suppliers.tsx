import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Truck,
  Pencil,
  Trash2,
  Mail,
  Phone,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TextArea, TextField } from '../components/ui/Field';
import { api, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes2, number } from '../lib/format';
import type { ApiEnvelope, PaginationMeta, Supplier, SupplierPayload } from '../types';

// ── Permission (ADMIN & MANAGER hold this; CASHIER does not) ──────────────────
const PERM_MANAGE = 'supplier:manage';

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const PAGE_SIZE = 15;

// ── Page ─────────────────────────────────────────────────────────────────────

export function Suppliers() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERM_MANAGE);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The top bar links here with ?search=… , so seed the box from the URL.
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // 'new' opens the create modal; a Supplier opens the edit modal.
  const [editing, setEditing] = useState<'new' | Supplier | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Keep the box in sync when the top bar links here again while already mounted.
  useEffect(() => {
    setSearch(params.get('search') ?? '');
  }, [params]);

  // Reset to first page whenever the search changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Load suppliers (debounced on search).
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

      getList<Supplier>(`/suppliers?${q.toString()}`)
        .then(({ data, meta: m }) => {
          if (!active) return;
          setSuppliers(data);
          setMeta((m as PaginationMeta) ?? null);
        })
        .catch((err) => active && setError(apiErrorMessage(err, 'Could not load suppliers')))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [canManage, search, page, refreshKey]);

  if (!canManage) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <Truck size={32} className="mx-auto mb-3 text-content-muted/50" />
        <h1 className="font-heading text-lg font-semibold text-content">Suppliers</h1>
        <p className="mt-1 text-sm text-content-muted">
          You don't have permission to manage suppliers. This area is available to managers and
          administrators.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Suppliers</h1>
          <p className="text-sm text-content-muted">
            {meta ? `${number(meta.total)} suppliers` : 'Manage the people you buy from'}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
        >
          <Plus size={16} /> New supplier
        </button>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="relative">
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
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3 text-right">Owed</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-content-muted">
                    Loading suppliers…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-content-muted">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => {
                  const owed = toNum(s.outstandingBalance);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setEditing(s)}
                      className="cursor-pointer hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium text-content">{s.name}</p>
                        {s.contactName && (
                          <p className="text-xs text-content-muted">{s.contactName}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-content-secondary">
                        <div className="space-y-0.5">
                          {s.phone && (
                            <p className="flex items-center gap-1.5 text-xs">
                              <Phone size={12} className="text-content-muted" /> {s.phone}
                            </p>
                          )}
                          {s.email && (
                            <p className="flex items-center gap-1.5 text-xs">
                              <Mail size={12} className="text-content-muted" /> {s.email}
                            </p>
                          )}
                          {!s.phone && !s.email && <span className="text-xs">—</span>}
                        </div>
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
        <SupplierFormModal
          supplier={editing === 'new' ? null : editing}
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
  contactName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  notes: string;
}

function toForm(s: Supplier | null): Form {
  return {
    name: s?.name ?? '',
    contactName: s?.contactName ?? '',
    email: s?.email ?? '',
    phone: s?.phone ?? '',
    address: s?.address ?? '',
    taxNumber: s?.taxNumber ?? '',
    notes: s?.notes ?? '',
  };
}

function SupplierFormModal({
  supplier,
  onClose,
  onSaved,
  onDeleted,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isEdit = !!supplier;
  const [form, setForm] = useState<Form>(() => toForm(supplier));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) return setError('Supplier name is required');

    // Only send non-empty optional fields so validation passes.
    const payload: SupplierPayload = { name: form.name.trim() };
    if (form.contactName.trim()) payload.contactName = form.contactName.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.taxNumber.trim()) payload.taxNumber = form.taxNumber.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    setSaving(true);
    setError(null);
    try {
      if (isEdit && supplier) {
        await api.patch<ApiEnvelope<Supplier>>(`/suppliers/${supplier.id}`, payload);
      } else {
        await api.post<ApiEnvelope<Supplier>>('/suppliers', payload);
      }
      onSaved();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save supplier'));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!supplier || !window.confirm(`Delete supplier "${supplier.name}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete<ApiEnvelope<null>>(`/suppliers/${supplier.id}`);
      onDeleted();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not delete supplier'));
      setDeleting(false);
    }
  };

  const owed = toNum(supplier?.outstandingBalance);
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
            {isEdit ? 'Edit supplier' : 'New supplier'}
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

          {isEdit && owed > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2.5 text-sm">
              <span className="text-amber-800">Outstanding balance owed</span>
              <span className="font-semibold text-amber-800">{kes2(owed)}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Name *"
              value={form.name}
              onChange={(v) => set('name', v)}
              className="sm:col-span-2"
            />
            <TextField
              label="Contact person"
              value={form.contactName}
              onChange={(v) => set('contactName', v)}
            />
            <TextField label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
            <TextField label="Email" value={form.email} onChange={(v) => set('email', v)} />
            <TextField
              label="Tax / PIN number"
              value={form.taxNumber}
              onChange={(v) => set('taxNumber', v)}
            />
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
              {isEdit ? 'Save changes' : 'Create supplier'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
