import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const TONES: Record<Tone, string> = {
  success: 'bg-primary-50 text-primary-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Map a backend payment status to a badge tone + label. */
export function paymentTone(status: string): Tone {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'UNPAID':
      return 'danger';
    case 'REFUNDED':
      return 'info';
    default:
      return 'neutral';
  }
}
