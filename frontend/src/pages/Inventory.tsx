import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Coins,
  AlertTriangle,
  PackageX,
  SlidersHorizontal,
  Search,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { NumberField, SelectField, TextArea } from '../components/ui/Field';
import { api, getData, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kesCompact, number, shortDateTime } from '../lib/format';
import type {
  AdjustmentReason,
  ApiEnvelope,
  InventoryAdjustment,
  MovementType,
  PaginationMeta,
  Product,
  StockMovement,
  StockValue,
} from '../types';

const PERM_ADJUST = 'inventory:adjust';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOVEMENT_TYPES: MovementType[] = [
  'SALE',
  'PURCHASE',
  'RETURN',
  'DAMAGE',
  'ADJUSTMENT',
  'TRANSFER',
];

function movementTone(t: MovementType): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
  switch (t) {
    case 'PURCHASE':
    case 'RETURN':
      return 'success';
    case 'SALE':
      return 'danger';
    case 'DAMAGE':
      return 'warning';
    case 'ADJUSTMENT':
      return 'info';
    default:
      return 'neutral';
  }
}

const ADJUSTMENT_REASONS: { value: AdjustmentReason; label: string }[] = [
  { value: 'STOCK_COUNT', label: 'Stock count' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'THEFT', label: 'Theft' },
  { value: 'EXPIRY', label: 'Expiry' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'OTHER', label: 'Other' },
];

const reasonLabel = (r: string) =>
  ADJUSTMENT_REASONS.find((x) => x.value === r)?.label ?? r;

type Tab = 'alerts' | 'movements' | 'adjustments';

// ── Page ─────────────────────────────────────────────────────────────────────

