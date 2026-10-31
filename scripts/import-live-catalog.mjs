import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });

const { Pool } = pg;
const csvPath = path.resolve('furnikart-extracted-metadata.csv');
const jsonPath = path.resolve('live-catalog.json');
const imageRoot = path.resolve('public');
const expectedCount = 56;
const categoryMap = new Map([
  ['dining-tables', 'dining'],
  ['office-furniture', 'office'],
]);
const neutralColor = [{ name: 'Standard', hex: '#c5a47d' }];

function stableJson(value) {
  if (typeof value === 'string') {
    try { return stableJson(JSON.parse(value)); } catch { return JSON.stringify(value); }
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { values.push(value); value = ''; }
    else value += char;
  }
  values.push(value);
  return values;
}

function readProducts() {
  const lines = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, i) => [headers[i], value])));
}

function toAmount(value, field, slug) {
  const digits = value.replaceAll(',', '');
  if (!/^\d+$/.test(digits)) throw new Error(`Invalid ${field} for ${slug}.`);
  return Number(digits);
}

function validateArtifacts(rows, compactCatalog) {
  if (rows.length !== expectedCount || compactCatalog.length !== expectedCount) throw new Error('Expected exactly 56 CSV and JSON products.');
  const slugs = new Set();
  for (const row of rows) {
    if (!row.Slug || slugs.has(row.Slug)) throw new Error(`Missing or duplicate product slug: ${row.Slug || '(empty)'}`);
    slugs.add(row.Slug);
    const compact = compactCatalog.find((item) => item.Slug === row.Slug);
    if (!compact || compact.ProductName !== row.ProductName || compact.Seller !== row.Seller) throw new Error(`CSV/JSON mismatch for ${row.Slug}.`);
    for (const field of ['Category', 'ProductName', 'Seller', 'Rating', 'Reviews', 'LocalImagePath']) {
      if (!row[field]) throw new Error(`Missing ${field} for ${row.Slug}.`);
    }
    const imagePath = path.resolve(imageRoot, `.${row.LocalImagePath}`);
    if (!imagePath.startsWith(`${imageRoot}${path.sep}`) || !fs.existsSync(imagePath)) throw new Error(`Missing or unsafe image path for ${row.Slug}.`);
    const rating = Number(row.Rating);
    const reviewCount = Number(row.Reviews);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5 || !Number.isInteger(reviewCount) || reviewCount < 0) throw new Error(`Invalid rating/review count for ${row.Slug}.`);
  }
}

const sellers = [...new Set(readProducts().map((row) => row.Seller))].map((name) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
}));
if (new Set(sellers.map((seller) => seller.slug)).size !== sellers.length) throw new Error('Generated seller slugs are not unique.');
const csvProducts = readProducts();
const jsonProducts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
validateArtifacts(csvProducts, jsonProducts);

const products = csvProducts.map((row) => ({
  id: `furnikart-live-${createHash('sha256').update(`furnikart-live-catalog:${row.Slug}`).digest('hex')}`,
  slug: row.Slug,
  name: row.ProductName,
  sellerName: row.Seller,
  sellerSlug: sellers.find((seller) => seller.name === row.Seller).slug,
  category: categoryMap.get(row.Category) || row.Category,
  price: toAmount(row.Price, 'price', row.Slug),
  originalPrice: toAmount(row.OriginalPrice, 'original price', row.Slug),
  rating: Number(row.Rating),
  reviewCount: Number(row.Reviews),
  description: 'Additional product details were not available in the source catalog.',
  material: 'Not specified',
  colors: neutralColor,
  sizes: ['Standard'],
  images: [row.LocalImagePath],
  dimensions: 'Not specified',
  stock: 0,
  badge: '',
  tags: ['live-catalog'],
}));
if (new Set(products.map((product) => product.id)).size !== products.length) throw new Error('Generated product IDs are not unique.');

