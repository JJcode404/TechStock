/**
 * Expense seed — generates a realistic spread of operating costs across the
 * last six months so the Expenses page and profit/net-profit reports have data.
 *
 * Idempotent: only seeds when the table is empty, so it never duplicates rows
 * or clobbers expenses entered through the app.
 */
import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/config/logger.js';

// Deterministic PRNG so re-seeding a fresh DB always yields the same figures.
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ExpenseRow {
  category: string;
  description: string;
  amount: number;
  incurredAt: Date;
}

export async function seedExpenses(): Promise<void> {
  const existing = await prisma.expense.count({ where: { isDeleted: false } });
  if (existing > 0) {
    logger.info(`Expenses already present (${existing}), skipping expense seed`);
    return;
  }

  // Attribute to the manager if present, else any user (expenses need a recorder).
  const recorder =
    (await prisma.user.findFirst({ where: { username: 'manager' }, select: { id: true } })) ??
    (await prisma.user.findFirst({ select: { id: true } }));
  if (!recorder) {
    logger.warn('No user found to attribute expenses to, skipping expense seed');
    return;
  }

  const rng = mulberry32(20_260_720);
  const rows: ExpenseRow[] = [];
  const now = new Date();
  const money = (base: number, spread: number): number => base + Math.round(rng() * spread);

  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // In the current (partial) month, never date an expense in the future.
    const cap = m === 0 ? now.getDate() : daysInMonth;
    const on = (day: number): Date => new Date(year, month, Math.min(Math.max(1, day), cap), 9, 0, 0);
    const add = (category: string, description: string, amount: number, day: number) =>
      rows.push({ category, description, amount, incurredAt: on(day) });

    // Recurring monthly costs.
    add('Rent', 'Monthly shop rent', 45_000, 1);
    add('Salaries', 'Staff salaries', money(118_000, 12_000), 5);
    add('Internet', 'Fibre subscription', 5_000, 3);
    add('Utilities', 'Electricity (KPLC)', money(8_000, 6_000), 7);
    add('Utilities', 'Water bill', money(1_500, 1_500), 8);
    add('Bank Charges', 'Monthly account fees', money(500, 900), 26);

    // Variable day-to-day costs.
    const transportRuns = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < transportRuns; i++) {
      add('Transport', 'Deliveries & fuel', money(500, 2_500), 1 + Math.floor(rng() * cap));
    }
    if (rng() > 0.4) add('Marketing', 'Social media ads', money(3_000, 12_000), 1 + Math.floor(rng() * cap));
    if (rng() > 0.5) add('Supplies', 'Office & packaging supplies', money(1_200, 5_000), 1 + Math.floor(rng() * cap));
    if (rng() > 0.6) add('Maintenance', 'Repairs & servicing', money(2_000, 9_000), 1 + Math.floor(rng() * cap));
    if (rng() > 0.8) add('Licenses', 'Permits & renewals', money(5_000, 15_000), 1 + Math.floor(rng() * cap));
  }

  await prisma.expense.createMany({
    data: rows.map((r) => ({
      category: r.category,
      description: r.description,
      amount: r.amount,
      incurredAt: r.incurredAt,
      recordedById: recorder.id,
    })),
  });
  logger.info(`Seeded ${rows.length} expenses across 6 months`);
}
