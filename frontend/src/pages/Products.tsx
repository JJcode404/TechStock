import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  NumberField,
  SelectField,
  TextArea,
  TextField,
  type Option,
} from '../components/ui/Field';
import { api, getList, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes2, number } from '../lib/format';
import type { ApiEnvelope, Category, PaginationMeta, Product } from '../types';

const PERM_CREATE = 'product:create';

// ── Helpers ──────────────────────────────────────────────────────────────────

function primaryImage(p: Product): string | null {
  if (!p.images || p.images.length === 0) return null;
  return (p.images.find((i) => i.isPrimary) ?? p.images[0]).url;
}

type StockState = { label: string; tone: 'success' | 'warning' | 'danger' };

function stockState(p: Product): StockState {
  if ((p.currentStock ?? 0) <= 0) return { label: 'Out of stock', tone: 'danger' };
  if ((p.minStock ?? 0) > 0 && p.currentStock <= (p.minStock ?? 0))
    return { label: 'Low stock', tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}

type Filter = 'all' | 'active' | 'low' | 'out';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const PAGE_SIZE = 15;

// ── Page ─────────────────────────────────────────────────────────────────────

export function Products() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERM_CREATE);

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [creating, setCreating] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  // Category options for the filter dropdown.
  useEffect(() => {
    getList<Category>('/categories?pageSize=200&sortBy=name&sortOrder=asc')
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, filter, categoryId]);

  // Load products (debounced on search).
  useEffect(() => {
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
      if (categoryId) q.set('categoryId', categoryId);
      if (filter === 'active') q.set('isActive', 'true');
      if (filter === 'low') q.set('lowStock', 'true');
      if (filter === 'out') q.set('outOfStock', 'true');

      getList<Product>(`/products?${q.toString()}`)
        .then(({ data, meta: m }) => {
          if (!active) return;
          setProducts(data);
          setMeta((m as PaginationMeta) ?? null);
        })
        .catch((err) => active && setError(apiErrorMessage(err, 'Could not load products')))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, filter, categoryId, page, refreshKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Products</h1>
          <p className="text-sm text-content-muted">
            {meta ? `${number(meta.total)} products in catalogue` : 'Browse the product catalogue'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
          >
            <Plus size={16} /> New product
          </button>
        )}
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
              placeholder="Search by name, SKU or barcode…"
              className="w-full rounded-full border border-hairline bg-surface py-2.5 pl-11 pr-4 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm text-content-secondary focus:border-primary focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-full border border-hairline p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.value
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
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Price</th>
                <th className="px-6 py-3 text-right">Stock</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-content-muted">
                    Loading products…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-content-muted">
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const img = primaryImage(p);
                  const st = stockState(p);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/products/${p.id}`)}
                      className="cursor-pointer hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {img ? (
                              <img src={img} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package size={18} className="text-content-muted/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-content">{p.name}</p>
                            <p className="text-xs text-content-muted">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-content-secondary">
                        {p.category?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-content">
                        {kes2(p.sellingPrice)}
                      </td>
                      <td className="px-6 py-3 text-right text-content-secondary">
                        {number(p.currentStock)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {!p.isActive && <Badge tone="neutral">Inactive</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-xs font-medium text-primary-700 hover:text-primary-800">
                          View
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

      {creating && (
        <CreateProductModal
          categories={categories}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setRefreshKey((k) => k + 1);
            navigate(`/products/${id}`);
          }}
        />
      )}
    </div>
  );
}

// ── Create modal ─────────────────────────────────────────────────────────────

interface CreateForm {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  brand: string;
  location: string;
  buyingPrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  dealerPrice: string;
  taxRate: string;
  currentStock: string;
  minStock: string;
  maxStock: string;
  categoryId: string;
  supplierId: string;
  isActive: boolean;
}

const EMPTY_FORM: CreateForm = {
  name: '',
  description: '',
  sku: '',
  barcode: '',
  brand: '',
  location: '',
  buyingPrice: '',
  sellingPrice: '',
  wholesalePrice: '',
  dealerPrice: '',
  taxRate: '16',
  currentStock: '0',
  minStock: '0',
  maxStock: '0',
  categoryId: '',
  supplierId: '',
  isActive: true,
};

function CreateProductModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getList<Option>('/suppliers?pageSize=200&sortBy=name&sortOrder=asc')
      .then(({ data }) => setSuppliers(data))
      .catch(() => setSuppliers([]));
  }, []);

  const set = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) return setError('Product name is required');
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0)
      return setError('A selling price is required');

    // Build a clean payload — omit empty optional fields so validation passes.
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      sellingPrice: Number(form.sellingPrice),
      buyingPrice: Number(form.buyingPrice || 0),
      wholesalePrice: Number(form.wholesalePrice || 0),
      dealerPrice: Number(form.dealerPrice || 0),
      taxRate: Number(form.taxRate || 0),
      currentStock: Math.floor(Number(form.currentStock || 0)),
      minStock: Math.floor(Number(form.minStock || 0)),
      maxStock: Math.floor(Number(form.maxStock || 0)),
      isActive: form.isActive,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.sku.trim()) payload.sku = form.sku.trim();
    if (form.barcode.trim()) payload.barcode = form.barcode.trim();
    if (form.brand.trim()) payload.brand = form.brand.trim();
    if (form.location.trim()) payload.location = form.location.trim();
    if (form.categoryId) payload.categoryId = form.categoryId;
    if (form.supplierId) payload.supplierId = form.supplierId;

    setSaving(true);
    setError(null);
    try {
      const res = await api.post<ApiEnvelope<Product>>('/products', payload);
      onCreated(res.data.data.id);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create product'));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <Card
        className="my-8 w-full max-w-2xl p-0"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-heading text-base font-semibold text-content">New product</h2>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Name *"
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
            <TextField
              label="SKU (auto if blank)"
              value={form.sku}
              onChange={(v) => set('sku', v)}
            />
            <TextField
              label="Barcode"
              value={form.barcode}
              onChange={(v) => set('barcode', v)}
            />
            <TextField
              label="Location"
              value={form.location}
              onChange={(v) => set('location', v)}
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
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Pricing
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumberField
                label="Selling (KES) *"
                value={form.sellingPrice}
                onChange={(v) => set('sellingPrice', v)}
              />
              <NumberField
                label="Buying (KES)"
                value={form.buyingPrice}
                onChange={(v) => set('buyingPrice', v)}
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
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Stock
            </p>
            <div className="grid grid-cols-3 gap-4">
              <NumberField
                label="Opening stock"
                value={form.currentStock}
                onChange={(v) => set('currentStock', v)}
              />
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
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-content-secondary">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-hairline text-primary focus:ring-primary/30"
            />
            Active (available for sale)
          </label>
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
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create
            product
          </button>
        </div>
      </Card>
    </div>
  );
}
