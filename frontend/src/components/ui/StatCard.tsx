import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './Card';

type Tone = 'primary' | 'amber' | 'pink' | 'blue';

const ICON_TONES: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600',
  amber: 'bg-amber-50 text-amber-600',
  pink: 'bg-pink-50 text-pink-600',
  blue: 'bg-blue-50 text-blue-600',
};

/**
 * Period-over-period change pill. `invert` flips the colour semantics for
 * metrics where a rise is unwelcome (e.g. expenses): up becomes red.
 */
function DeltaPill({ value, invert }: { value: number; invert?: boolean }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        good ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = 'primary',
  delta,
  invertDelta,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Percentage change vs a comparison period. `null`/`undefined` hides the pill. */
  delta?: number | null;
  /** When true, an increase is shown as negative (red) — use for cost metrics. */
  invertDelta?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_TONES[tone]}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {typeof delta === 'number' && Number.isFinite(delta) ? (
          <DeltaPill value={delta} invert={invertDelta} />
        ) : (
          <ArrowUpRight size={16} className="text-content-muted" />
        )}
      </div>
      <p className="mt-4 text-sm text-content-secondary">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-content">{value}</p>
      {caption && <p className="mt-1 text-xs text-content-muted">{caption}</p>}
    </Card>
  );
}
