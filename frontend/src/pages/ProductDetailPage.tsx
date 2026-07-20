import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Save,
  X,
  Package,
  Lock,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { NumberField, SelectField, TextArea, TextField, type Option } from '../components/ui/Field';
import { api, getData, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes2, number, shortDateTime } from '../lib/format';
import type { ApiEnvelope, Category, Product } from '../types';

const PERMS = { UPDATE: 'product:update', DELETE: 'product:delete' } as const;

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function primaryImage(p: Product): string | null {
  if (!p.images || p.images.length === 0) return null;
  return (p.images.find((i) => i.isPrimary) ?? p.images[0]).url;
}

function stockState(p: Product): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if ((p.currentStock ?? 0) <= 0) return { label: 'Out of stock', tone: 'danger' };
  if ((p.minStock ?? 0) > 0 && p.currentStock <= (p.minStock ?? 0))
    return { label: 'Low stock', tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}

// ── Editable form state ──────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  serialNumber: string;
  brand: string;
  location: string;
  buyingPrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  dealerPrice: string;
  taxRate: string;
  minStock: string;
  maxStock: string;
  isActive: boolean;
  categoryId: string;
  supplierId: string;
}

function toForm(p: Product): FormState {
  return {
    name: p.name ?? '',
    description: p.description ?? '',
    sku: p.sku ?? '',
    barcode: p.barcode ?? '',
    serialNumber: p.serialNumber ?? '',
    brand: p.brand ?? '',
    location: p.location ?? '',
    buyingPrice: String(toNum(p.buyingPrice)),
    sellingPrice: String(toNum(p.sellingPrice)),
    wholesalePrice: String(toNum(p.wholesalePrice)),
    dealerPrice: String(toNum(p.dealerPrice)),
    taxRate: String(toNum(p.taxRate)),
    minStock: String(p.minStock ?? 0),
    maxStock: String(p.maxStock ?? 0),
    isActive: p.isActive,
    categoryId: p.category?.id ?? '',
    supplierId: p.supplier?.id ?? '',
  };
}

