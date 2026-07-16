/** Convert a display name to a URL-safe slug. */
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // strip combining diacritic marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
