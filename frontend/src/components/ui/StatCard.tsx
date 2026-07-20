import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from './Card';

type Tone = 'primary' | 'amber' | 'pink' | 'blue';

const ICON_TONES: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600',
  amber: 'bg-amber-50 text-amber-600',
  pink: 'bg-pink-50 text-pink-600',
  blue: 'bg-blue-50 text-blue-600',
};

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_TONES[tone]}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <ArrowUpRight size={16} className="text-content-muted" />
      </div>
      <p className="mt-4 text-sm text-content-secondary">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-content">{value}</p>
      {caption && <p className="mt-1 text-xs text-content-muted">{caption}</p>}
    </Card>
  );
}
