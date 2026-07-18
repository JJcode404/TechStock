/**
 * Catalog seed — categories (with nested subcategories), supplier brands and
 * products with KES pricing.
 *
 * Idempotent:
 *   - categories are upserted by their (path-derived) unique slug
 *   - suppliers are matched by name (created once)
 *   - products are upserted by a deterministic, path-derived SKU
 *
 * Stock levels are only set on first creation so re-running the seed never
 * clobbers real inventory counts. Safe to run repeatedly.
 */
import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/config/logger.js';
import { slugify } from '../src/utils/slug.js';
import { CATALOG, SUPPLIERS, type CategorySeed } from './data/catalog.js';

const TAX_RATE = 16; // Kenya VAT (%)
const round = (n: number): number => Math.round(n);

/** Create supplier rows for each brand and return name -> id lookup. */
async function seedSuppliers(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const name of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { name, isDeleted: false } });
    const supplier =
      existing ??
      (await prisma.supplier.create({
        data: { name, notes: `${name} products distributor` },
      }));
    map.set(name, supplier.id);
  }
  logger.info(`Seeded ${map.size} suppliers`);
  return map;
}

/** Short, uppercase code built from the category path, e.g. ROU-TPL. */
const pathCode = (segments: string[]): string =>
  segments
    .map((s) =>
      s
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 3),
    )
    .join('-');

let productCount = 0;
const usedSkus = new Set<string>();

/** Ensure a deterministic but unique SKU even when path codes collide. */
function uniqueSku(base: string): string {
  let sku = base;
  let n = 1;
  while (usedSkus.has(sku)) {
    n += 1;
    sku = `${base}-${n}`;
  }
  usedSkus.add(sku);
  return sku;
}

async function seedCategoryTree(
  node: CategorySeed,
  suppliers: Map<string, string>,
  ancestors: string[],
  parentId: string | null,
): Promise<void> {
  const path = [...ancestors, node.name];
  const slug = slugify(path.join('-'));

  const category = await prisma.category.upsert({
    where: { slug },
    update: { name: node.name, parentId },
    create: { name: node.name, slug, parentId },
  });

  if (node.products) {
    const code = pathCode(path);
    let index = 0;
    for (const p of node.products) {
      index += 1;
      const sku = uniqueSku(`${code}-${String(index).padStart(3, '0')}`);
      const supplierId = p.brand ? (suppliers.get(p.brand) ?? null) : null;
      const wholesalePrice = round(p.sellingPrice * 0.9);
      const dealerPrice = round(p.sellingPrice * 0.85);

      await prisma.product.upsert({
        where: { sku },
        update: {
          name: p.name,
          brand: p.brand ?? null,
          categoryId: category.id,
          supplierId,
          buyingPrice: p.buyingPrice,
          sellingPrice: p.sellingPrice,
          wholesalePrice,
          dealerPrice,
          taxRate: TAX_RATE,
        },
        create: {
          name: p.name,
          sku,
          brand: p.brand ?? null,
          categoryId: category.id,
          supplierId,
          buyingPrice: p.buyingPrice,
          sellingPrice: p.sellingPrice,
          wholesalePrice,
          dealerPrice,
          taxRate: TAX_RATE,
          currentStock: 25,
          minStock: 5,
          maxStock: 200,
        },
      });
      productCount += 1;
    }
  }

  for (const child of node.children ?? []) {
    await seedCategoryTree(child, suppliers, path, category.id);
  }
}

export async function seedCatalog(): Promise<void> {
  logger.info('🛒 Seeding catalog (categories, suppliers, products)...');
  const suppliers = await seedSuppliers();
  productCount = 0;
  usedSkus.clear();
  for (const root of CATALOG) {
    await seedCategoryTree(root, suppliers, [], null);
  }
  logger.info(`Seeded catalog: ${productCount} products across ${usedSkus.size} SKUs`);
}
