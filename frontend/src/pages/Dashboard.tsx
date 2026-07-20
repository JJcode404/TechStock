import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, AlertTriangle, Boxes } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge, paymentTone } from '../components/ui/Badge';
import { SalesChart } from '../components/SalesChart';
import { getData, apiErrorMessage } from '../lib/api';
import { kes, kesCompact, number, shortDateTime } from '../lib/format';
import type { DashboardData } from '../types';

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getData<DashboardData>('/reports/dashboard')
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load dashboard')));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    );
  }
  if (!data) {
    return <div className="py-16 text-center text-content-muted">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-content">Dashboard</h1>
        <p className="text-sm text-content-muted">Store performance at a glance</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={kes(data.today.sales)}
          caption={`${number(data.today.transactions)} sales today`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="This Month"
          value={kes(data.month.sales)}
          caption={`${number(data.month.transactions)} transactions`}
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Low Stock Items"
          value={number(data.inventory.lowStockCount)}
          caption={`${number(data.inventory.outOfStockCount)} out of stock`}
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Stock Value"
          value={kes(data.inventory.stockRetailValue)}
          caption={`${number(data.inventory.totalUnits)} units in stock`}
          icon={Boxes}
          tone="pink"
        />
      </div>

      {/* Chart + top products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 pb-5">
          <CardHeader
            title="Sales Overview"
            action={<span className="text-xs text-content-muted">Last 12 months</span>}
          />
          <p className="px-6 pt-2 font-heading text-3xl font-bold text-content">
            {kesCompact(data.month.sales)}
          </p>
          <p className="px-6 pb-3 text-xs text-content-muted">This month so far</p>
          <div className="px-2">
            <SalesChart />
          </div>
        </Card>

        <Card className="pb-4">
          <CardHeader title="Top Products" />
          <ul className="mt-2 divide-y divide-hairline">
            {data.topProducts.length === 0 && (
              <li className="px-6 py-6 text-sm text-content-muted">No sales data yet.</li>
            )}
            {data.topProducts.map((p, i) => (
              <li key={p.productId} className="flex items-center gap-3 px-6 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-content">{p.name}</p>
                  {p.sku && <p className="text-xs text-content-muted">{p.sku}</p>}
                </div>
                <span className="text-sm font-semibold text-content">
                  {p.revenue !== undefined ? kes(p.revenue) : `${number(p.quantity ?? 0)} sold`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent sales */}
      <Card className="pb-2">
        <CardHeader title="Recent Sales" />
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
              {data.recentSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-content-muted">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
              {data.recentSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 font-medium text-content">{s.receiptNumber}</td>
                  <td className="px-6 py-3 text-content-secondary">
                    {s.customer?.name ?? 'Walk-in'}
                  </td>
                  <td className="px-6 py-3 text-content-secondary">{s.cashier?.username ?? '—'}</td>
                  <td className="px-6 py-3 text-content-muted">{shortDateTime(s.soldAt)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-content">{kes(s.total)}</td>
                  <td className="px-6 py-3">
                    <Badge tone={paymentTone(s.paymentStatus)}>{s.paymentStatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
