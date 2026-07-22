import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Loader2,
  PackageX,
  PackageMinus,
  FileEdit,
  Truck,
  Wallet,
  Check,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getData, getList } from '../../lib/api';
import { kes2 } from '../../lib/format';
import type { Customer, PaginationMeta, Product, PurchaseOrderRow } from '../../types';

/**
 * Standing-alerts panel.
 *
 * These are *conditions*, not events: "stock is low right now", not "stock went
 * low at 14:03". They clear themselves when someone restocks or receives an
 * order, so there is deliberately no read/unread state — that would need a
 * notifications table and per-user dismissal tracking.
 */

interface AlertItem {
  id: string;
  label: string;
  detail: string;
  /** Where clicking the row takes you. */
  to: string;
}

interface AlertGroup {
  key: string;
  title: string;
  icon: typeof Bell;
  /** Tailwind text colour for the icon — severity at a glance. */
  tone: string;
  items: AlertItem[];
  /** Total matching records, which may exceed the items we list. */
  total: number;
  viewAll: string;
}

/** Rows listed per group before "view all" takes over. */
const PREVIEW = 5;
/** Upper bound asked of the API per group. */
const FETCH_LIMIT = 50;

/** Fetch one group, swallowing failures so a single 403 doesn't blank the panel. */
async function safely<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch {
    return fallback;
  }
}

const stockDetail = (p: Product): string =>
  `${p.sku} · ${p.currentStock} in stock${p.minStock ? ` · min ${p.minStock}` : ''}`;

