# Product images — how to add them

This is your **inbox for product photos**. Drop image files here, run one
command, and they get linked to your products automatically.

## The two folders (don't mix them up)

| Folder | What it's for | Do you touch it? |
| --- | --- | --- |
| **`product-images/`** (this folder) | Where **you drop new photos** | ✅ Yes |
| **`uploads/`** | Where the app **stores & serves** images | ❌ No — the command manages it |

You never move anything into `uploads/` by hand. The command copies files there
for you.

---

## When you get a real photo — do this

Example: a real photo of the **TP-Link Archer C20** (SKU `ROU-TPL-002`).

1. **Rename** the file to the product's SKU → `ROU-TPL-002.jpg`
2. **Drop** it into this `product-images/` folder
3. **Run:**
   ```bash
   npm run db:images
   ```

That's it. The command copies it into `uploads/`, links it to the product, makes
it the product's main image, and **removes that product's name-placeholder
automatically**.

You can drop **many files at once** and run the command a single time — it links
them all and tells you how many it did, plus any filenames it couldn't match.

---

## How do I know what to name each file?

Run this once to list every product and the filename it expects:

```bash
npm run db:images:manifest
```

It writes **`manifest.csv`** in this folder (sku, name, brand, category,
suggested filename). Open it, find your product, and name your image to match
the `suggested_filename` column.

## How files are matched to products

By **filename** (the extension is ignored), in this order:

1. **Exact SKU** — `ROU-TPL-002.jpg` → product with SKU `ROU-TPL-002`
2. **Product name** — `tp-link-archer-c20.jpg` → "TP-Link Archer C20"
   (works only when that name is unique in the catalog)
3. **Extra images for one product** — add `__` and anything after it:
   `ROU-TPL-002__2.jpg`, `ROU-TPL-002__back.jpg`.
   Use `__` (double underscore), **not** `-`, because some SKUs already end in
   `-2` (e.g. `NET-CAT-001-2`).

Accepted file types: `.jpg` `.jpeg` `.png` `.webp` `.gif`

---

## Placeholders

Until a product has a real photo, it shows an auto-generated placeholder image
with its name on it. To (re)generate placeholders for any products that still
have no image:

```bash
npm run db:images:placeholders
```

You don't need to delete placeholders yourself — importing a real image
(`npm run db:images`) replaces that product's placeholder for you.

---

## Good to know

- **Re-running is safe.** `npm run db:images` only links files it hasn't linked
  before, so you can keep adding photos over time.
- **Subfolders are scanned**, so you can organise photos into folders if you like
  (e.g. `routers/`, `cctv/`).
- **Back up the `uploads/` folder** together with your database. The image files
  live there on disk, not inside the database — a database restore alone will not
  bring them back.
- This folder is git-ignored (except this README), because product photos are
  your own content. `manifest.csv` is regenerated any time with
  `npm run db:images:manifest`.