/** Only send fields that actually changed (and are valid to send). */
function buildPayload(f: FormState, p: Product): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const strFields: [keyof FormState, string][] = [
    ['name', p.name ?? ''],
    ['description', p.description ?? ''],
    ['sku', p.sku ?? ''],
    ['barcode', p.barcode ?? ''],
    ['serialNumber', p.serialNumber ?? ''],
    ['brand', p.brand ?? ''],
    ['location', p.location ?? ''],
  ];
  for (const [key, orig] of strFields) {
    const val = (f[key] as string).trim();
    if (val !== orig && val !== '') out[key] = val;
  }
  const numFields: [keyof FormState, number][] = [
    ['buyingPrice', toNum(p.buyingPrice)],
    ['sellingPrice', toNum(p.sellingPrice)],
    ['wholesalePrice', toNum(p.wholesalePrice)],
    ['dealerPrice', toNum(p.dealerPrice)],
    ['taxRate', toNum(p.taxRate)],
    ['minStock', p.minStock ?? 0],
    ['maxStock', p.maxStock ?? 0],
  ];
  for (const [key, orig] of numFields) {
    const val = Number(f[key]);
    if (Number.isFinite(val) && val !== orig) out[key] = val;
  }
  if (f.isActive !== p.isActive) out.isActive = f.isActive;
  if (f.categoryId && f.categoryId !== (p.category?.id ?? '')) out.categoryId = f.categoryId;
  if (f.supplierId && f.supplierId !== (p.supplier?.id ?? '')) out.supplierId = f.supplierId;
  return out;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(PERMS.UPDATE);
  const canDelete = hasPermission(PERMS.DELETE);

  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    getData<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((err) => setLoadError(apiErrorMessage(err, 'Could not load product')));
  };
  useEffect(load, [id]);

  const margin = useMemo(() => {
    if (!product) return null;
    const sell = toNum(product.sellingPrice);
    if (sell <= 0) return null;
    return Math.round(((sell - toNum(product.buyingPrice)) / sell) * 100);
  }, [product]);

  const startEdit = async () => {
    if (!product) return;
    setForm(toForm(product));
    setEditing(true);
    setSaveError(null);
    // Load option lists for the dropdowns (managers/admins can read both).
    if (categories.length === 0) {
      getList<Category>('/categories?pageSize=200&sortBy=name&sortOrder=asc')
        .then(({ data }) => setCategories(data))
        .catch(() => setCategories([]));
    }
    if (suppliers.length === 0) {
      getList<Option>('/suppliers?pageSize=200&sortBy=name&sortOrder=asc')
        .then(({ data }) => setSuppliers(data))
        .catch(() => setSuppliers([])); // non-fatal: field stays as-is
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSaveError(null);
  };

  const save = async () => {
    if (!form || !product) return;
    const payload = buildPayload(form, product);
    if (Object.keys(payload).length === 0) {
      cancelEdit();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.patch<ApiEnvelope<Product>>(`/products/${id}`, payload);
      setProduct(res.data.data);
      setEditing(false);
      setForm(null);
      setNotice('Changes saved');
      setTimeout(() => setNotice(null), 2500);
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Could not save changes'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!product) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone from here.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      navigate('/products');
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Could not delete product'));
      setDeleting(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  if (loadError) {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => navigate('/products')} />
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => navigate('/products')} />
        <div className="py-20 text-center text-content-muted">Loading product…</div>
      </div>
    );
  }

  const st = stockState(product);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={() => navigate('/products')} />
        <div className="flex items-center gap-2">
          {notice && (
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              {notice}
            </span>
          )}
          <Badge tone="info">
            <ShieldCheck size={12} /> {user?.role ?? 'USER'}
          </Badge>
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-content-secondary hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </>
          ) : (
            <>
              {canDelete && (
                <button
                  onClick={remove}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>
              )}
              {canEdit ? (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600"
                >
                  <Pencil size={16} /> Edit product
                </button>
              ) : (
                <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-content-muted">
                  <Lock size={15} /> Read-only
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Basic info */}
          <Card className="p-6">
            <SectionTitle>Basic information</SectionTitle>
            {editing && form ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(v) => set('name', v)}
                  className="sm:col-span-2"
                />
                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={(v) => set('description', v)}
                  className="sm:col-span-2"
                />
                <TextField label="Brand" value={form.brand} onChange={(v) => set('brand', v)} />
                <TextField label="SKU" value={form.sku} onChange={(v) => set('sku', v)} />
                <TextField
                  label="Barcode"
                  value={form.barcode}
                  onChange={(v) => set('barcode', v)}
                />
                <TextField
                  label="Serial number"
                  value={form.serialNumber}
                  onChange={(v) => set('serialNumber', v)}
                />
                <SelectField
                  label="Category"
                  value={form.categoryId}
                  onChange={(v) => set('categoryId', v)}
                  options={categories}
                  placeholder="Select category"
                />
                <SelectField
                  label="Supplier"
                  value={form.supplierId}
                  onChange={(v) => set('supplierId', v)}
                  options={suppliers}
                  placeholder="Select supplier"
                />
                <TextField
                  label="Location"
                  value={form.location}
                  onChange={(v) => set('location', v)}
                />
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-content-secondary">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-hairline text-primary focus:ring-primary/30"
                  />
                  Active (available for sale)
                </label>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <ViewField label="Name" value={product.name} className="sm:col-span-2" />
                {product.description && (
                  <ViewField
                    label="Description"
                    value={product.description}
                    className="sm:col-span-2"
                  />
                )}
                <ViewField label="Brand" value={product.brand ?? '—'} />
                <ViewField label="SKU" value={product.sku} />
                <ViewField label="Barcode" value={product.barcode ?? '—'} />
                <ViewField label="Serial number" value={product.serialNumber ?? '—'} />
                <ViewField label="Category" value={product.category?.name ?? '—'} />
                <ViewField label="Supplier" value={product.supplier?.name ?? '—'} />
                <ViewField label="Location" value={product.location ?? '—'} />
              </dl>
            )}
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <SectionTitle>Pricing</SectionTitle>
            {editing && form ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <NumberField
                  label="Buying (KES)"
                  value={form.buyingPrice}
                  onChange={(v) => set('buyingPrice', v)}
                />
                <NumberField
                  label="Selling (KES)"
                  value={form.sellingPrice}
                  onChange={(v) => set('sellingPrice', v)}
                />
                <NumberField
                  label="Tax rate (%)"
                  value={form.taxRate}
                  onChange={(v) => set('taxRate', v)}
                />
                <NumberField
                  label="Wholesale (KES)"
                  value={form.wholesalePrice}
                  onChange={(v) => set('wholesalePrice', v)}
                />
                <NumberField
                  label="Dealer (KES)"
                  value={form.dealerPrice}
                  onChange={(v) => set('dealerPrice', v)}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PriceTile label="Selling" value={kes2(product.sellingPrice)} highlight />
                  <PriceTile label="Buying" value={kes2(product.buyingPrice ?? 0)} />
                  <PriceTile label="Wholesale" value={kes2(product.wholesalePrice)} />
                  <PriceTile label="Dealer" value={kes2(product.dealerPrice)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm">
                    <span className="text-content-secondary">Tax</span>
                    <span className="font-medium text-content">{number(product.taxRate)}%</span>
                  </div>
                  {margin !== null && (
                    <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm">
                      <span className="text-primary-700">Gross margin</span>
                      <span className="font-semibold text-primary-700">{margin}%</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Inventory */}
          <Card className="p-6">
            <SectionTitle>Inventory</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-hairline bg-surface px-3 py-2.5">
                <p className="text-xs text-content-muted">In stock</p>
                <p className="mt-0.5 font-heading text-sm font-bold text-content">
                  {number(product.currentStock)}
                </p>
              </div>
              {editing && form ? (
                <>
                  <NumberField
                    label="Min stock"
                    value={form.minStock}
                    onChange={(v) => set('minStock', v)}
                  />
                  <NumberField
                    label="Max stock"
                    value={form.maxStock}
                    onChange={(v) => set('maxStock', v)}
                  />
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-hairline bg-surface px-3 py-2.5">
                    <p className="text-xs text-content-muted">Min stock</p>
                    <p className="mt-0.5 font-heading text-sm font-bold text-content">
                      {number(product.minStock ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-hairline bg-surface px-3 py-2.5">
                    <p className="text-xs text-content-muted">Max stock</p>
                    <p className="mt-0.5 font-heading text-sm font-bold text-content">
                      {number(product.maxStock ?? 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
            {editing && (
              <p className="mt-3 text-xs text-content-muted">
                Current stock isn’t edited here — it changes through inventory movements
                (purchases, sales, adjustments).
              </p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {primaryImage(product) ? (
                <img
                  src={primaryImage(product)!}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package size={40} className="text-content-muted/40" />
              )}
            </div>
            <h1 className="mt-4 font-heading text-lg font-bold text-content">{product.name}</h1>
            {product.brand && <p className="text-sm text-content-secondary">{product.brand}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={st.tone}>{st.label}</Badge>
              <Badge tone={product.isActive ? 'success' : 'neutral'}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle>Record</SectionTitle>
            <dl className="space-y-2 text-sm">
              <ViewField label="SKU" value={product.sku} />
              {product.createdAt && (
                <ViewField label="Created" value={shortDateTime(product.createdAt)} />
              )}
              {product.updatedAt && (
                <ViewField label="Last updated" value={shortDateTime(product.updatedAt)} />
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Small building blocks ────────────────────────────────────────────────────

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-medium text-content-secondary hover:text-content"
    >
      <ArrowLeft size={16} /> Back to products
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-content-secondary">
      {children}
    </h3>
  );
}

function ViewField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-content">{value}</dd>
    </div>
  );
}

function PriceTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        highlight ? 'border-primary/30 bg-primary-50' : 'border-hairline bg-surface'
      }`}
    >
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={`mt-0.5 font-heading text-sm font-bold ${
          highlight ? 'text-primary-700' : 'text-content'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

