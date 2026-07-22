import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, Loader2, Package, Users, Truck } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../../lib/auth';
import { getList } from '../../lib/api';
import { kes2 } from '../../lib/format';
import type { Customer, Product, Supplier } from '../../types';

// ── Global search ─────────────────────────────────────────────────────────────

type Group = 'products' | 'customers' | 'suppliers';

interface Hit {
  id: string;
  group: Group;
  label: string;
  detail: string;
  /** Where selecting the hit takes you. */
  to: string;
}

const GROUP_META: Record<Group, { title: string; icon: typeof Package }> = {
  products: { title: 'Products', icon: Package },
  customers: { title: 'Customers', icon: Users },
  suppliers: { title: 'Suppliers', icon: Truck },
};

const PER_GROUP = 5;

/** Fetch a group, swallowing failures so one 403 doesn't blank the whole panel. */
async function search<T>(url: string, map: (row: T) => Hit): Promise<Hit[]> {
  try {
    const { data } = await getList<T>(url);
    return data.map(map);
  } catch {
    return [];
  }
}

export function TopBar() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  const canSeeCustomers = hasPermission('customer:manage');
  const canSeeSuppliers = hasPermission('supplier:manage');

  // ⌘K / Ctrl+K focuses the search box from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the results panel on an outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Run the search (debounced) across every entity the user may read.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const enc = encodeURIComponent(q);
      const params = `search=${enc}&page=1&pageSize=${PER_GROUP}&sortBy=name&sortOrder=asc`;

      const results = await Promise.all([
        search<Product>(`/products?${params}`, (p) => ({
          id: p.id,
          group: 'products',
          label: p.name,
          detail: `${p.sku} · ${kes2(p.sellingPrice)} · ${p.currentStock} in stock`,
          to: `/products/${p.id}`,
        })),
        canSeeCustomers
          ? search<Customer>(`/customers?${params}`, (c) => ({
              id: c.id,
              group: 'customers',
              label: c.name,
              detail: [c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details',
              to: `/customers?search=${encodeURIComponent(c.name)}`,
            }))
          : Promise.resolve<Hit[]>([]),
        canSeeSuppliers
          ? search<Supplier>(`/suppliers?${params}`, (s) => ({
              id: s.id,
              group: 'suppliers',
              label: s.name,
              detail: [s.contactName, s.phone].filter(Boolean).join(' · ') || 'No contact details',
              to: `/suppliers?search=${encodeURIComponent(s.name)}`,
            }))
          : Promise.resolve<Hit[]>([]),
      ]);

      if (!live) return;
      setHits(results.flat());
      setActive(0);
      setLoading(false);
    }, 250);

    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, canSeeCustomers, canSeeSuppliers]);

  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setQuery('');
    navigate(hit.to);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (hits.length ? (i + 1) % hits.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hits.length) go(hits[active]);
      else if (query.trim()) {
        setOpen(false);
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
        setQuery('');
      }
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <header className="flex items-center gap-4 px-8 py-4">
      <div ref={boxRef} className="relative max-w-xl flex-1">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products, customers, suppliers…"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          aria-label="Search"
          className="w-full rounded-full border border-hairline bg-surface py-2.5 pl-11 pr-24 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin text-content-muted" />}
          <span className="rounded-md bg-ink-900 px-2 py-1 text-[11px] font-medium text-white">
            ⌘ + K
          </span>
        </span>

        {showPanel && (
          <div
            id="global-search-results"
            role="listbox"
            className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-hairline bg-surface p-2 shadow-xl"
          >
            {hits.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-content-muted">
                {loading ? 'Searching…' : `No matches for “${query.trim()}”`}
              </p>
            ) : (
              (Object.keys(GROUP_META) as Group[]).map((group) => {
                const rows = hits.filter((h) => h.group === group);
                if (!rows.length) return null;
                const { title, icon: Icon } = GROUP_META[group];
                return (
                  <div key={group} className="mb-1 last:mb-0">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                      {title}
                    </p>
                    {rows.map((hit) => {
                      const index = hits.indexOf(hit);
                      return (
                        <button
                          key={`${group}-${hit.id}`}
                          role="option"
                          aria-selected={index === active}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => go(hit)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                            index === active ? 'bg-primary-100/60' : 'hover:bg-slate-100'
                          }`}
                        >
                          <Icon size={16} className="shrink-0 text-content-muted" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-content">
                              {hit.label}
                            </span>
                            <span className="block truncate text-xs text-content-muted">
                              {hit.detail}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <NotificationBell />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-heading text-sm font-semibold text-primary-700">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-content">
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </p>
          <p className="text-xs text-content-muted">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-content-muted hover:bg-slate-100 hover:text-content"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
