import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';
import { assertTestDatabaseTarget } from '../src/db/test-target.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const loaded = dotenv.config({
  path: join(projectRoot, '.env.test.local'),
  override: true,
  quiet: true,
});

if (loaded.error || !loaded.parsed?.DATABASE_URL) {
  throw new Error('Test catalog seed requires DATABASE_URL in .env.test.local.');
}

const databaseUrl = loaded.parsed.DATABASE_URL;
assertTestDatabaseTarget(databaseUrl);

const seller = {
  id: 'f0a1b2c3-d4e5-4678-9012-3456789abcde',
  name: 'FurniKart Test Studio',
  slug: 'furnikart-test-studio',
  city: 'Jaipur',
  about: 'A small test collection of thoughtfully made furniture.',
  verified: false,
};

const products = [
  {
    id: 'aurelia-3-seater-fabric-sofa',
    slug: 'aurelia-3-seater-fabric-sofa',
    name: 'Aurelia Three-Seat Performance Linen Sofa',
    category: 'sofas',
    price: 34999,
    originalPrice: 46999,
    rating: 4.8,
    reviewCount: 12,
    description: 'A generous three-seat sofa with a solid frame, soft performance linen, and removable cushions for everyday living.',
    material: 'Fabric',
    colors: [
      { name: 'Forest green', hex: '#596756' },
      { name: 'Warm beige', hex: '#d8cdbd' },
    ],
    sizes: ['Standard'],
    images: ['/images/sofa.jpg'],
    dimensions: '210 W × 90 D × 82 H cm',
    stock: 8,
    badge: 'Test premium pick',
    tags: ['test-seed', 'premium'],
  },
  {
    id: 'bistro-4-seater-round-dining-table',
    slug: 'bistro-4-seater-round-dining-table',
    name: 'Bistro Round Four-Seat Dining Table',
    category: 'dining',
    price: 22999,
    originalPrice: 31999,
    rating: 4.7,
    reviewCount: 8,
    description: 'A compact round dining table in solid wood, designed for relaxed meals and easy conversation.',
    material: 'Solid wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/dining.jpg'],
    dimensions: '110 diameter × 75 H cm',
    stock: 6,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'acacia-wood-sun-lounger',
    slug: 'acacia-wood-sun-lounger',
    name: 'Acacia Fold-Flat Garden Lounger',
    category: 'outdoor',
    price: 17999,
    originalPrice: 24999,
    rating: 4.6,
    reviewCount: 5,
    description: 'A weather-ready acacia lounger with an adjustable back and a fold-flat frame for easy storage.',
    material: 'Solid wood',
    colors: [{ name: 'Natural acacia', hex: '#b77a4b' }],
    sizes: ['Standard'],
    images: ['/images/outdoor.jpg'],
    dimensions: '195 L × 65 W × 35 H cm',
    stock: 7,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'bunk-bed-for-kids-with-ladder',
    slug: 'bunk-bed-for-kids-with-ladder',
    name: 'Juniper Twin Bunk Bed with Ladder',
    category: 'beds',
    price: 29999,
    originalPrice: 41999,
    rating: 4.8,
    reviewCount: 9,
    description: 'A sturdy twin bunk bed with a fixed ladder, rounded edges, and a durable natural wood finish.',
    material: 'Solid wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/bed.jpg'],
    dimensions: '205 L × 100 W × 165 H cm',
    stock: 4,
    badge: 'Test collection',
    tags: ['test-seed', 'trending'],
  },
  {
    id: 'classic-2-door-solid-wood-almirah',
    slug: 'classic-2-door-solid-wood-almirah',
    name: 'Classic Two-Door Mango Wood Wardrobe',
    category: 'wardrobes',
    price: 32999,
    originalPrice: 45999,
    rating: 4.7,
    reviewCount: 7,
    description: 'A two-door wardrobe in solid mango wood with a full-length hanging rail and practical lower drawer.',
    material: 'Solid wood',
    colors: [{ name: 'Warm walnut', hex: '#79533b' }],
    sizes: ['Standard'],
    images: ['/images/wardrobe.jpg'],
    dimensions: '105 W × 58 D × 190 H cm',
    stock: 5,
    badge: 'Test collection',
    tags: ['test-seed', 'premium'],
  },
  {
    id: '30-pair-tall-shoe-storage-cabinet',
    slug: '30-pair-tall-shoe-storage-cabinet',
    name: 'Tall Entryway Shoe Cabinet',
    category: 'shoe-racks',
    price: 9999,
    originalPrice: 14999,
    rating: 4.5,
    reviewCount: 6,
    description: 'A slim entryway cabinet with ventilated shelves that keeps everyday footwear neatly out of sight.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/shoe.jpg'],
    dimensions: '80 W × 35 D × 120 H cm',
    stock: 9,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'elevate-electric-standing-desk',
    slug: 'elevate-electric-standing-desk',
    name: 'Aster Height-Adjustable Standing Desk',
    category: 'office',
    price: 38999,
    originalPrice: 51999,
    rating: 4.8,
    reviewCount: 6,
    description: 'A quiet electric standing desk with a broad oak-look worktop and simple sit-to-stand controls.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/desk.jpg'],
    dimensions: '140 W × 70 D × 72–120 H cm',
    stock: 5,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'modular-office-workstation-4-seater',
    slug: 'modular-office-workstation-4-seater',
    name: 'Harbor Four-Person Office Workstation',
    category: 'office',
    price: 62999,
    originalPrice: 82999,
    rating: 4.7,
    reviewCount: 4,
    description: 'A four-person shared workstation with individual desk spaces and a sturdy, easy-care finish.',
    material: 'Engineered wood',
    colors: [{ name: 'Warm oak', hex: '#b39474' }],
    sizes: ['Standard'],
    images: ['/images/desk.jpg'],
    dimensions: '240 W × 120 D × 75 H cm',
    stock: 3,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'scholar-study-table-with-bookshelf',
    slug: 'scholar-study-table-with-bookshelf',
    name: 'Scholar Study Desk with Book Shelves',
    category: 'study-tables',
    price: 12999,
    originalPrice: 17999,
    rating: 4.7,
    reviewCount: 5,
    description: 'A practical study desk with integrated shelves to keep books, stationery, and daily essentials close at hand.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/study.jpg'],
    dimensions: '120 W × 55 D × 150 H cm',
    stock: 7,
    badge: 'Test collection',
    tags: ['test-seed', 'trending'],
  },
  {
    id: 'wall-mounted-floating-study-desk',
    slug: 'wall-mounted-floating-study-desk',
    name: 'Morrow Wall-Mounted Writing Desk',
    category: 'study-tables',
    price: 7999,
    originalPrice: 11999,
    rating: 4.6,
    reviewCount: 3,
    description: 'A space-saving wall-mounted desk with a clean writing surface for a calm, compact work corner.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/study.jpg'],
    dimensions: '100 W × 45 D × 30 H cm',
    stock: 8,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'kashi-rocking-chair-in-sheesham',
    slug: 'kashi-rocking-chair-in-sheesham',
    name: 'Kashi Sheesham Wood Rocking Chair',
    category: 'chairs',
    price: 13499,
    originalPrice: 18999,
    rating: 4.8,
    reviewCount: 5,
    description: 'A gently curved sheesham rocking chair with a supportive back and a smooth hand-finished wood frame.',
    material: 'Solid wood',
    colors: [{ name: 'Warm walnut', hex: '#79533b' }],
    sizes: ['Standard'],
    images: ['/images/lounge.jpg'],
    dimensions: '65 W × 90 D × 105 H cm',
    stock: 4,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'luna-accent-armchair',
    slug: 'luna-accent-armchair',
    name: 'Luna Upholstered Accent Armchair',
    category: 'chairs',
    price: 10999,
    originalPrice: 15999,
    rating: 4.6,
    reviewCount: 4,
    description: 'A comfortable accent chair with soft upholstery, supportive arms, and a compact footprint for living spaces.',
    material: 'Fabric',
    colors: [{ name: 'Forest green', hex: '#596756' }],
    sizes: ['Standard'],
    images: ['/images/lounge.jpg'],
    dimensions: '72 W × 76 D × 82 H cm',
    stock: 6,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'lift-top-storage-coffee-table',
    slug: 'lift-top-storage-coffee-table',
    name: 'Lift-Top Coffee Table with Hidden Storage',
    category: 'coffee-tables',
    price: 13999,
    originalPrice: 19999,
    rating: 4.7,
    reviewCount: 6,
    description: 'A lift-top coffee table with a concealed storage compartment for a tidier, more flexible living room.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/coffee.jpg'],
    dimensions: '100 W × 55 D × 45 H cm',
    stock: 7,
    badge: 'Test collection',
    tags: ['test-seed', 'trending'],
  },
  {
    id: 'nest-of-3-wooden-side-tables',
    slug: 'nest-of-3-wooden-side-tables',
    name: 'Nest of Three Wooden Side Tables',
    category: 'coffee-tables',
    price: 6999,
    originalPrice: 9999,
    rating: 4.5,
    reviewCount: 3,
    description: 'Three solid-wood side tables that tuck neatly together and separate easily when guests arrive.',
    material: 'Solid wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/coffee.jpg'],
    dimensions: '50 W × 45 D × 50 H cm',
    stock: 9,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'horizon-wall-mounted-tv-unit',
    slug: 'horizon-wall-mounted-tv-unit',
    name: 'Horizon Floating TV Unit',
    category: 'tv-units',
    price: 17999,
    originalPrice: 24999,
    rating: 4.7,
    reviewCount: 4,
    description: 'A wall-mounted media unit with concealed cable access and tidy storage for living-room essentials.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/room.jpg'],
    dimensions: '150 W × 35 D × 32 H cm',
    stock: 6,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'vintage-solid-wood-tv-console',
    slug: 'vintage-solid-wood-tv-console',
    name: 'Heritage Solid Wood Media Console',
    category: 'tv-units',
    price: 23999,
    originalPrice: 32999,
    rating: 4.8,
    reviewCount: 5,
    description: 'A solid-wood media console with broad drawers and a timeless profile for a considered living room.',
    material: 'Solid wood',
    colors: [{ name: 'Warm walnut', hex: '#79533b' }],
    sizes: ['Standard'],
    images: ['/images/room.jpg'],
    dimensions: '160 W × 42 D × 55 H cm',
    stock: 4,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'cube-storage-bookshelf-9-compartment',
    slug: 'cube-storage-bookshelf-9-compartment',
    name: 'Nine-Cube Open Storage Bookshelf',
    category: 'bookshelves',
    price: 6499,
    originalPrice: 9499,
    rating: 4.6,
    reviewCount: 5,
    description: 'A nine-cube bookshelf for displaying favourite reads, baskets, and small decorative pieces.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/shelf.jpg'],
    dimensions: '105 W × 30 D × 105 H cm',
    stock: 8,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'ladder-bookshelf-5-tier',
    slug: 'ladder-bookshelf-5-tier',
    name: 'Five-Tier Leaning Ladder Bookshelf',
    category: 'bookshelves',
    price: 7999,
    originalPrice: 11999,
    rating: 4.7,
    reviewCount: 4,
    description: 'A five-tier leaning shelf with open display space and a slim profile for a reading nook or study.',
    material: 'Solid wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/shelf.jpg'],
    dimensions: '60 W × 35 D × 180 H cm',
    stock: 5,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'haven-chest-of-5-drawers',
    slug: 'haven-chest-of-5-drawers',
    name: 'Haven Five-Drawer Storage Chest',
    category: 'storage',
    price: 16999,
    originalPrice: 23999,
    rating: 4.7,
    reviewCount: 4,
    description: 'A five-drawer chest that brings practical bedroom storage together with a clean, warm wood finish.',
    material: 'Engineered wood',
    colors: [{ name: 'Warm oak', hex: '#b39474' }],
    sizes: ['Standard'],
    images: ['/images/storage.jpg'],
    dimensions: '80 W × 42 D × 110 H cm',
    stock: 6,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
  {
    id: 'sideboard-cabinet-with-rattan-doors',
    slug: 'sideboard-cabinet-with-rattan-doors',
    name: 'Rattan-Door Sideboard Storage Cabinet',
    category: 'storage',
    price: 23999,
    originalPrice: 32999,
    rating: 4.8,
    reviewCount: 3,
    description: 'A versatile sideboard with woven-look door fronts and useful enclosed storage for dining or living spaces.',
    material: 'Engineered wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/storage.jpg'],
    dimensions: '140 W × 40 D × 82 H cm',
    stock: 4,
    badge: 'Test collection',
    tags: ['test-seed', 'trending'],
  },
  {
    id: 'kitchen-trolley-with-wheels',
    slug: 'kitchen-trolley-with-wheels',
    name: 'Rolling Kitchen Trolley with Shelves',
    category: 'kitchen',
    price: 8999,
    originalPrice: 12999,
    rating: 4.6,
    reviewCount: 4,
    description: 'A mobile kitchen trolley with open shelves and smooth-rolling wheels for flexible everyday storage.',
    material: 'Solid wood',
    colors: [{ name: 'Natural oak', hex: '#c5a47d' }],
    sizes: ['Standard'],
    images: ['/images/kitchen.jpg'],
    dimensions: '75 W × 40 D × 85 H cm',
    stock: 7,
    badge: 'Test collection',
    tags: ['test-seed', 'new'],
  },
  {
    id: 'modular-kitchen-base-cabinet-set',
    slug: 'modular-kitchen-base-cabinet-set',
    name: 'Modular Kitchen Base Cabinet Set',
    category: 'kitchen',
    price: 34999,
    originalPrice: 47999,
    rating: 4.7,
    reviewCount: 3,
    description: 'A coordinated base cabinet set with practical cupboard storage and a durable finish for a hardworking kitchen.',
    material: 'Engineered wood',
    colors: [{ name: 'Warm oak', hex: '#b39474' }],
    sizes: ['Standard'],
    images: ['/images/kitchen.jpg'],
    dimensions: '180 W × 60 D × 85 H cm',
    stock: 3,
    badge: 'Test collection',
    tags: ['test-seed', 'popular'],
  },
];

