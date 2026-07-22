import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  UserPlus,
  X,
  CheckCircle2,
  Printer,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { api, getData, apiErrorMessage, assetUrl } from '../lib/api';
import { kes2, number } from '../lib/format';
import type {
  ApiEnvelope,
  CreateSalePayload,
  Customer,
  PaymentMethod,
  PriceTier,
  Product,
  SaleResult,
} from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const PRICE_TIERS: { value: PriceTier; label: string }[] = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'DEALER', label: 'Dealer' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'OTHER', label: 'Other' },
];

function tierPrice(p: Product, tier: PriceTier): number {
  if (tier === 'WHOLESALE') return toNum(p.wholesalePrice);
  if (tier === 'DEALER') return toNum(p.dealerPrice);
  return toNum(p.sellingPrice);
}

function primaryImage(p: Product): string | null {
  if (!p.images || p.images.length === 0) return null;
  return assetUrl((p.images.find((i) => i.isPrimary) ?? p.images[0]).url);
}

interface CartLine {
  product: Product;
  quantity: number;
  tier: PriceTier;
  discount: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Pos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleResult | null>(null);

  // Debounced product search against the backend.
  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    const t = setTimeout(() => {
      const q = new URLSearchParams({ pageSize: '60', isActive: 'true', sortBy: 'name', sortOrder: 'asc' });
      if (search.trim()) q.set('search', search.trim());
      getData<Product[]>(`/products?${q.toString()}`)
        .then((data) => {
          if (active) setProducts(data);
        })
        .catch((err) => {
          if (active) setError(apiErrorMessage(err, 'Could not load products'));
        })
        .finally(() => {
          if (active) setLoadingProducts(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);

  // ── Cart operations ──
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { product, quantity: 1, tier: 'RETAIL', discount: 0 }];
    });
  }, []);

  const setQty = (id: string, quantity: number) =>
    setCart((prev) =>
      prev.flatMap((l) =>
        l.product.id === id ? (quantity <= 0 ? [] : [{ ...l, quantity }]) : [l],
      ),
    );

  const setTier = (id: string, tier: PriceTier) =>
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, tier } : l)));

  const setDiscount = (id: string, discount: number) =>
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, discount: Math.max(0, discount) } : l)),
    );

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.product.id !== id));

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setPaymentMethod('CASH');
    setAmountInput('');
    setPaymentRef('');
    setError(null);
  };

  // ── Totals (mirrors backend math; server remains authoritative) ──
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let discountTotal = 0;
    for (const l of cart) {
      const unit = tierPrice(l.product, l.tier);
      const gross = round2(unit * l.quantity);
      const disc = Math.min(round2(l.discount), gross);
      const net = round2(gross - disc);
      const lineTax = round2((net * toNum(l.product.taxRate)) / 100);
      subtotal += net;
      tax += lineTax;
      discountTotal += disc;
    }
    subtotal = round2(subtotal);
    tax = round2(tax);
    const total = round2(subtotal + tax);
    return { subtotal, tax, discountTotal: round2(discountTotal), total };
  }, [cart]);

  const isCredit = paymentMethod === 'CREDIT';
  const amountPaid = isCredit ? 0 : amountInput === '' ? totals.total : round2(toNum(amountInput));
  const changeDue = !isCredit && amountPaid > totals.total ? round2(amountPaid - totals.total) : 0;
  const balanceDue = round2(Math.max(0, totals.total - amountPaid));
  const requiresCustomer = balanceDue > 0; // credit/partial sales need a customer

  const canCheckout = cart.length > 0 && !submitting && (!requiresCustomer || !!customer);

  const checkout = async () => {
    if (!canCheckout) return;
    setSubmitting(true);
    setError(null);
    const payload: CreateSalePayload = {
      customerId: customer?.id,
      items: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        priceTier: l.tier,
        discount: round2(l.discount),
      })),
      payments:
        amountPaid > 0 || isCredit
          ? [
              {
                method: paymentMethod,
                amount: isCredit ? totals.total : amountPaid,
                reference: paymentRef.trim() || undefined,
              },
            ]
          : [],
    };
    try {
      const res = await api.post<ApiEnvelope<SaleResult>>('/sales', payload);
      setReceipt(res.data.data);
      clearCart();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not complete the sale'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Point of Sale</h1>
          <p className="text-sm text-content-muted">Ring up a sale and take payment</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Product catalogue */}
        <div className="flex min-h-0 flex-col">
          <div className="relative mb-4">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU or barcode…"
              className="w-full rounded-full border border-hairline bg-surface py-2.5 pl-11 pr-4 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loadingProducts ? (
              <div className="py-16 text-center text-content-muted">Loading products…</div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-content-muted">No products found.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductTile key={p.id} product={p} onAdd={() => addToCart(p)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart / checkout */}
        <Card className="flex min-h-0 flex-col p-0">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary-600" />
              <h2 className="font-heading text-base font-semibold text-content">Current Sale</h2>
              {cart.length > 0 && (
                <Badge tone="success">{number(cart.reduce((a, l) => a + l.quantity, 0))}</Badge>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-medium text-content-muted hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Customer */}
          <div className="border-b border-hairline px-5 py-3">
            {customer ? (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-content">{customer.name}</p>
                  <p className="text-xs text-content-muted">
                    {customer.phone ?? 'No phone'} · {number(customer.loyaltyPoints)} pts
                  </p>
                </div>
                <button
                  onClick={() => setCustomer(null)}
                  className="rounded-full p-1 text-content-muted hover:bg-slate-100 hover:text-content"
                  aria-label="Remove customer"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCustomerOpen(true)}
                className="flex w-full items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                <UserPlus size={16} /> Add customer (walk-in)
              </button>
            )}
          </div>

          {/* Line items */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <ShoppingCart size={28} className="text-content-muted/50" />
                <p className="text-sm text-content-muted">
                  Cart is empty. Tap a product to add it.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {cart.map((l) => {
                  const unit = tierPrice(l.product, l.tier);
                  const lineNet = Math.max(0, round2(unit * l.quantity - l.discount));
                  return (
                    <li key={l.product.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-content">
                            {l.product.name}
                          </p>
                          <p className="text-xs text-content-muted">
                            {kes2(unit)} · {l.product.sku}
                          </p>
                        </div>
                        <button
                          onClick={() => removeLine(l.product.id)}
                          className="shrink-0 rounded-full p-1 text-content-muted hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg border border-hairline">
                          <button
                            onClick={() => setQty(l.product.id, l.quantity - 1)}
                            className="px-2 py-1 text-content-secondary hover:text-content"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            value={l.quantity}
                            onChange={(e) =>
                              setQty(l.product.id, Math.max(0, Math.floor(toNum(e.target.value))))
                            }
                            className="w-10 border-x border-hairline py-1 text-center text-sm text-content focus:outline-none"
                          />
                          <button
                            onClick={() => setQty(l.product.id, l.quantity + 1)}
                            className="px-2 py-1 text-content-secondary hover:text-content"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <select
                          value={l.tier}
                          onChange={(e) => setTier(l.product.id, e.target.value as PriceTier)}
                          className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-content-secondary focus:border-primary focus:outline-none"
                        >
                          {PRICE_TIERS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>

                        <span className="ml-auto text-sm font-semibold text-content">
                          {kes2(lineNet)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-content-muted">Discount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.discount || ''}
                          onChange={(e) => setDiscount(l.product.id, round2(toNum(e.target.value)))}
                          placeholder="0.00"
                          className="w-24 rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-content placeholder:text-content-muted focus:border-primary focus:outline-none"
                        />
                      </div>

                      {l.quantity > (l.product.currentStock ?? 0) && (
                        <p className="mt-1 text-xs text-amber-600">
                          Only {number(l.product.currentStock)} in stock
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totals + payment */}
          <div className="border-t border-hairline px-5 py-4">
            <div className="space-y-1 text-sm">
              <Row label="Subtotal" value={kes2(totals.subtotal)} />
              {totals.discountTotal > 0 && (
                <Row label="Discount" value={`- ${kes2(totals.discountTotal)}`} />
              )}
              <Row label="Tax" value={kes2(totals.tax)} />
              <div className="flex items-center justify-between pt-1 font-heading text-lg font-bold text-content">
                <span>Total</span>
                <span>{kes2(totals.total)}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content focus:border-primary focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={isCredit}
                value={isCredit ? '' : amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={isCredit ? 'On credit' : `Amount (${kes2(totals.total)})`}
                className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none disabled:bg-slate-50 disabled:text-content-muted"
              />
            </div>

            {paymentMethod !== 'CASH' && (
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Payment reference (optional)"
                className="mt-2 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none"
              />
            )}

            {!isCredit && changeDue > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
                <span>Change due</span>
                <span>{kes2(changeDue)}</span>
              </div>
            )}
            {balanceDue > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                <span>Balance (credit)</span>
                <span>{kes2(balanceDue)}</span>
              </div>
            )}
            {requiresCustomer && !customer && (
              <p className="mt-2 text-xs text-amber-600">
                Credit / partial payments require a customer.
              </p>
            )}
            {error && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <button
              onClick={checkout}
              disabled={!canCheckout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-heading text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Processing…
                </>
              ) : (
                <>Charge {kes2(totals.total)}</>
              )}
            </button>
          </div>
        </Card>
      </div>

      {customerOpen && (
        <CustomerPicker
          onClose={() => setCustomerOpen(false)}
          onSelect={(c) => {
            setCustomer(c);
            setCustomerOpen(false);
          }}
        />
      )}
      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-content-secondary">
      <span>{label}</span>
      <span className="font-medium text-content">{value}</span>
    </div>
  );
}

// ── Product tile ─────────────────────────────────────────────────────────────

function ProductTile({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const img = primaryImage(product);
  const outOfStock = (product.currentStock ?? 0) <= 0;
  return (
    <button
      onClick={onAdd}
      disabled={outOfStock}
      className="group flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface text-left shadow-card transition hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative flex aspect-square items-center justify-center bg-slate-50">
        {img ? (
          <img src={img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package size={28} className="text-content-muted/40" />
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-red-600/90 py-0.5 text-center text-[11px] font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-xs font-medium text-content">{product.name}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="text-sm font-semibold text-primary-700">
            {kes2(product.sellingPrice)}
          </span>
          <span className="text-[11px] text-content-muted">{number(product.currentStock)}</span>
        </div>
      </div>
    </button>
  );
}

// ── Customer picker ──────────────────────────────────────────────────────────

function CustomerPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (c: Customer) => void;
}) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      const q = new URLSearchParams({ pageSize: '30' });
      if (search.trim()) q.set('search', search.trim());
      getData<Customer[]>(`/customers?${q.toString()}`)
        .then((data) => active && setCustomers(data))
        .catch(() => active && setCustomers([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/40 p-4 pt-24"
      onClick={onClose}
    >
      <Card className="w-full max-w-md p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="font-heading text-base font-semibold text-content">Select customer</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-content-muted hover:bg-slate-100 hover:text-content"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
            />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or email…"
              className="w-full rounded-lg border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none"
            />
          </div>
          <ul className="mt-3 max-h-72 divide-y divide-hairline overflow-y-auto">
            {loading ? (
              <li className="py-6 text-center text-sm text-content-muted">Loading…</li>
            ) : customers.length === 0 ? (
              <li className="py-6 text-center text-sm text-content-muted">No customers found.</li>
            ) : (
              customers.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c)}
                    className="flex w-full items-center justify-between px-2 py-2.5 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{c.name}</p>
                      <p className="text-xs text-content-muted">{c.phone ?? c.email ?? '—'}</p>
                    </div>
                    {toNum(c.outstandingBalance) > 0 && (
                      <Badge tone="warning">{kes2(c.outstandingBalance)}</Badge>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Card>
    </div>
  );
}

// ── Receipt modal ────────────────────────────────────────────────────────────

const STORE = {
  name: 'TechStock',
  tagline: 'ICT & Networking Solutions',
  city: 'Nairobi, Kenya',
  phone: '+254 700 000 000',
  email: 'support@techstock.co.ke',
  website: 'www.techstock.co.ke',
};

function receiptDate(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReceiptModal({ sale, onClose }: { sale: SaleResult; onClose: () => void }) {
  const paid = sale.paymentStatus === 'PAID';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-900/50 p-4 print:static print:overflow-visible print:bg-transparent print:p-0">
      <div className="flex min-h-full items-center justify-center py-4 print:py-0">
        <Card
          id="pos-receipt"
          className="w-full max-w-sm overflow-hidden p-0 print:max-w-none print:border-0 print:shadow-none"
          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
        >
          {/* Branded header */}
          <div className="bg-ink-900 px-6 py-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-heading text-base font-bold tracking-wide text-white">
            TS
          </div>
          <h2 className="font-heading text-2xl font-bold tracking-widest">
            {STORE.name.toUpperCase()}
          </h2>
          <p className="mt-0.5 text-sm text-slate-300">{STORE.tagline}</p>
          <p className="mt-1 text-xs text-slate-400">{STORE.city}</p>
          <p className="text-xs text-slate-400">{STORE.phone}</p>
        </div>

        {/* Success + receipt meta */}
        <div className="flex flex-col items-center gap-2 border-b border-dashed border-hairline px-6 py-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <CheckCircle2 size={26} />
          </div>
          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary-700">
            Payment Successful
          </p>
          <p className="text-sm font-medium text-content">{sale.receiptNumber}</p>
          <p className="text-xs text-content-muted">{receiptDate(sale.soldAt)}</p>
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-hairline px-6 py-4">
          <div className="flex items-center justify-between pb-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted">
            <span>Item</span>
            <span>Total</span>
          </div>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {sale.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-content-secondary">
                  <span className="font-medium text-content">{i.quantity}×</span> {i.productName}
                </span>
                <span className="shrink-0 font-medium text-content">{kes2(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals */}
        <div className="border-b border-dashed border-hairline px-6 py-4">
          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={kes2(sale.subtotal)} />
            <Row label="VAT" value={kes2(sale.taxTotal)} />
            {toNum(sale.discountTotal) > 0 && (
              <Row label="Discount" value={`- ${kes2(sale.discountTotal)}`} />
            )}
          </div>
          <div className="my-2 border-t border-hairline" />
          <div className="flex items-center justify-between font-heading text-xl font-bold text-content">
            <span>TOTAL</span>
            <span>{kes2(sale.total)}</span>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <Row label="Paid" value={kes2(sale.amountPaid)} />
            {toNum(sale.changeDue) > 0 && <Row label="Change" value={kes2(sale.changeDue)} />}
          </div>
        </div>

        {/* Status pill */}
        <div className="flex items-center justify-between border-b border-dashed border-hairline px-6 py-3">
          <span className="text-sm text-content-secondary">Status</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              paid ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {sale.paymentStatus}
            {paid && <CheckCircle2 size={13} />}
          </span>
        </div>

        {/* Thank-you + footer */}
        <div className="border-b border-hairline px-6 py-4 text-center">
          <p className="text-sm text-content-secondary">
            Thank you for choosing<span className="font-semibold"> {STORE.name}</span>.
          </p>
          <p className="mt-1 text-xs text-content-muted">
            We appreciate your business and look forward to serving you again.
          </p>
          <div className="mt-3 space-y-0.5 text-[11px] text-content-muted">
            <p className="font-medium text-content-secondary">
              {STORE.name} {STORE.tagline}
            </p>
            <p>{STORE.website}</p>
            <p>{STORE.email}</p>
          </div>
        </div>

          {/* Actions — hidden when printing */}
          <div className="flex flex-col gap-2 px-6 py-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-primary-600"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-content-secondary hover:bg-slate-50"
            >
              New Sale
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
