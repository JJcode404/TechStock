import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { kes } from '../lib/format';

// NOTE: sample series. The backend has no month-by-month endpoint yet
// (/reports/sales/monthly returns a single aggregate). Wire this to a real
// /reports/sales/series endpoint once it exists.
const SAMPLE = [
  { month: 'Feb', value: 420 },
  { month: 'Mar', value: 510 },
  { month: 'Apr', value: 480 },
  { month: 'May', value: 620 },
  { month: 'Jun', value: 700 },
  { month: 'Jul', value: 650 },
  { month: 'Aug', value: 820 },
  { month: 'Sep', value: 900 },
  { month: 'Oct', value: 860 },
  { month: 'Nov', value: 1020 },
  { month: 'Dec', value: 1100 },
  { month: 'Jan', value: 1650 },
];

export function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={SAMPLE} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EEF1F5" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94A3B8', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94A3B8', fontSize: 12 }}
          width={48}
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
          formatter={(v: number) => [kes(v * 100), 'Sales']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#10B981"
          strokeWidth={2.5}
          fill="url(#salesFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