if (process.argv.includes('--preflight') || process.argv.includes('--dry-run') || process.argv.includes('--check-only')) {
  console.log(JSON.stringify({ status: 'preflight-passed', databaseConnection: false, products: products.length, sellers: sellers.length, productImages: new Set(products.flatMap((product) => product.images)).size }, null, 2));
  process.exit(0);
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slugList = products.map((product) => product.slug);
    const sellerSlugs = sellers.map((seller) => seller.slug);
    const sellerNames = sellers.map((seller) => seller.name);
    const existingSellers = await client.query(
      'SELECT id, name, slug FROM sellers WHERE slug = ANY($1::text[]) OR name = ANY($2::text[]) FOR UPDATE',
      [sellerSlugs, sellerNames],
    );
    const sellerBySlug = new Map();
    const missingSellers = [];
    for (const seller of sellers) {
      const bySlug = existingSellers.rows.filter((row) => row.slug === seller.slug);
      const byName = existingSellers.rows.filter((row) => row.name === seller.name);
      if (bySlug.length > 1 || byName.length > 1 || (bySlug.length && byName.length && bySlug[0].id !== byName[0].id)) {
        throw new Error(`Ambiguous existing seller match for ${seller.name}; no changes were committed.`);
      }
      const exact = bySlug[0] || byName[0];
      if (exact && (exact.name !== seller.name || exact.slug !== seller.slug)) {
        throw new Error(`Existing seller name/slug conflict for ${seller.name}; no changes were committed.`);
      }
      if (exact) sellerBySlug.set(seller.slug, exact);
      else missingSellers.push(seller);
    }

    for (const seller of missingSellers) {
      const inserted = await client.query(
        `INSERT INTO sellers (name, slug, city, about, verified)
         VALUES ($1, $2, 'Not specified', 'Seller listed in the live FurniKart catalog.', false)
         RETURNING id, name, slug`,
        [seller.name, seller.slug],
      );
      sellerBySlug.set(seller.slug, inserted.rows[0]);
    }
    if (sellerBySlug.size !== sellers.length) throw new Error('Seller resolution failed; no changes were committed.');

    const productIds = products.map((product) => product.id);
    const existingProducts = await client.query(
      'SELECT id, slug, name, seller_id, seller_name, category, price, original_price, rating, review_count, description, material, colors, sizes, images, dimensions, stock, badge, tags FROM products WHERE slug = ANY($1::text[]) OR id = ANY($2::text[]) FOR UPDATE',
      [slugList, productIds],
    );
    const newProducts = [];
    for (const incoming of products) {
      const matches = existingProducts.rows.filter((row) => row.slug === incoming.slug || row.id === incoming.id);
      if (!matches.length) { newProducts.push(incoming); continue; }
      const actual = matches.length === 1 ? matches[0] : undefined;
      const expectedSellerId = sellerBySlug.get(incoming.sellerSlug)?.id;
      const exact = actual && actual.id === incoming.id && actual.slug === incoming.slug
        && actual.name === incoming.name && actual.seller_id === expectedSellerId
        && actual.seller_name === incoming.sellerName && actual.category === incoming.category
        && actual.price === incoming.price && actual.original_price === incoming.originalPrice
        && Number(actual.rating) === incoming.rating && actual.review_count === incoming.reviewCount
        && actual.description === incoming.description && actual.material === incoming.material
        && stableJson(actual.colors) === stableJson(incoming.colors) && stableJson(actual.sizes) === stableJson(incoming.sizes)
        && stableJson(actual.images) === stableJson(incoming.images) && actual.dimensions === incoming.dimensions
        && actual.stock === incoming.stock && actual.badge === incoming.badge && stableJson(actual.tags) === stableJson(incoming.tags);
      if (!exact) throw new Error(`Product ID/slug conflict or non-exact existing match for ${incoming.slug}; no changes were committed.`);
    }

    for (const product of newProducts) {
      const seller = sellerBySlug.get(product.sellerSlug);
      await client.query(
        `INSERT INTO products
          (id, slug, name, seller_id, seller_name, category, price, original_price, rating, review_count,
           description, material, colors, sizes, images, dimensions, stock, badge, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19::jsonb)`,
        [product.id, product.slug, product.name, seller.id, product.sellerName, product.category,
          product.price, product.originalPrice, product.rating, product.reviewCount, product.description,
          product.material, JSON.stringify(product.colors), JSON.stringify(product.sizes), JSON.stringify(product.images),
          product.dimensions, product.stock, product.badge, JSON.stringify(product.tags)],
      );
    }

    const finalProducts = await client.query('SELECT id, slug, name, seller_id, seller_name, category, price, original_price, rating, review_count, description, material, colors, sizes, images, dimensions, stock, badge, tags FROM products WHERE slug = ANY($1::text[])', [slugList]);
    if (finalProducts.rowCount !== expectedCount) throw new Error(`Final product validation failed (${finalProducts.rowCount}/56); no changes were committed.`);
    const missingOrChanged = products.filter((incoming) => {
      const actual = finalProducts.rows.find((row) => row.slug === incoming.slug);
      return !actual || actual.id !== incoming.id || actual.name !== incoming.name || actual.seller_name !== incoming.sellerName
        || actual.category !== incoming.category || actual.price !== incoming.price || actual.original_price !== incoming.originalPrice
        || Number(actual.rating) !== incoming.rating || actual.review_count !== incoming.reviewCount
        || actual.description !== incoming.description
        || actual.material !== incoming.material || stableJson(actual.colors) !== stableJson(incoming.colors)
        || stableJson(actual.sizes) !== stableJson(incoming.sizes) || actual.dimensions !== incoming.dimensions
        || actual.stock !== incoming.stock || actual.badge !== incoming.badge
        || stableJson(actual.images) !== stableJson(incoming.images) || stableJson(actual.tags) !== stableJson(incoming.tags)
        || actual.seller_id !== sellerBySlug.get(incoming.sellerSlug)?.id;
    });
    if (missingOrChanged.length) throw new Error(`Final catalog differs on ${missingOrChanged.length} products; no changes were committed.`);

    await client.query('COMMIT');
    console.log(JSON.stringify({ status: 'committed', newSellers: missingSellers.length, newProducts: newProducts.length, totalLiveProducts: finalProducts.rowCount }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
