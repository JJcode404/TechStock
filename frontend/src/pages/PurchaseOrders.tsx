import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  Ban,
  Pencil,
  Package,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SelectField, TextArea, type Option } from '../components/ui/Field';
import { api, getData, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes2, number, shortDateTime } from '../lib/format';
import type {
  ApiEnvelope,
  CreatePurchaseOrderPayload,
  PaginationMeta,
  Product,
  PurchaseOrder,
  PurchaseOrderRow,
  PurchaseOrderStatus,
  ReceivePurchaseOrderPayload,
  Supplier,
  UpdatePurchaseOrderPayload,
} from '../types';

// ── Permissions (ADMIN & MANAGER hold these; CASHIER holds none of them) ──────
const PERM_READ = 'purchase:read';
const PERM_CREATE = 'purchase:create';
const PERM_UPDATE = 'purchase:update';
const PERM_RECEIVE = 'purchase:receive';

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUSES: PurchaseOrderStatus[] = [
  'DRAFT',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
];

const statusFromParam = (v: string | null): '' | PurchaseOrderStatus =>
  STATUSES.includes(v as PurchaseOrderStatus) ? (v as PurchaseOrderStatus) : '';

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const STATUS_META: Record<PurchaseOrderStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ORDERED: { label: 'Ordered', tone: 'info' },
  PARTIALLY_RECEIVED: { label: 'Partially received', tone: 'warning' },
  RECEIVED: { label: 'Received', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

const STATUS_FILTERS: { value: '' | PurchaseOrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 15;

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PurchaseOrders() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission(PERM_READ);
  const canCreate = hasPermission(PERM_CREATE);
  const canUpdate = hasPermission(PERM_UPDATE);
  const canReceive = hasPermission(PERM_RECEIVE);

  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The notification panel links here with ?status=… , so seed the filter from it.
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'' | PurchaseOrderStatus>(
    () => statusFromParam(params.get('status')),
  );
  const [supplierId, setSupplierId] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<'new' | PurchaseOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Supplier options for the filter dropdown.
  useEffect(() => {
    if (!canRead) return;
    getList<Supplier>('/suppliers?pageSize=200&sortBy=name&sortOrder=asc')
      .then(({ data }) => setSuppliers(data))
      .catch(() => setSuppliers([]));
  }, [canRead]);

  // Keep the filter in sync when the bell links here again while already mounted.
  useEffect(() => {
    setStatus(statusFromParam(params.get('status')));
  }, [params]);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [status, supplierId]);

  // Load purchase orders.
  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (status) q.set('status', status);
    if (supplierId) q.set('supplierId', supplierId);

    getList<PurchaseOrderRow>(`/purchase-orders?${q.toString()}`)
      .then(({ data, meta: m }) => {
        if (!active) return;
        setOrders(data);
        setMeta((m as PaginationMeta) ?? null);
      })
      .catch((err) => active && setError(apiErrorMessage(err, 'Could not load purchase orders')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [canRead, status, supplierId, page, refreshKey]);

  if (!canRead) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <ClipboardList size={32} className="mx-auto mb-3 text-content-muted/50" />
        <h1 className="font-heading text-lg font-semibold text-content">Purchase Orders</h1>
        <p className="mt-1 text-sm text-content-muted">
          You don't have permission to view purchase orders. This area is available to managers and
          administrators.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Purchase Orders</h1>
          <p className="text-sm text-content-muted">
            {meta ? `${number(meta.total)} orders` : 'Restock inventory from suppliers'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
          >
            <Plus size={16} /> New order
          </button>
        )}
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm text-content-secondary focus:border-primary focus:outline-none lg:flex-1"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 rounded-full border border-hairline p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                onClick={() => setStatus(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === f.value
                    ? 'bg-ink-900 text-white'
                    : 'text-content-secondary hover:bg-slate-100'
                }`}
              >
                {f.label}
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
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3 text-right">Items</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-content-muted">
                    Loading purchase orders…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-content-muted">
                    No purchase orders match your filters.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => setDetailId(po.id)}
                    className="cursor-pointer hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3 font-medium text-content">{po.orderNumber}</td>
                    <td className="px-6 py-3 text-content-secondary">
                      {po.supplier?.name ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-right text-content-secondary">
                      {number(po._count?.items ?? 0)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-content">
                      {kes2(po.total)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="px-6 py-3 text-content-muted">{shortDateTime(po.createdAt)}</td>
                  </tr>
                ))
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
        <PurchaseOrderFormModal
          suppliers={suppliers}
          order={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {detailId && (
        <PurchaseOrderDetailModal
          id={detailId}
          canUpdate={canUpdate}
          canReceive={canReceive}
          onClose={() => setDetailId(null)}
          onEdit={(po) => {
            setDetailId(null);
            setEditing(po);
          }}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

// ── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <Card
        className={`my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-0`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-heading text-base font-semibold text-content">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-content-muted hover:bg-slate-100 hover:text-content"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">{footer}</div>
        )}
      </Card>
    </div>
  );
}

// ── Create / edit form ───────────────────────────────────────────────────────

interface DraftLine {
  productId: string;
  name: string;
  sku: string;
  quantity: string;
  unitCost: string;
  taxRate: string;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function PurchaseOrderFormModal({
  suppliers,
  order,
  onClose,
  onSaved,
}: {
  suppliers: Supplier[];
  order: PurchaseOrder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!order;
  const supplierOptions: Option[] = suppliers.map((s) => ({ id: s.id, name: s.name }));

  const [supplierId, setSupplierId] = useState(order?.supplierId ?? '');
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [expectedAt, setExpectedAt] = useState(toDateInput(order?.expectedAt));
  const [lines, setLines] = useState<DraftLine[]>(
    order
      ? order.items.map((i) => ({
          productId: i.productId,
          name: i.product?.name ?? 'Product',
          sku: i.product?.sku ?? '',
          quantity: String(i.quantity),
          unitCost: String(toNum(i.unitCost)),
          taxRate: String(toNum(i.taxRate)),
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addProduct = (p: Product) => {
    setLines((prev) => {
      if (prev.some((l) => l.productId === p.id)) return prev;
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          quantity: '1',
          unitCost: String(toNum(p.buyingPrice ?? 0)),
          taxRate: String(toNum(p.taxRate)),
        },
      ];
    });
  };

  const setLine = (id: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.productId !== id));

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of lines) {
      const net = round2(toNum(l.unitCost) * Math.floor(toNum(l.quantity)));
      subtotal += net;
      tax += round2((net * toNum(l.taxRate)) / 100);
    }
    subtotal = round2(subtotal);
    tax = round2(tax);
    return { subtotal, tax, total: round2(subtotal + tax) };
  }, [lines]);

  const buildItems = () =>
    lines.map((l) => ({
      productId: l.productId,
      quantity: Math.floor(toNum(l.quantity)),
      unitCost: round2(toNum(l.unitCost)),
      taxRate: round2(toNum(l.taxRate)),
    }));

  const validate = (): string | null => {
    if (!supplierId) return 'Select a supplier';
    if (lines.length === 0) return 'Add at least one product';
    for (const l of lines) {
      if (Math.floor(toNum(l.quantity)) <= 0) return `Quantity for ${l.name} must be at least 1`;
      if (toNum(l.unitCost) < 0) return `Unit cost for ${l.name} is invalid`;
    }
    return null;
  };

  const save = async (submit: boolean) => {
    const err = validate();
    if (err) return setError(err);
    setSaving(true);
    setError(null);
    try {
      if (isEdit && order) {
        const payload: UpdatePurchaseOrderPayload = {
          items: buildItems(),
          notes: notes.trim() || undefined,
          expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
        };
        await api.patch<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${order.id}`, payload);
      } else {
        const payload: CreatePurchaseOrderPayload = {
          supplierId,
          items: buildItems(),
          notes: notes.trim() || undefined,
          expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
          submit,
        };
        await api.post<ApiEnvelope<PurchaseOrder>>('/purchase-orders', payload);
      }
      onSaved();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save purchase order'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      wide
      title={isEdit ? `Edit ${order?.orderNumber}` : 'New purchase order'}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {isEdit ? (
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />} Save changes
            </button>
          ) : (
            <>
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />} Place order
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Supplier *"
            value={supplierId}
            onChange={setSupplierId}
            options={supplierOptions}
            placeholder="Select supplier"
            className={isEdit ? 'pointer-events-none opacity-60' : ''}
          />
          <label>
            <span className="mb-1 block text-xs font-medium text-content-secondary">
              Expected delivery
            </span>
            <input
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        {/* Line items */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
            Items
          </p>
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-hairline px-4 py-6 text-center text-sm text-content-muted">
              No items yet — search below to add products.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="hidden items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-content-muted sm:flex">
                <span className="flex-1">Product</span>
                <span className="w-20 text-center">Qty</span>
                <span className="w-28 text-center">Unit cost</span>
                <span className="w-20 text-center">Tax %</span>
                <span className="w-24 text-right">Line</span>
                <span className="w-6" />
              </div>
              {lines.map((l) => {
                const lineTotal = round2(
                  toNum(l.unitCost) *
                    Math.floor(toNum(l.quantity)) *
                    (1 + toNum(l.taxRate) / 100),
                );
                return (
                  <div
                    key={l.productId}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline p-2 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-content">{l.name}</p>
                      <p className="text-xs text-content-muted">{l.sku}</p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={l.quantity}
                      onChange={(e) => setLine(l.productId, { quantity: e.target.value })}
                      aria-label="Quantity"
                      className="w-20 rounded-lg border border-hairline bg-surface px-2 py-1.5 text-center text-sm text-content focus:border-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.unitCost}
                      onChange={(e) => setLine(l.productId, { unitCost: e.target.value })}
                      aria-label="Unit cost"
                      className="w-28 rounded-lg border border-hairline bg-surface px-2 py-1.5 text-center text-sm text-content focus:border-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.taxRate}
                      onChange={(e) => setLine(l.productId, { taxRate: e.target.value })}
                      aria-label="Tax rate"
                      className="w-20 rounded-lg border border-hairline bg-surface px-2 py-1.5 text-center text-sm text-content focus:border-primary focus:outline-none"
                    />
                    <span className="w-24 text-right text-sm font-semibold text-content">
                      {kes2(lineTotal)}
                    </span>
                    <button
                      onClick={() => removeLine(l.productId)}
                      className="rounded-full p-1 text-content-muted hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3">
            <ProductSearch
              excludeIds={lines.map((l) => l.productId)}
              onPick={addProduct}
            />
          </div>
        </div>

        <TextArea label="Notes" value={notes} onChange={setNotes} />

        {/* Totals */}
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-content-secondary">
            <span>Subtotal</span>
            <span className="font-medium text-content">{kes2(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-content-secondary">
            <span>Tax</span>
            <span className="font-medium text-content">{kes2(totals.tax)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-hairline pt-2 font-heading text-base font-bold text-content">
            <span>Total</span>
            <span>{kes2(totals.total)}</span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Product search (adds a line) ─────────────────────────────────────────────

function ProductSearch({
  excludeIds,
  onPick,
}: {
  excludeIds: string[];
  onPick: (p: Product) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      const q = new URLSearchParams({ pageSize: '20', sortBy: 'name', sortOrder: 'asc' });
      if (search.trim()) q.set('search', search.trim());
      getData<Product[]>(`/products?${q.toString()}`)
        .then((data) => active && setResults(data))
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, open]);

  const visible = results.filter((p) => !excludeIds.includes(p.id));

  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
      />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Add a product by name, SKU or barcode…"
        className="w-full rounded-lg border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-hairline bg-surface shadow-lg">
          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-content-muted">Searching…</div>
          ) : visible.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-content-muted">No products found.</div>
          ) : (
            <ul className="divide-y divide-hairline">
              {visible.map((p) => (
                <li key={p.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(p);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Package size={16} className="shrink-0 text-content-muted/60" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{p.name}</p>
                      <p className="text-xs text-content-muted">
                        {p.sku} · buy {kes2(p.buyingPrice ?? 0)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail modal (view + actions) ────────────────────────────────────────────

function PurchaseOrderDetailModal({
  id,
  canUpdate,
  canReceive,
  onClose,
  onEdit,
  onChanged,
}: {
  id: string;
  canUpdate: boolean;
  canReceive: boolean;
  onClose: () => void;
  onEdit: (po: PurchaseOrder) => void;
  onChanged: () => void;
}) {
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getData<PurchaseOrder>(`/purchase-orders/${id}`)
      .then((data) => active && setPo(data))
      .catch((err) => active && setError(apiErrorMessage(err, 'Could not load order')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, refreshKey]);

  const cancelOrder = async () => {
    if (!po || !window.confirm(`Cancel purchase order ${po.orderNumber}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${po.id}/cancel`, {});
      onChanged();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not cancel order'));
    } finally {
      setBusy(false);
    }
  };

  const isDraft = po?.status === 'DRAFT';
  const isEditable = isDraft && canUpdate;
  const isCancellable =
    po && canUpdate && (po.status === 'DRAFT' || po.status === 'ORDERED');
  const isReceivable =
    po &&
    canReceive &&
    po.status !== 'DRAFT' &&
    po.status !== 'RECEIVED' &&
    po.status !== 'CANCELLED';

  return (
    <ModalShell
      wide
      title={po ? po.orderNumber : 'Purchase order'}
      onClose={onClose}
      footer={
        po && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-content-muted">
              Created by {po.createdBy?.username ?? '—'} · {shortDateTime(po.createdAt)}
            </span>
            <div className="flex gap-2">
              {isCancellable && (
                <button
                  onClick={cancelOrder}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Ban size={15} /> Cancel order
                </button>
              )}
              {isEditable && (
                <button
                  onClick={() => onEdit(po)}
                  className="flex items-center gap-1.5 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50"
                >
                  <Pencil size={15} /> Edit
                </button>
              )}
              {isReceivable && (
                <button
                  onClick={() => setReceiving(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600"
                >
                  <PackageCheck size={16} /> Receive
                </button>
              )}
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-12 text-center text-content-muted">Loading order…</div>
      ) : error && !po ? (
        <div className="py-12 text-center text-red-600">{error}</div>
      ) : po ? (
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-content-muted">Supplier</p>
              <p className="font-medium text-content">{po.supplier?.name ?? '—'}</p>
            </div>
            <StatusBadge status={po.status} />
          </div>

          {po.expectedAt && (
            <p className="text-sm text-content-secondary">
              Expected delivery:{' '}
              <span className="font-medium text-content">{shortDateTime(po.expectedAt)}</span>
            </p>
          )}

          {/* Items table */}
          <div className="overflow-hidden rounded-lg border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5 text-right">Ordered</th>
                  <th className="px-4 py-2.5 text-right">Received</th>
                  <th className="px-4 py-2.5 text-right">Unit cost</th>
                  <th className="px-4 py-2.5 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {po.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-content">{i.product?.name ?? 'Product'}</p>
                      <p className="text-xs text-content-muted">{i.product?.sku}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-content-secondary">
                      {number(i.quantity)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-content-secondary">
                      {number(i.receivedQuantity)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-content-secondary">
                      {kes2(i.unitCost)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-content">
                      {kes2(i.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-content-secondary">
              <span>Subtotal</span>
              <span className="font-medium text-content">{kes2(po.subtotal)}</span>
            </div>
            <div className="flex justify-between text-content-secondary">
              <span>Tax</span>
              <span className="font-medium text-content">{kes2(po.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-hairline pt-1 font-heading text-base font-bold text-content">
              <span>Total</span>
              <span>{kes2(po.total)}</span>
            </div>
            <div className="flex justify-between text-content-secondary">
              <span>Paid</span>
              <span className="font-medium text-content">{kes2(po.amountPaid)}</span>
            </div>
          </div>

          {po.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                Notes
              </p>
              <p className="mt-1 text-sm text-content-secondary">{po.notes}</p>
            </div>
          )}
        </div>
      ) : null}

      {receiving && po && (
        <ReceiveModal
          order={po}
          onClose={() => setReceiving(false)}
          onReceived={() => {
            setReceiving(false);
            onChanged();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </ModalShell>
  );
}

// ── Receive modal ────────────────────────────────────────────────────────────

function ReceiveModal({
  order,
  onClose,
  onReceived,
}: {
  order: PurchaseOrder;
  onClose: () => void;
  onReceived: () => void;
}) {
  // Only lines with outstanding quantity can be received.
  const outstandingItems = order.items.filter((i) => i.quantity - i.receivedQuantity > 0);
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      outstandingItems.map((i) => [i.id, String(i.quantity - i.receivedQuantity)]),
    ),
  );
  const [amountPaid, setAmountPaid] = useState('');
  const [updateCostPrice, setUpdateCostPrice] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outstandingBalance = round2(toNum(order.total) - toNum(order.amountPaid));

  const submit = async () => {
    const items = outstandingItems
      .map((i) => ({ itemId: i.id, receivedQuantity: Math.floor(toNum(qty[i.id])) }))
      .filter((r) => r.receivedQuantity > 0);

    if (items.length === 0) return setError('Enter a quantity for at least one item');
    for (const i of outstandingItems) {
      const max = i.quantity - i.receivedQuantity;
      if (Math.floor(toNum(qty[i.id])) > max) {
        return setError(`Cannot receive more than ${max} of ${i.product?.name ?? 'an item'}`);
      }
    }

    const payload: ReceivePurchaseOrderPayload = {
      items,
      amountPaid: amountPaid ? round2(toNum(amountPaid)) : 0,
      updateCostPrice,
    };
    setSaving(true);
    setError(null);
    try {
      await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${order.id}/receive`, payload);
      onReceived();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not receive order'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Receive ${order.orderNumber}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}{' '}
            Confirm receipt
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <p className="text-sm text-content-muted">
          Enter the quantity received for each line. Stock levels update automatically.
        </p>

        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {outstandingItems.map((i) => {
            const max = i.quantity - i.receivedQuantity;
            return (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-content">
                    {i.product?.name ?? 'Product'}
                  </p>
                  <p className="text-xs text-content-muted">
                    {number(max)} outstanding of {number(i.quantity)}
                  </p>
                </div>
                <div className="flex items-center rounded-lg border border-hairline">
                  <button
                    onClick={() =>
                      setQty((q) => ({
                        ...q,
                        [i.id]: String(Math.max(0, Math.floor(toNum(q[i.id])) - 1)),
                      }))
                    }
                    className="px-2 py-1.5 text-content-secondary hover:text-content"
                    aria-label="Decrease"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={max}
                    value={qty[i.id] ?? ''}
                    onChange={(e) => setQty((q) => ({ ...q, [i.id]: e.target.value }))}
                    className="w-14 border-x border-hairline py-1.5 text-center text-sm text-content focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      setQty((q) => ({
                        ...q,
                        [i.id]: String(Math.min(max, Math.floor(toNum(q[i.id])) + 1)),
                      }))
                    }
                    className="px-2 py-1.5 text-content-secondary hover:text-content"
                    aria-label="Increase"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-content-secondary">
              Amount paid now
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={`Balance ${kes2(outstandingBalance)}`}
              className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex items-end pb-2">
            <span className="flex items-center gap-2 text-sm text-content-secondary">
              <input
                type="checkbox"
                checked={updateCostPrice}
                onChange={(e) => setUpdateCostPrice(e.target.checked)}
                className="h-4 w-4 rounded border-hairline text-primary focus:ring-primary/30"
              />
              Update product cost price
            </span>
          </label>
        </div>
      </div>
    </ModalShell>
  );
}