const liveCatalog = JSON.parse(await readFile(join(projectRoot, 'live-catalog.json'), 'utf8'));
const liveCatalogSlugs = new Set(liveCatalog.map((product) => product.Slug));
const unlistedSlugs = products.filter((product) => !liveCatalogSlugs.has(product.slug)).map((product) => product.slug);
if (unlistedSlugs.length) {
  throw new Error(`Test seed products are not in live-catalog.json: ${unlistedSlugs.join(', ')}.`);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function assertSame(actual, expected, fields, label) {
  const mismatches = fields.filter((field) => {
    const actualValue = actual[field];
    const expectedValue = expected[field];
    if (Array.isArray(expectedValue) || (expectedValue && typeof expectedValue === 'object')) {
      return stableJson(actualValue) !== stableJson(expectedValue);
    }
    return actualValue !== expectedValue;
  });
  if (mismatches.length) {
    throw new Error(`Existing ${label} differs from the deterministic test seed (${mismatches.join(', ')}).`);
  }
}

const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 8000 });
let transactionStarted = false;

try {
  await client.connect();
  await client.query('BEGIN');
  transactionStarted = true;

  await client.query(
    `INSERT INTO public.sellers (id, name, slug, city, about, verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [seller.id, seller.name, seller.slug, seller.city, seller.about, seller.verified],
  );

  const sellerResult = await client.query(
    `SELECT id, name, slug, city, about, verified, user_id
     FROM public.sellers WHERE id = $1`,
    [seller.id],
  );
  if (sellerResult.rowCount !== 1) throw new Error('Test seller could not be verified.');
  assertSame(sellerResult.rows[0], seller, ['id', 'name', 'slug', 'city', 'about', 'verified'], 'seller');
  if (sellerResult.rows[0].user_id !== null) throw new Error('Test seller unexpectedly references an application user.');

  let insertedProducts = 0;
  const productColumns = [
    'id', 'slug', 'name', 'seller_id', 'seller_name', 'category', 'price', 'original_price',
    'rating', 'review_count', 'description', 'material', 'colors', 'sizes', 'images', 'dimensions',
    'stock', 'badge', 'tags',
  ];
  const productSql = `INSERT INTO public.products
    (${productColumns.join(', ')})
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18, $19::jsonb)
    ON CONFLICT (id) DO NOTHING`;

  for (const product of products) {
    const values = [
      product.id,
      product.slug,
      product.name,
      seller.id,
      seller.name,
      product.category,
      product.price,
      product.originalPrice,
      product.rating,
      product.reviewCount,
      product.description,
      product.material,
      JSON.stringify(product.colors),
      JSON.stringify(product.sizes),
      JSON.stringify(product.images),
      product.dimensions,
      product.stock,
      product.badge,
      JSON.stringify(product.tags),
    ];
    const insertResult = await client.query(productSql, values);
    insertedProducts += insertResult.rowCount ?? 0;

    const existingResult = await client.query(
      `SELECT ${productColumns.join(', ')}
       FROM public.products WHERE id = $1`,
      [product.id],
    );
    if (existingResult.rowCount !== 1) throw new Error(`Test product ${product.slug} could not be verified.`);
    const expected = {
      ...product,
      seller_id: seller.id,
      seller_name: seller.name,
      original_price: product.originalPrice,
      review_count: product.reviewCount,
    };
    assertSame(existingResult.rows[0], expected, productColumns, `product ${product.slug}`);
  }

  await client.query('COMMIT');
  transactionStarted = false;
  console.log(`Test catalog seed committed: ${insertedProducts} new products; ${products.length - insertedProducts} exact existing products reused.`);
} catch (error) {
  if (transactionStarted) await client.query('ROLLBACK').catch(() => {});
  const code = String(error?.code ?? 'none').replace(/[^A-Za-z0-9_.-]/g, '_');
  console.error(`Test catalog seed failed; any active transaction was rolled back. Error code: ${code}.`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
