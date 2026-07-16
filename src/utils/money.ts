/**
 * Money helpers built on Prisma.Decimal to avoid floating-point errors.
 * All monetary math in services should go through Decimal, never JS numbers.
 */
import { Prisma } from '@prisma/client';

export type Decimal = Prisma.Decimal;
export const Decimal = Prisma.Decimal;

export const toDecimal = (value: Prisma.Decimal.Value): Prisma.Decimal =>
  new Prisma.Decimal(value);

export const ZERO = new Prisma.Decimal(0);

/** Round to 2 decimal places (currency precision), half-up. */
export const round2 = (value: Prisma.Decimal): Prisma.Decimal =>
  value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/** Compute tax amount for a base and a percentage rate. */
export const taxAmount = (base: Prisma.Decimal, ratePercent: Prisma.Decimal.Value): Prisma.Decimal =>
  round2(base.mul(new Prisma.Decimal(ratePercent)).div(100));

export const sum = (values: Prisma.Decimal[]): Prisma.Decimal =>
  values.reduce((acc, v) => acc.add(v), ZERO);
