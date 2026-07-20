// Currency helpers — money arrives from the API as strings (Decimal) or numbers.

const toNumber = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** e.g. "KES 128,400" — no decimals, for dashboards. */
export const kes = (v: string | number | null | undefined): string =>
  `KES ${toNumber(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

/** e.g. "KES 1,284.00" — with cents, for line items and checkout totals. */
export const kes2 = (v: string | number | null | undefined): string =>
  `KES ${toNumber(v).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** e.g. "KES 1.1M" — compact form for large headline values. */
export const kesCompact = (v: string | number | null | undefined): string => {
  const n = toNumber(v);
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return kes(n);
};

export const number = (v: string | number | null | undefined): string =>
  toNumber(v).toLocaleString('en-KE');

export const shortDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