export function NotificationBell() {
  const { hasPermission } = useAuth();

  const canReadInventory = hasPermission('inventory:read');
  const canReadPurchases = hasPermission('purchase:read');
  const canManageCustomers = hasPermission('customer:manage');

  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const [outOfStock, lowStock, drafts, incoming, partial, debtors] = await Promise.all([
      canReadInventory
        ? safely(() => getData<Product[]>(`/products/out-of-stock?limit=${FETCH_LIMIT}`), [])
        : Promise.resolve<Product[]>([]),
      canReadInventory
        ? safely(() => getData<Product[]>(`/products/low-stock?limit=${FETCH_LIMIT}`), [])
        : Promise.resolve<Product[]>([]),
      canReadPurchases
        ? safely(
            () => getList<PurchaseOrderRow>('/purchase-orders?status=DRAFT&pageSize=' + PREVIEW),
            { data: [] },
          )
        : Promise.resolve({ data: [] as PurchaseOrderRow[] }),
      canReadPurchases
        ? safely(
            () => getList<PurchaseOrderRow>('/purchase-orders?status=ORDERED&pageSize=' + PREVIEW),
            { data: [] },
          )
        : Promise.resolve({ data: [] as PurchaseOrderRow[] }),
      canReadPurchases
        ? safely(
            () =>
              getList<PurchaseOrderRow>(
                '/purchase-orders?status=PARTIALLY_RECEIVED&pageSize=' + PREVIEW,
              ),
            { data: [] },
          )
        : Promise.resolve({ data: [] as PurchaseOrderRow[] }),
      canManageCustomers
        ? safely(
            () =>
              getList<Customer>(
                `/customers?hasBalance=true&sortBy=outstandingBalance&sortOrder=desc&pageSize=${PREVIEW}`,
              ),
            { data: [] },
          )
        : Promise.resolve({ data: [] as Customer[] }),
    ]);

    const totalOf = (r: { data: unknown[]; meta?: unknown }, fallback: number) =>
      (r.meta as PaginationMeta | undefined)?.total ?? fallback;

    const next: AlertGroup[] = [];

    if (outOfStock.length) {
      next.push({
        key: 'out-of-stock',
        title: 'Out of stock',
        icon: PackageX,
        tone: 'text-rose-600',
        total: outOfStock.length,
        items: outOfStock.slice(0, PREVIEW).map((p) => ({
          id: p.id,
          label: p.name,
          detail: stockDetail(p),
          to: `/products/${p.id}`,
        })),
        viewAll: '/products?filter=out',
      });
    }

    if (lowStock.length) {
      next.push({
        key: 'low-stock',
        title: 'Running low',
        icon: PackageMinus,
        tone: 'text-amber-600',
        total: lowStock.length,
        items: lowStock.slice(0, PREVIEW).map((p) => ({
          id: p.id,
          label: p.name,
          detail: stockDetail(p),
          to: `/products/${p.id}`,
        })),
        viewAll: '/products?filter=low',
      });
    }

    if (drafts.data.length) {
      next.push({
        key: 'po-draft',
        title: 'Unsubmitted purchase orders',
        icon: FileEdit,
        tone: 'text-content-secondary',
        total: totalOf(drafts, drafts.data.length),
        items: drafts.data.map((po) => ({
          id: po.id,
          label: po.orderNumber,
          detail: `${po.supplier?.name ?? 'No supplier'} · ${kes2(po.total)}`,
          to: '/purchase-orders?status=DRAFT',
        })),
        viewAll: '/purchase-orders?status=DRAFT',
      });
    }

    const awaiting = [...incoming.data, ...partial.data];
    if (awaiting.length) {
      next.push({
        key: 'po-awaiting',
        title: 'Awaiting delivery',
        icon: Truck,
        tone: 'text-primary-700',
        total: totalOf(incoming, incoming.data.length) + totalOf(partial, partial.data.length),
        items: awaiting.slice(0, PREVIEW).map((po) => ({
          id: po.id,
          label: po.orderNumber,
          detail: `${po.supplier?.name ?? 'No supplier'} · ${
            po.status === 'PARTIALLY_RECEIVED' ? 'part-received' : 'ordered'
          }${po.expectedAt ? ` · due ${new Date(po.expectedAt).toLocaleDateString('en-KE')}` : ''}`,
          to: '/purchase-orders?status=ORDERED',
        })),
        viewAll: '/purchase-orders?status=ORDERED',
      });
    }

    if (debtors.data.length) {
      next.push({
        key: 'debtors',
        title: 'Customers owing',
        icon: Wallet,
        tone: 'text-amber-600',
        total: totalOf(debtors, debtors.data.length),
        items: debtors.data.map((c) => ({
          id: c.id,
          label: c.name,
          detail: `${kes2(c.outstandingBalance)} outstanding`,
          to: `/customers?search=${encodeURIComponent(c.name)}`,
        })),
        viewAll: '/customers?filter=balance',
      });
    }

    setGroups(next);
    setLoading(false);
  }, [canReadInventory, canReadPurchases, canManageCustomers]);

  useEffect(() => {
    void load();
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // The badge counts *kinds* of problem, not individual rows — 47 low-stock
  // items is one thing to deal with, and a 47 badge would just get ignored.
  const badge = groups.length;

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) void load();
      return !wasOpen;
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={toggle}
        aria-label={badge ? `Notifications, ${badge} needing attention` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-content-secondary hover:text-content"
      >
        <Bell size={18} />
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-[32rem] w-96 overflow-y-auto rounded-2xl border border-hairline bg-surface p-2 shadow-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-heading text-sm font-semibold text-content">Needs attention</p>
            {loading && <Loader2 size={14} className="animate-spin text-content-muted" />}
          </div>

          {!loading && groups.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Check size={24} className="mx-auto mb-2 text-emerald-600" />
              <p className="text-sm text-content-muted">Nothing needs attention.</p>
            </div>
          ) : (
            groups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.key} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-2 px-3 pb-1 pt-2">
                    <Icon size={14} className={group.tone} />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                      {group.title}
                    </p>
                    <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-content-secondary">
                      {group.total >= FETCH_LIMIT ? `${FETCH_LIMIT}+` : group.total}
                    </span>
                  </div>

                  {group.items.map((item) => (
                    <Link
                      key={`${group.key}-${item.id}`}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-100"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-content">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-content-muted">
                          {item.detail}
                        </span>
                      </span>
                    </Link>
                  ))}

                  {group.total > group.items.length && (
                    <Link
                      to={group.viewAll}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      View all {group.total >= FETCH_LIMIT ? `${FETCH_LIMIT}+` : group.total} →
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
