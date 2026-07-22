import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Coins,
  BarChart3,
  Loader2,
  Percent,
  ShoppingBag,
  Landmark,
  CreditCard,
  Users,
  Truck,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge, paymentTone } from '../components/ui/Badge';
import { getData, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kes, kesCompact, number, shortDateTime } from '../lib/format';
import type {
  CategoryBreakdown,
  DebtorsReport,
  PaymentMethodBreakdown,
  ProfitReport,
  RecentSale,
  ReportProduct,
  SalesSummaryPoint,
} from '../types';

// ── Permission (ADMIN & MANAGER hold this; CASHIER does not) ──────────────────
const PERM_VIEW = 'report:view';

const toNum = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Percentage change vs a prior value; null when there's no meaningful base. */
function pctDelta(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT: 'Credit',
  OTHER: 'Other',
};

type GroupBy = 'day' | 'week' | 'month';
type TopBy = 'quantity' | 'revenue';

// ── Date-range presets ────────────────────────────────────────────────────────

interface Range {
  from: string; // yyyy-mm-dd
  to: string;
  groupBy: GroupBy;
}

function isoStart(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function isoEnd(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}
function toInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const PRESETS: { label: string; days: number; groupBy: GroupBy }[] = [
  { label: '7 days', days: 7, groupBy: 'day' },
  { label: '30 days', days: 30, groupBy: 'day' },
  { label: '90 days', days: 90, groupBy: 'week' },
  { label: '12 months', days: 365, groupBy: 'month' },
];

function presetRange(days: number, groupBy: GroupBy): Range {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  return { from: toInput(from), to: toInput(to), groupBy };
}

// Format a bucket ISO date for the chart axis based on granularity.
function bucketLabel(iso: string, groupBy: GroupBy): string {
  const d = new Date(iso);
  if (groupBy === 'month') return d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Reports() {
  const { hasPermission } = useAuth();
  const canView = hasPermission(PERM_VIEW);

  const [range, setRange] = useState<Range>(() => presetRange(30, 'day'));
  const [activePreset, setActivePreset] = useState<number | null>(1); // index into PRESETS

  const [profit, setProfit] = useState<ProfitReport | null>(null);
  const [prevProfit, setPrevProfit] = useState<ProfitReport | null>(null);
  const [series, setSeries] = useState<SalesSummaryPoint[]>([]);
  const [topBy, setTopBy] = useState<TopBy>('revenue');
  const [topProducts, setTopProducts] = useState<ReportProduct[]>([]);
  const [profitable, setProfitable] = useState<ReportProduct[]>([]);
  const [byPayment, setByPayment] = useState<PaymentMethodBreakdown[]>([]);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);

  // Not tied to the date range — loaded once.
  const [recent, setRecent] = useState<RecentSale[]>([]);
  const [debtors, setDebtors] = useState<DebtorsReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query string for the current range (from start-of-day to end-of-day).
  const rangeQs = useMemo(() => {
    const q = new URLSearchParams();
    q.set('from', isoStart(new Date(range.from)));
    q.set('to', isoEnd(new Date(range.to)));
    return q;
  }, [range.from, range.to]);

  // Query string for the immediately-preceding, equal-length window.
  const prevQs = useMemo(() => {
    const fromD = new Date(range.from);
    const toD = new Date(range.to);
    const msDay = 86_400_000;
    const lenDays = Math.max(1, Math.round((toD.getTime() - fromD.getTime()) / msDay) + 1);
    const prevTo = new Date(fromD);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - lenDays + 1);
    const q = new URLSearchParams();
    q.set('from', isoStart(prevFrom));
    q.set('to', isoEnd(prevTo));
    return q;
  }, [range.from, range.to]);

  // Load everything that depends on the selected range.
  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    const summaryQs = new URLSearchParams(rangeQs);
    summaryQs.set('groupBy', range.groupBy);
    const topQs = new URLSearchParams(rangeQs);
    topQs.set('limit', '8');
    topQs.set('by', topBy);
    const profitableQs = new URLSearchParams(rangeQs);
    profitableQs.set('limit', '8');

    Promise.all([
      getData<ProfitReport>(`/reports/profit?${rangeQs.toString()}`),
      getData<ProfitReport>(`/reports/profit?${prevQs.toString()}`),
      getData<SalesSummaryPoint[]>(`/reports/sales/summary?${summaryQs.toString()}`),
      getData<ReportProduct[]>(`/reports/products/top?${topQs.toString()}`),
      getData<ReportProduct[]>(`/reports/products/most-profitable?${profitableQs.toString()}`),
      getData<PaymentMethodBreakdown[]>(`/reports/sales/by-payment-method?${rangeQs.toString()}`),
      getData<CategoryBreakdown[]>(`/reports/sales/by-category?${rangeQs.toString()}`),
    ])
      .then(([p, pp, s, t, mp, pay, cat]) => {
        if (!active) return;
        setProfit(p);
        setPrevProfit(pp);
        setSeries(s);
        setTopProducts(t);
        setProfitable(mp);
        setByPayment(pay);
        setByCategory(cat);
      })
      .catch((err) => active && setError(apiErrorMessage(err, 'Could not load reports')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [canView, rangeQs, prevQs, range.groupBy, topBy]);

  // Load range-independent panels once.
  useEffect(() => {
    if (!canView) return;
    let active = true;
    getData<RecentSale[]>('/reports/sales/recent?limit=10')
      .then((d) => active && setRecent(d))
      .catch(() => active && setRecent([]));
    getData<DebtorsReport>('/reports/debtors?limit=8')
      .then((d) => active && setDebtors(d))
      .catch(() => active && setDebtors(null));
    return () => {
      active = false;
    };
  }, [canView]);

  const chartData = useMemo(
    () =>
      series.map((s) => ({
        label: bucketLabel(s.bucket, range.groupBy),
        revenue: toNum(s.revenue),
        profit: toNum(s.profit),
      })),
    [series, range.groupBy],
  );

  if (!canView) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <BarChart3 size={32} className="mx-auto mb-3 text-content-muted/50" />
        <h1 className="font-heading text-lg font-semibold text-content">Reports</h1>
        <p className="mt-1 text-sm text-content-muted">
          You don't have permission to view reports. This area is available to managers and
          administrators.
        </p>
      </Card>
    );
  }

  const applyPreset = (i: number) => {
    const p = PRESETS[i];
    setRange(presetRange(p.days, p.groupBy));
    setActivePreset(i);
  };

  const setDate = (key: 'from' | 'to', value: string) => {
    setRange((r) => ({ ...r, [key]: value }));
    setActivePreset(null);
  };

  // Derived KPIs and period-over-period deltas.
  const revenue = toNum(profit?.revenue);
  const grossProfit = toNum(profit?.grossProfit);
  const grossSales = toNum(profit?.grossSales);
  const txns = profit?.transactions ?? 0;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const avgSale = txns > 0 ? grossSales / txns : 0;

  const revenueDelta = pctDelta(revenue, toNum(prevProfit?.revenue));
  const profitDelta = pctDelta(grossProfit, toNum(prevProfit?.grossProfit));
  const expenseDelta = pctDelta(toNum(profit?.expenses), toNum(prevProfit?.expenses));
  const netDelta = pctDelta(toNum(profit?.netProfit), toNum(prevProfit?.netProfit));

  const maxPay = Math.max(1, ...byPayment.map((p) => toNum(p.amount)));
  const maxCat = Math.max(1, ...byCategory.map((c) => toNum(c.revenue)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-content">Reports</h1>
          <p className="text-sm text-content-muted">Sales, profit &amp; product performance</p>
        </div>
      </div>

      {/* Date range toolbar */}
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-full border border-hairline p-1">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => applyPreset(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activePreset === i
                  ? 'bg-ink-900 text-white'
                  : 'text-content-secondary hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setDate('from', e.target.value)}
            className="rounded-lg border border-hairline bg-surface px-3 py-2 text-content focus:border-primary focus:outline-none"
          />
          <span className="text-content-muted">to</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={toInput(new Date())}
            onChange={(e) => setDate('to', e.target.value)}
            className="rounded-lg border border-hairline bg-surface px-3 py-2 text-content focus:border-primary focus:outline-none"
          />
          <select
            value={range.groupBy}
            onChange={(e) => {
              setRange((r) => ({ ...r, groupBy: e.target.value as GroupBy }));
              setActivePreset(null);
            }}
            className="rounded-lg border border-hairline bg-surface px-3 py-2 text-content-secondary focus:border-primary focus:outline-none"
          >
            <option value="day">By day</option>
            <option value="week">By week</option>
            <option value="month">By month</option>
          </select>
        </div>
      </Card>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-content-muted">
          <Loader2 size={18} className="animate-spin" /> Loading reports…
        </div>
      ) : (
        <>
          {/* KPI row — with period-over-period deltas vs the previous equal window */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue (net)"
              value={kes(revenue)}
              caption={`${number(txns)} transactions`}
              icon={Wallet}
              tone="primary"
              delta={revenueDelta}
            />
            <StatCard
              label="Gross Profit"
              value={kes(grossProfit)}
              caption={`COGS ${kes(profit?.costOfGoodsSold)}`}
              icon={TrendingUp}
              tone="blue"
              delta={profitDelta}
            />
            <StatCard
              label="Expenses"
              value={kes(profit?.expenses)}
              caption="In selected period"
              icon={Receipt}
              tone="amber"
              delta={expenseDelta}
              invertDelta
            />
            <StatCard
              label="Net Profit"
              value={kes(profit?.netProfit)}
              caption="After expenses"
              icon={Coins}
              tone="pink"
              delta={netDelta}
            />
          </div>

          {/* Secondary derived metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniStat
              icon={Percent}
              label="Profit margin"
              value={`${margin.toFixed(1)}%`}
              caption="Gross profit ÷ revenue"
            />
            <MiniStat
              icon={ShoppingBag}
              label="Avg. sale value"
              value={kes(avgSale)}
              caption="Gross sales ÷ transactions"
            />
            <MiniStat
              icon={Landmark}
              label="VAT collected"
              value={kes(profit?.tax)}
              caption="Tax on sales in period"
            />
          </div>

          {/* Sales/profit chart */}
          <Card className="pb-5">
            <CardHeader
              title="Sales & Profit"
              action={
                <span className="text-xs text-content-muted">
                  {kesCompact(grossSales)} gross sales
                </span>
              }
            />
            <div className="px-2 pt-4">
              {chartData.length === 0 ? (
                <div className="py-16 text-center text-sm text-content-muted">
                  No sales in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EEF1F5" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      width={56}
                      tickFormatter={(v: number) => kesCompact(v).replace('KES ', '')}
                    />
                    <Tooltip
                      cursor={{ stroke: '#10B981', strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        background: '#0F172A',
                        color: '#fff',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#94A3B8' }}
                      formatter={(v: number, name: string) => [
                        kes(v),
                        name === 'revenue' ? 'Revenue' : 'Profit',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#revFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      fill="url(#profitFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-4 px-6 pt-2 text-xs text-content-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Profit
              </span>
            </div>
          </Card>

          {/* Payment methods + category breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="pb-5">
              <CardHeader
                title="Payment Methods"
                action={<CreditCard size={16} className="text-content-muted" />}
              />
              <div className="mt-3 space-y-3 px-6">
                {byPayment.length === 0 ? (
                  <p className="py-6 text-sm text-content-muted">No payments in this period.</p>
                ) : (
                  byPayment.map((p) => (
                    <BarRow
                      key={p.method}
                      label={METHOD_LABELS[p.method] ?? p.method}
                      sub={`${number(p.count)} payments`}
                      value={kes(p.amount)}
                      pct={(toNum(p.amount) / maxPay) * 100}
                      color="bg-primary"
                    />
                  ))
                )}
              </div>
            </Card>

            <Card className="pb-5">
              <CardHeader title="Sales by Category" />
              <div className="mt-3 space-y-3 px-6">
                {byCategory.length === 0 ? (
                  <p className="py-6 text-sm text-content-muted">No category sales in this period.</p>
                ) : (
                  byCategory.map((c) => (
                    <BarRow
                      key={c.categoryId}
                      label={c.name}
                      sub={`${number(c.unitsSold)} units · ${kes(c.profit)} profit`}
                      value={kes(c.revenue)}
                      pct={(toNum(c.revenue) / maxCat) * 100}
                      color="bg-blue-500"
                    />
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Product leaderboards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="pb-4">
              <CardHeader
                title="Top Products"
                action={
                  <div className="flex gap-1 rounded-full border border-hairline p-0.5 text-xs">
                    {(['revenue', 'quantity'] as TopBy[]).map((b) => (
                      <button
                        key={b}
                        onClick={() => setTopBy(b)}
                        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                          topBy === b
                            ? 'bg-ink-900 text-white'
                            : 'text-content-secondary hover:bg-slate-100'
                        }`}
                      >
                        {b === 'revenue' ? 'By revenue' : 'By units'}
                      </button>
                    ))}
                  </div>
                }
              />
              <ProductList
                products={topProducts}
                metric={(p) =>
                  topBy === 'revenue' ? kes(p.revenue) : `${number(p.unitsSold)} sold`
                }
              />
            </Card>

            <Card className="pb-4">
              <CardHeader title="Most Profitable" />
              <ProductList
                products={profitable}
                metric={(p) => kes(p.profit)}
                metricTone="text-primary-700"
              />
            </Card>
          </div>

          {/* Debtors */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="pb-4">
              <CardHeader
                title="Customers Owing"
                action={<Users size={16} className="text-content-muted" />}
              />
              <DebtorList
                rows={debtors?.customers ?? []}
                empty="No customers owe money."
                tone="warning"
              />
            </Card>
            <Card className="pb-4">
              <CardHeader
                title="Suppliers We Owe"
                action={<Truck size={16} className="text-content-muted" />}
              />
              <DebtorList
                rows={debtors?.suppliers ?? []}
                empty="No outstanding supplier balances."
                tone="info"
              />
            </Card>
          </div>

          {/* Recent transactions */}
          <Card className="pb-2">
            <CardHeader title="Recent Transactions" />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-hairline bg-slate-50 text-left text-xs font-medium text-content-secondary">
                    <th className="px-6 py-3">Receipt</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Cashier</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-content-muted">
                        No sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3 font-medium text-content">{s.receiptNumber}</td>
                        <td className="px-6 py-3 text-content-secondary">
                          {s.customer?.name ?? 'Walk-in'}
                        </td>
                        <td className="px-6 py-3 text-content-secondary">
                          {s.cashier?.username ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-content-muted">{shortDateTime(s.soldAt)}</td>
                        <td className="px-6 py-3 text-right font-semibold text-content">
                          {kes(s.total)}
                        </td>
                        <td className="px-6 py-3">
                          <Badge tone={paymentTone(s.paymentStatus)}>{s.paymentStatus}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Small metric tile ────────────────────────────────────────────────────────

function MiniStat({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-content-secondary">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-content-secondary">{label}</p>
        <p className="font-heading text-xl font-bold text-content">{value}</p>
        {caption && <p className="text-xs text-content-muted">{caption}</p>}
      </div>
    </Card>
  );
}

// ── Horizontal bar row (payment / category breakdowns) ───────────────────────

function BarRow({
  label,
  sub,
  value,
  pct,
  color,
}: {
  label: string;
  sub: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium text-content">{label}</span>
        <span className="shrink-0 text-sm font-semibold text-content">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-content-muted">{sub}</p>
    </div>
  );
}

// ── Ranked product list ──────────────────────────────────────────────────────

function ProductList({
  products,
  metric,
  metricTone = 'text-content',
}: {
  products: ReportProduct[];
  metric: (p: ReportProduct) => string;
  metricTone?: string;
}) {
  if (products.length === 0) {
    return <p className="px-6 py-8 text-sm text-content-muted">No sales data for this period.</p>;
  }
  return (
    <ul className="mt-2 divide-y divide-hairline">
      {products.map((p, i) => (
        <li key={p.productId} className="flex items-center gap-3 px-6 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-content">{p.name}</p>
            <p className="text-xs text-content-muted">
              {p.sku} · {number(p.unitsSold)} units
            </p>
          </div>
          <span className={`shrink-0 text-sm font-semibold ${metricTone}`}>{metric(p)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Debtor list ──────────────────────────────────────────────────────────────

function DebtorList({
  rows,
  empty,
  tone,
}: {
  rows: { id: string; name: string; phone: string | null; outstandingBalance: string | number }[];
  empty: string;
  tone: 'warning' | 'info';
}) {
  if (rows.length === 0) {
    return <p className="px-6 py-8 text-sm text-content-muted">{empty}</p>;
  }
  return (
    <ul className="mt-2 divide-y divide-hairline">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-content">{r.name}</p>
            <p className="text-xs text-content-muted">{r.phone ?? '—'}</p>
          </div>
          <Badge tone={tone}>{kes(r.outstandingBalance)}</Badge>
        </li>
      ))}
    </ul>
  );
}
