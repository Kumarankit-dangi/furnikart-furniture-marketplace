import { db } from '@/db';
import { products, sellers, reviews } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import type { Product } from './types';
import liveCatalog from '../../live-catalog.json';

const liveCatalogSlugs = liveCatalog.map((product) => product.Slug);

export const categories = [
  { name: 'Sofas & Couches', slug: 'sofas', image: '/images/sofa.jpg', caption: 'Sink into something good' },
  { name: 'Beds & Mattresses', slug: 'beds', image: '/images/bed.jpg', caption: 'Your best sleep starts here' },
  { name: 'Wardrobes', slug: 'wardrobes', image: '/images/wardrobe.jpg', caption: 'A place for everything' },
  { name: 'Dining Tables', slug: 'dining', image: '/images/dining.jpg', caption: 'Make room for together' },
  { name: 'Office Furniture', slug: 'office', image: '/images/desk.jpg', caption: 'Work, in your element' },
  { name: 'Study Tables', slug: 'study-tables', image: '/images/desk.jpg', caption: 'Space for bright ideas' },
  { name: 'Chairs', slug: 'chairs', image: '/images/lounge.jpg', caption: 'Your favourite seat' },
  { name: 'Coffee Tables', slug: 'coffee-tables', image: '/images/coffee.jpg', caption: 'Bring your room together' },
  { name: 'TV Units', slug: 'tv-units', image: '/images/room.jpg', caption: 'A beautiful focal point' },
  { name: 'Bookshelves', slug: 'bookshelves', image: '/images/shelf.jpg', caption: 'Stories worth displaying' },
  { name: 'Shoe Racks', slug: 'shoe-racks', image: '/images/wardrobe.jpg', caption: 'A lovely welcome home' },
  { name: 'Storage Furniture', slug: 'storage', image: '/images/shelf.jpg', caption: 'Less clutter, more calm' },
  { name: 'Outdoor Furniture', slug: 'outdoor', image: '/images/outdoor.jpg', caption: 'Take the comfort outside' },
  { name: 'Kitchen Furniture', slug: 'kitchen', image: '/images/kitchen.jpg', caption: 'The heart of your home' },
];
const sellerData = [
  { id: 'a1b2c3d4-1111-4111-8111-111111111111', name: 'Urban Nest', slug: 'urban-nest', city: 'Bengaluru', about: 'Modern silhouettes. Everyday comfort. Thoughtful furniture designed for the way India lives.' },
  { id: 'a1b2c3d4-2222-4222-8222-222222222222', name: 'The Wood Studio', slug: 'the-wood-studio', city: 'Jaipur', about: 'Solid wood, honest craftsmanship, and timeless forms. Made by hand and made to last.' },
  { id: 'a1b2c3d4-3333-4333-8333-333333333333', name: 'Craft & Co.', slug: 'craft-and-co', city: 'Jodhpur', about: 'Natural materials and beautifully considered details, from our family workshop to your home.' },
  { id: 'a1b2c3d4-4444-4444-8444-444444444444', name: 'Ergo Living', slug: 'ergo-living', city: 'Pune', about: 'Better workdays begin with a better workspace. Beautiful, ergonomic essentials for home and office.' },
];
const natural = [{ name: 'Natural oak', hex: '#c5a47d' }, { name: 'Walnut', hex: '#79533b' }, { name: 'Dark ash', hex: '#4b443d' }];
const fabric = [{ name: 'Forest green', hex: '#596756' }, { name: 'Warm beige', hex: '#d8cdbd' }, { name: 'Charcoal', hex: '#55534f' }];
const specs = [
  ['oslo-3-seater-sofa','Oslo 3-Seater Sofa','sofas',24999,34999,'sofa',0, 'Fabric','Bestseller','180 W × 85 D × 78 H cm'],
  ['luna-solid-wood-bed','Luna Solid Wood Bed','beds',22999,32999,'bed',1,'Solid wood','Bestseller','205 L × 165 W × 95 H cm'],
  ['arlo-lounge-chair','Arlo Lounge Chair','chairs',8999,14999,'lounge',2,'Solid wood','Bestseller','72 W × 76 D × 80 H cm'],
  ['terra-4-seater-dining-set','Terra 4-Seater Dining Set','dining',26999,38999,'dining',1,'Solid wood','Bestseller','120 L × 80 W × 76 H cm'],
  ['sienna-coffee-table','Sienna Coffee Table','coffee-tables',6499,9999,'coffee',2,'Solid wood','New arrival','100 W × 50 D × 42 H cm'],
  ['nook-study-desk','Nook Study Desk','study-tables',7999,11999,'desk',3,'Engineered wood','New arrival','120 W × 60 D × 75 H cm'],
  ['haven-wardrobe','Haven 3-Door Wardrobe','wardrobes',18999,26999,'wardrobe',1,'Engineered wood','New arrival','135 W × 55 D × 190 H cm'],
  ['milo-2-seater-sofa','Milo 2-Seater Sofa','sofas',16999,24999,'sofa-light',0,'Fabric','New arrival','145 W × 80 D × 78 H cm'],
  ['aura-bed','Aura Queen Storage Bed','beds',29999,42999,'bedroom',1,'Solid wood','Trending','210 L × 165 W × 95 H cm'],
  ['fern-accent-chair','Fern Upholstered Accent Chair','chairs',11999,17999,'chair',2,'Fabric','Trending','68 W × 72 D × 83 H cm'],
  ['atlas-bookshelf','Atlas Open Bookshelf','bookshelves',5499,8999,'shelf',2,'Solid wood','Trending','80 W × 30 D × 180 H cm'],
  ['forma-tv-unit','Forma Oak TV Unit','tv-units',8999,13999,'room',0,'Engineered wood','Trending','150 W × 40 D × 48 H cm'],
  ['rue-dining-table','Rue 6-Seater Dining Set','dining',34999,49999,'dining',1,'Solid wood','Premium','180 L × 90 W × 76 H cm'],
  ['nova-desk','Nova Work-from-Home Desk','office',12999,18999,'desk',3,'Solid wood','Bestseller','140 W × 65 D × 75 H cm'],
  ['flex-ergonomic-chair','Flex Ergonomic Office Chair','office',9999,15999,'chair',3,'Mesh','Bestseller','65 W × 65 D × 118 H cm'],
  ['arch-shoe-cabinet','Arch Shoe Cabinet','shoe-racks',4499,6999,'wardrobe',2,'Engineered wood','','80 W × 35 D × 110 H cm'],
  ['oakside-cabinet','Oakside Storage Cabinet','storage',7499,10999,'shelf',1,'Solid wood','','90 W × 40 D × 85 H cm'],
  ['patio-lounge-set','Patio 2-Seater Outdoor Set','outdoor',15999,22999,'outdoor',0,'Solid wood','Premium','150 W × 80 D × 75 H cm'],
  ['isla-kitchen-island','Isla Kitchen Island','kitchen',13999,19999,'kitchen',2,'Solid wood','New arrival','110 W × 60 D × 90 H cm'],
  ['olive-side-table','Olive Round Side Table','coffee-tables',2999,4999,'coffee',2,'Solid wood','','45 W × 45 D × 50 H cm'],
  ['moss-velvet-sofa','Moss Velvet Sofa','sofas',32999,45999,'sofa-velvet',0,'Fabric','Premium','210 W × 90 D × 82 H cm'],
  ['slim-study-desk','Slim Compact Study Table','study-tables',3499,5999,'desk',3,'Engineered wood','','90 W × 45 D × 75 H cm'],
  ['serene-single-bed','Serene Single Bed','beds',11999,16999,'bedroom',1,'Engineered wood','','195 L × 95 W × 90 H cm'],
  ['lin-wooden-chair','Lin Solid Wood Chair','chairs',3999,5999,'lounge',2,'Solid wood','','58 W × 56 D × 80 H cm'],
] as const;
let seedPromise: Promise<void> | undefined;
export async function ensureCatalog() {
  if (!seedPromise) seedPromise = seed().catch((error) => { seedPromise = undefined; throw error; });
  return seedPromise;
}
async function seed() {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length) return;
  await db.insert(sellers).values(sellerData).onConflictDoNothing();
  const entries = specs.map((s, i) => ({
    id: s[0], slug: s[0], name: s[1], category: s[2], price: s[3], originalPrice: s[4],
    sellerId: sellerData[s[6]].id, sellerName: sellerData[s[6]].name,
    images: [`/images/${s[5]}.jpg`], material: s[7], badge: s[8], dimensions: s[9],
    rating: [4.8, 4.7, 4.9, 4.6][i % 4], reviewCount: [128, 96, 84, 112][i % 4],
    description: `Meet ${s[1]} — a thoughtful balance of beautiful design and everyday comfort. Crafted with carefully selected ${s[7].toLowerCase()} and a durable finish, this piece brings a warm, considered touch to your home. Designed for real life, with easy care, reliable construction, and the little details that make all the difference.`,
    colors: s[7] === 'Fabric' ? fabric : natural,
    sizes: s[2] === 'sofas' || s[2] === 'beds' ? ['Standard', 'Large'] : ['Standard'],
    stock: i === 3 ? 12 : 25 + (i % 5),
    tags: i < 4 ? ['bestseller'] : i < 8 ? ['new'] : i < 12 ? ['trending'] : i > 18 ? ['premium'] : ['popular'],
  }));
  await db.insert(products).values(entries).onConflictDoNothing();
  await db.insert(reviews).values([
    { id: 'b1b2c3d4-1111-4111-8111-111111111111', productId: 'oslo-3-seater-sofa', authorName: 'Ananya S.', rating: 5, title: 'Our living room finally feels like home', body: 'The fabric is lovely and the colour is exactly as shown. Delivered to our apartment in Bengaluru with assembly included. A really comfortable sofa for our family.', verified: true },
    { id: 'b1b2c3d4-2222-4222-8222-222222222222', productId: 'oslo-3-seater-sofa', authorName: 'Rohan M.', rating: 4, title: 'Beautiful design, great value', body: 'Solid build and very comfortable. We chose the forest green and it looks even better in person. The delivery team was helpful and on time.', verified: true },
    { id: 'b1b2c3d4-3333-4333-8333-333333333333', productId: 'arlo-lounge-chair', authorName: 'Priya K.', rating: 5, title: 'My new favourite reading corner', body: 'Such a beautiful, well-made chair. The wood finish is warm and the cushioning is just right. A small detail that has made a big difference to our home.', verified: true },
    { id: 'b1b2c3d4-4444-4444-8444-444444444444', productId: 'luna-solid-wood-bed', authorName: 'Vikram R.', rating: 5, title: 'Excellent quality for the price', body: 'The solid wood feels substantial and the finish is really nice. Assembly was quick and the team kept us updated throughout. Would recommend.', verified: true },
  ]).onConflictDoNothing();
}
export async function getProducts() {
  if (process.env.SEED_LEGACY_CATALOG === 'true') await ensureCatalog();
  return db.select().from(products).where(inArray(products.slug, liveCatalogSlugs)).orderBy(desc(products.createdAt), products.name);
}
export async function getProduct(slug: string) {
  if (process.env.SEED_LEGACY_CATALOG === 'true') await ensureCatalog();
  const [product] = await db.select().from(products).where(eq(products.slug, slug));
  return product;
}
