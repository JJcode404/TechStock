/**
 * Placeholder image generator.
 *
 * Creates a self-contained SVG per product that displays the product name (plus
 * brand and category), writes it into the upload dir and links it as the
 * product's primary image. SVGs are text, so this needs no image libraries and
 * works fully offline.
 *
 * Only products that currently have NO image get a placeholder, so it never
 * overwrites real photos and is safe to re-run. When you later import a real
 * image (npm run db:images), the importer removes the product's placeholder.
 *
 *   npm run db:images:placeholders
 */
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/config/logger.js';
import { env } from '../src/config/env.js';
import { placeholderFilename } from './imageConstants.js';

const UPLOAD_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR);
const WIDTH = 640;
const HEIGHT = 640;

// Muted, dark backgrounds — white text stays readable on all of them.
const PALETTE = [
  '#1f2937', '#374151', '#3f3251', '#4c1d24', '#1e3a5f',
  '#14532d', '#334155', '#4a2f10', '#3b2f2f', '#1e3d3a',
  '#42275a', '#2c3e50',
];

const escapeXml = (s: string): string =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Stable palette index from a string. */
const hashIndex = (s: string, mod: number): number => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
};

/** Greedy word-wrap into at most `maxLines` lines of ~`maxChars` chars. */
const wrap = (text: string, maxChars: number, maxLines: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 1)}…`;
    return kept;
  }
  return lines;
};

interface PlaceholderProduct {
  sku: string;
  name: string;
  brand: string | null;
  category: string;
}

function buildSvg(p: PlaceholderProduct): string {
  const bg = PALETTE[hashIndex(p.category || p.name, PALETTE.length)];
  const nameLines = wrap(p.name, 18, 4);
  const fontSize = nameLines.length > 3 ? 44 : 52;
  const lineHeight = fontSize + 12;
  const blockHeight = nameLines.length * lineHeight;
  let y = HEIGHT / 2 - blockHeight / 2 + fontSize;

  const nameTspans = nameLines
    .map((l) => {
      const tspan = `<text x="${WIDTH / 2}" y="${y}" font-size="${fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${escapeXml(l)}</text>`;
      y += lineHeight;
      return tspan;
    })
    .join('\n  ');

  const brand = p.brand
    ? `<text x="${WIDTH / 2}" y="96" font-size="30" fill="#ffffff" fill-opacity="0.85" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">${escapeXml(p.brand.toUpperCase())}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(p.name)}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${bg}"/>
  <rect x="20" y="20" width="${WIDTH - 40}" height="${HEIGHT - 40}" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2" rx="16"/>
  ${brand}
  ${nameTspans}
  <text x="${WIDTH / 2}" y="${HEIGHT - 66}" font-size="24" fill="#ffffff" fill-opacity="0.7" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${escapeXml(p.category)}</text>
  <text x="${WIDTH / 2}" y="${HEIGHT - 34}" font-size="20" fill="#ffffff" fill-opacity="0.5" text-anchor="middle" font-family="monospace">${escapeXml(p.sku)}</text>
</svg>
`;
}

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { isDeleted: false, images: { none: {} } },
    select: {
      id: true,
      sku: true,
      name: true,
      brand: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
    },
    orderBy: { sku: 'asc' },
  });

  if (products.length === 0) {
    logger.info('Every product already has an image — no placeholders needed.');
    return;
  }

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

  let created = 0;
  for (const p of products) {
    const category = p.category
      ? p.category.parent
        ? `${p.category.parent.name} › ${p.category.name}`
        : p.category.name
      : '';
    const filename = placeholderFilename(p.sku);
    const url = `/uploads/${filename}`;

    await writeFile(path.join(UPLOAD_DIR, filename), buildSvg({ sku: p.sku, name: p.name, brand: p.brand, category }), 'utf8');
    await prisma.productImage.create({
      data: { productId: p.id, url, altText: `${p.name} (placeholder)`, isPrimary: true, position: 0 },
    });
    created += 1;
  }

  logger.info(`Generated ${created} placeholder image(s).`);
}

main()
  .catch((err) => {
    logger.error({ err }, 'Placeholder generation failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
