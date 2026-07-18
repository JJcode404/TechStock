/**
 * Bulk barcode generator.
 *
 * Assigns a unique EAN-13 barcode to every product that doesn't already have
 * one, so products can be scanned at the POS. Idempotent: products that already
 * have a barcode are left untouched, so it's safe to re-run.
 *
 *   npm run db:barcodes
 */
import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/config/logger.js';
import { generateEan13 } from '../src/utils/generators.js';

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { isDeleted: false, barcode: null },
    select: { id: true, sku: true },
    orderBy: { sku: 'asc' },
  });

  if (products.length === 0) {
    logger.info('Every product already has a barcode — nothing to do.');
    return;
  }

  // Preload existing barcodes so generated ones stay globally unique.
  const existing = await prisma.product.findMany({
    where: { barcode: { not: null } },
    select: { barcode: true },
  });
  const used = new Set(existing.map((p) => p.barcode!));

  const uniqueEan13 = (): string => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateEan13();
      if (!used.has(code)) {
        used.add(code);
        return code;
      }
    }
    throw new Error('Could not generate a unique EAN-13 barcode after 20 attempts');
  };

  let assigned = 0;
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { barcode: uniqueEan13(), syncVersion: { increment: 1 } },
    });
    assigned += 1;
  }

  logger.info(`Assigned barcodes to ${assigned} product(s).`);
}

main()
  .catch((err) => {
    logger.error({ err }, 'Barcode generation failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
