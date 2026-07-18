/**
 * Bulk product-image importer.
 *
 * Scans a source folder (default: ./product-images) for image files, matches
 * each file to a product by filename, copies it into the upload dir and links
 * it as a ProductImage. The first image linked to a product becomes primary.
 *
 * Idempotent: an image whose destination URL already exists in the DB is
 * skipped, so the command can be re-run as more images are added.
 *
 *   npm run db:images            # import from ./product-images
 *   npm run db:images:manifest   # write product-images/manifest.csv and exit
 *
 * Override the source folder with IMAGE_SOURCE_DIR.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { copyFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/config/logger.js';
import { env } from '../src/config/env.js';
import { slugify } from '../src/utils/slug.js';
import { PLACEHOLDER_PREFIX } from './imageConstants.js';

const SOURCE_DIR = path.resolve(process.cwd(), process.env.IMAGE_SOURCE_DIR ?? 'product-images');
const UPLOAD_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: { name: string; parent: { name: string } | null } | null;
}

async function loadProducts(): Promise<ProductRow[]> {
  return prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      sku: true,
      name: true,
      brand: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
    },
    orderBy: { sku: 'asc' },
  });
}

function categoryPath(p: ProductRow): string {
  if (!p.category) return '';
  return p.category.parent ? `${p.category.parent.name} > ${p.category.name}` : p.category.name;
}

/** Recursively collect image files under a directory. */
async function collectImages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(full)));
    } else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function writeManifest(products: ProductRow[]): Promise<void> {
  const esc = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = 'sku,name,brand,category,suggested_filename';
  const rows = products.map((p) =>
    [p.sku, p.name, p.brand ?? '', categoryPath(p), `${p.sku}.jpg`].map(esc).join(','),
  );
  if (!existsSync(SOURCE_DIR)) mkdirSync(SOURCE_DIR, { recursive: true });
  const out = path.join(SOURCE_DIR, 'manifest.csv');
  await writeFile(out, [header, ...rows].join('\n') + '\n', 'utf8');
  logger.info(`Wrote manifest for ${products.length} products -> ${path.relative(process.cwd(), out)}`);
}

/**
 * Match a filename stem to a product. Tries exact SKU, then an explicit variant
 * marker ("SKU__label" for extra images), then a unique product-name slug.
 *
 * The variant delimiter is "__" (double underscore) — never "-" — because SKUs
 * themselves can contain "-N" suffixes (e.g. NET-CAT-001-2), so a "-" delimiter
 * would be ambiguous with a real SKU. Exact-SKU match is always tried first.
 */
function buildMatcher(products: ProductRow[]): (stem: string) => ProductRow | null {
  const bySku = new Map<string, ProductRow>();
  const bySlug = new Map<string, ProductRow>();
  const ambiguousSlugs = new Set<string>();

  for (const p of products) {
    bySku.set(p.sku.toUpperCase(), p);
    const slug = slugify(p.name);
    if (bySlug.has(slug)) ambiguousSlugs.add(slug);
    else bySlug.set(slug, p);
  }
  for (const s of ambiguousSlugs) bySlug.delete(s); // drop non-unique names

  return (stem: string): ProductRow | null => {
    // Exact full SKU first — covers SKUs that legitimately end in "-N".
    if (bySku.has(stem.toUpperCase())) return bySku.get(stem.toUpperCase())!;

    // Everything before an explicit "__" variant marker is the base identifier.
    const base = stem.includes('__') ? stem.slice(0, stem.indexOf('__')) : stem;
    if (base !== stem && bySku.has(base.toUpperCase())) return bySku.get(base.toUpperCase())!;

    const slug = slugify(base);
    if (bySlug.has(slug)) return bySlug.get(slug)!;

    return null;
  };
}

interface ProductImageState {
  count: number;
  hasPrimary: boolean;
}

async function importImages(products: ProductRow[]): Promise<void> {
  const files = await collectImages(SOURCE_DIR);
  if (files.length === 0) {
    logger.warn(
      `No image files found in ${path.relative(process.cwd(), SOURCE_DIR)}. ` +
        `Add images there (see its README), then re-run. Tip: npm run db:images:manifest`,
    );
    return;
  }

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  const match = buildMatcher(products);
  const stateCache = new Map<string, ProductImageState>();
  const placeholdersPurged = new Set<string>();

  let linked = 0;
  let skipped = 0;
  let placeholdersRemoved = 0;
  const unmatched: string[] = [];

  for (const file of files.sort()) {
    const base = path.basename(file);
    const stem = base.slice(0, base.length - path.extname(base).length);
    const product = match(stem);
    if (!product) {
      unmatched.push(base);
      continue;
    }

    // Deterministic destination name -> idempotent by URL.
    const stored = base.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    const url = `/uploads/${stored}`;

    const existing = await prisma.productImage.findFirst({ where: { productId: product.id, url } });
    if (existing) {
      skipped += 1;
      continue;
    }

    // A real image supersedes any auto-generated placeholder for this product.
    if (!placeholdersPurged.has(product.id)) {
      placeholdersPurged.add(product.id);
      const placeholders = await prisma.productImage.findMany({
        where: { productId: product.id, url: { startsWith: `/uploads/${PLACEHOLDER_PREFIX}` } },
        select: { id: true, url: true },
      });
      for (const ph of placeholders) {
        await unlink(path.join(UPLOAD_DIR, path.basename(ph.url))).catch(() => {});
      }
      if (placeholders.length > 0) {
        await prisma.productImage.deleteMany({ where: { id: { in: placeholders.map((p) => p.id) } } });
        placeholdersRemoved += placeholders.length;
        stateCache.delete(product.id); // recompute state without the placeholder
      }
    }

    let state = stateCache.get(product.id);
    if (!state) {
      const [count, primary] = await Promise.all([
        prisma.productImage.count({ where: { productId: product.id } }),
        prisma.productImage.findFirst({ where: { productId: product.id, isPrimary: true }, select: { id: true } }),
      ]);
      state = { count, hasPrimary: Boolean(primary) };
      stateCache.set(product.id, state);
    }

    await copyFile(file, path.join(UPLOAD_DIR, stored));
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url,
        altText: product.name,
        isPrimary: !state.hasPrimary,
        position: state.count,
      },
    });
    state.count += 1;
    state.hasPrimary = true;
    linked += 1;
  }

  const withoutImages = await prisma.product.count({
    where: { isDeleted: false, images: { none: {} } },
  });

  logger.info(
    `Images linked: ${linked}, skipped (already linked): ${skipped}, placeholders replaced: ${placeholdersRemoved}`,
  );
  if (unmatched.length > 0) {
    logger.warn(`Unmatched files (${unmatched.length}): ${unmatched.slice(0, 20).join(', ')}${unmatched.length > 20 ? ' …' : ''}`);
  }
  logger.info(`Products still without any image: ${withoutImages}`);
}

async function main(): Promise<void> {
  const manifestOnly = process.argv.includes('--manifest');
  const products = await loadProducts();
  logger.info(`Loaded ${products.length} products`);
  if (manifestOnly) {
    await writeManifest(products);
  } else {
    await importImages(products);
  }
}

main()
  .catch((err) => {
    logger.error({ err }, 'Image import failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