export function Inventory() {
  const { hasPermission } = useAuth();
  const canAdjust = hasPermission(PERM_ADJUST);

  const [tab, setTab] = useState<Tab>('alerts');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const [stockValue, setStockValue] = useState<StockValue | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [outOfStock, setOutOfStock] = useState<Product[]>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [adjustFor, setAdjustFor] = useState<Product | 'search' | null>(null);

  // KPI + alert data.
  useEffect(() => {
    setSummaryError(null);
    Promise.all([
      getData<StockValue>('/inventory/stock-value'),
      getData<Product[]>('/products/low-stock'),
      getData<Product[]>('/products/out-of-stock'),
    ])
      .then(([sv, low, out]) => {
        setStockValue(sv);
        setLowStock(low);
        setOutOfStock(out);
      })
      .catch((err) => setSummaryError(apiErrorMessage(err, 'Could not load inventory summary')));
  }, [refreshKey]);

  const alerts = useMemo(() => {
    // out-of-stock first, then low-stock (dedupe by id).
    const seen = new Set(outOfStock.map((p) => p.id));
    return [...outOfStock, ...lowStock.filter((p) => !seen.has(p.id))];
  }, [lowStock, outOfStock]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Inventory</h1>
          <p className="text-sm text-content-muted">Stock levels, movements &amp; adjustments</p>
        </div>
        {canAdjust && (
          <button
            onClick={() => setAdjustFor('search')}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
          >
            <SlidersHorizontal size={16} /> Adjust stock
          </button>
        )}
      </div>

      {summaryError && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{summaryError}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stock Value (retail)"
          value={stockValue ? kesCompact(stockValue.retailValue) : '—'}
          caption={stockValue ? `${number(stockValue.totalUnits)} units in stock` : ''}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Stock Value (cost)"
          value={stockValue ? kesCompact(stockValue.costValue) : '—'}
          caption="Capital tied in inventory"
          icon={Coins}
          tone="blue"
        />
        <StatCard
          label="Low Stock"
          value={number(lowStock.length)}
          caption="At or below minimum"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Out of Stock"
          value={number(outOfStock.length)}
          caption="Needs reordering"
          icon={PackageX}
          tone="pink"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-full border border-hairline bg-surface p-1 w-fit">
        {(
          [
            ['alerts', 'Stock alerts'],
            ['movements', 'Movements'],
            ['adjustments', 'Adjustments'],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === value ? 'bg-ink-900 text-white' : 'text-content-secondary hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <AlertsTab alerts={alerts} canAdjust={canAdjust} onAdjust={(p) => setAdjustFor(p)} />
      )}
      {tab === 'movements' && <MovementsTab refreshKey={refreshKey} />}
      {tab === 'adjustments' && <AdjustmentsTab refreshKey={refreshKey} />}

      {adjustFor && (
        <AdjustModal
          initial={adjustFor === 'search' ? null : adjustFor}
          onClose={() => setAdjustFor(null)}
          onDone={() => {
            setAdjustFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Alerts tab ───────────────────────────────────────────────────────────────

function AlertsTab({
  alerts,
  canAdjust,
  onAdjust,
}: {
  alerts: Product[];
  canAdjust: boolean;
  onAdjust: (p: Product) => void;
}) {
  const navigate = useNavigate();
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader title="Items needing attention" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3 text-right">In stock</th>
              <th className="px-6 py-3 text-right">Min</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-content-muted">
                  🎉 All products are above their minimum stock levels.
                </td>
              </tr>
            ) : (
              alerts.map((p) => {
                const out = (p.currentStock ?? 0) <= 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <button
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="text-left"
                      >
                        <p className="font-medium text-content hover:text-primary-700">{p.name}</p>
                        <p className="text-xs text-content-muted">{p.sku}</p>
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-content">
                      {number(p.currentStock)}
                    </td>
                    <td className="px-6 py-3 text-right text-content-secondary">
                      {number(p.minStock ?? 0)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone={out ? 'danger' : 'warning'}>
                        {out ? 'Out of stock' : 'Low stock'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {canAdjust && (
                        <button
                          onClick={() => onAdjust(p)}
                          className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-slate-50"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Movements tab ────────────────────────────────────────────────────────────

function MovementsTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<MovementType | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [type]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), pageSize: '15' });
    if (type) q.set('type', type);
    getList<StockMovement>(`/inventory/movements?${q.toString()}`)
      .then(({ data, meta: m }) => {
        if (!active) return;
        setRows(data);
        setMeta((m as PaginationMeta) ?? null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [type, page, refreshKey]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 pt-5">
        <h3 className="font-heading text-base font-semibold text-content">Stock movement ledger</h3>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MovementType | '')}
          className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm text-content-secondary focus:border-primary focus:outline-none"
        >
          <option value="">All types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Change</th>
              <th className="px-6 py-3 text-right">Balance</th>
              <th className="px-6 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-content-muted">
                  Loading movements…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-content-muted">
                  No stock movements found.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-content-muted">{shortDateTime(m.createdAt)}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-content">{m.product?.name ?? '—'}</p>
                    <p className="text-xs text-content-muted">{m.product?.sku ?? ''}</p>
                  </td>
                  <td className="px-6 py-3">
                    <Badge tone={movementTone(m.type)}>{m.type}</Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <SignedQty value={m.quantity} />
                  </td>
                  <td className="px-6 py-3 text-right text-content-secondary">
                    {number(m.stockAfter)}
                  </td>
                  <td className="px-6 py-3 max-w-xs truncate text-content-muted">
                    {m.reason ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </Card>
  );
}

// ── Adjustments tab ──────────────────────────────────────────────────────────

function AdjustmentsTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<InventoryAdjustment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getList<InventoryAdjustment>(`/inventory/adjustments?page=${page}&pageSize=15`)
      .then(({ data, meta: m }) => {
        if (!active) return;
        setRows(data);
        setMeta((m as PaginationMeta) ?? null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, refreshKey]);

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader title="Adjustment history" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Reference</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3 text-right">Before</th>
              <th className="px-6 py-3 text-right">After</th>
              <th className="px-6 py-3 text-right">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-content-muted">
                  Loading adjustments…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-content-muted">
                  No adjustments recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-content-muted">{shortDateTime(a.createdAt)}</td>
                  <td className="px-6 py-3 font-medium text-content">{a.reference}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-content">{a.product?.name ?? '—'}</p>
                    <p className="text-xs text-content-muted">{a.product?.sku ?? ''}</p>
                  </td>
                  <td className="px-6 py-3">
                    <Badge tone="neutral">{reasonLabel(a.reason)}</Badge>
                  </td>
                  <td className="px-6 py-3 text-right text-content-secondary">
                    {number(a.quantityBefore)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-content">
                    {number(a.quantityAfter)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <SignedQty value={a.delta} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </Card>
  );
}

// ── Adjust modal ─────────────────────────────────────────────────────────────

function AdjustModal({
  initial,
  onClose,
  onDone,
}: {
  initial: Product | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(initial);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [newQty, setNewQty] = useState(initial ? String(initial.currentStock ?? 0) : '');
  const [reason, setReason] = useState<AdjustmentReason>('STOCK_COUNT');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product search (only when none is preselected).
  useEffect(() => {
    if (product || !search.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      getData<Product[]>(`/products?pageSize=8&isActive=true&search=${encodeURIComponent(search.trim())}`)
        .then((d) => active && setResults(d))
        .catch(() => active && setResults([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, product]);

  const delta = useMemo(() => {
    if (!product || newQty === '') return null;
    return Math.floor(Number(newQty)) - (product.currentStock ?? 0);
  }, [product, newQty]);

  const submit = async () => {
    if (!product) return setError('Select a product first');
    if (newQty === '' || Number(newQty) < 0) return setError('Enter a valid new quantity');
    setSaving(true);
    setError(null);
    try {
      await api.post<ApiEnvelope<InventoryAdjustment>>('/inventory/adjustments', {
        productId: product.id,
        newQuantity: Math.floor(Number(newQty)),
        reason,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not adjust stock'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 pt-20">
      <Card className="w-full max-w-md p-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-heading text-base font-semibold text-content">Adjust stock</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-content-muted hover:bg-slate-100 hover:text-content"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          {/* Product selection */}
          {product ? (
            <div className="flex items-center justify-between rounded-xl border border-hairline px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-content">{product.name}</p>
                <p className="text-xs text-content-muted">
                  {product.sku} · currently {number(product.currentStock)} in stock
                </p>
              </div>
              {!initial && (
                <button
                  onClick={() => {
                    setProduct(null);
                    setNewQty('');
                  }}
                  className="rounded-full p-1 text-content-muted hover:bg-slate-100"
                  aria-label="Change product"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
                />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product by name or SKU…"
                  className="w-full rounded-lg border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none"
                />
              </div>
              {results.length > 0 && (
                <ul className="mt-2 max-h-56 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setProduct(p);
                          setNewQty(String(p.currentStock ?? 0));
                          setSearch('');
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-content">
                            {p.name}
                          </span>
                          <span className="text-xs text-content-muted">{p.sku}</span>
                        </span>
                        <span className="text-xs text-content-secondary">
                          {number(p.currentStock)} in stock
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {product && (
            <>
              <NumberField label="New quantity" value={newQty} onChange={setNewQty} />
              {delta !== null && delta !== 0 && (
                <div
                  className={`flex items-center justify-between rounded-lg px-4 py-2 text-sm ${
                    delta > 0 ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <span>Change</span>
                  <span className="font-semibold">
                    {delta > 0 ? '+' : ''}
                    {number(delta)} units
                  </span>
                </div>
              )}
              <SelectField
                label="Reason"
                value={reason}
                onChange={(v) => setReason(v as AdjustmentReason)}
                options={ADJUSTMENT_REASONS.map((r) => ({ id: r.value, name: r.label }))}
                placeholder="Select reason"
              />
              <TextArea label="Notes (optional)" value={notes} onChange={setNotes} />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !product}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
            Save adjustment
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function SignedQty({ value }: { value: number }) {
  if (value === 0) return <span className="font-medium text-content-muted">0</span>;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold ${
        up ? 'text-primary-700' : 'text-red-600'
      }`}
    >
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {up ? '+' : ''}
      {number(value)}
    </span>
  );
}

function Pager({ meta, onPage }: { meta: PaginationMeta | null; onPage: (fn: (p: number) => number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-hairline px-6 py-3 text-sm">
      <span className="text-content-muted">
        Page {meta.page} of {meta.totalPages} · {number(meta.total)} records
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPage((p) => Math.max(1, p - 1))}
          disabled={!meta.hasPrev}
          className="flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-content-secondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          onClick={() => onPage((p) => p + 1)}
          disabled={!meta.hasNext}
          className="flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-content-secondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
