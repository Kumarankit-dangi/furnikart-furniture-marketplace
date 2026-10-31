import { sql } from 'drizzle-orm';
import { pgTable, text, uuid, integer, real, timestamp, boolean, jsonb, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import type { Address, ColorOption, OrderItem } from '@/lib/types';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
});
export const sellers = pgTable('sellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  city: text('city').notNull(),
  about: text('about').notNull().default('Thoughtfully crafted furniture for everyday living.'),
  verified: boolean('verified').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('sellers_user_id_unique_idx').on(t.userId).where(sql`${t.userId} IS NOT NULL`)]);
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'cascade' }),
  sellerName: text('seller_name').notNull(),
  category: text('category').notNull(),
  price: integer('price').notNull(),
  originalPrice: integer('original_price').notNull(),
  rating: real('rating').notNull().default(4.7),
  reviewCount: integer('review_count').notNull().default(0),
  description: text('description').notNull(),
  material: text('material').notNull(),
  colors: jsonb('colors').$type<ColorOption[]>().notNull(),
  sizes: jsonb('sizes').$type<string[]>().notNull(),
  images: jsonb('images').$type<string[]>().notNull(),
  dimensions: text('dimensions').notNull(),
  stock: integer('stock').notNull().default(20),
  badge: text('badge').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  color: text('color').notNull().default('Natural'),
  size: text('size').notNull().default('Standard'),
  material: text('material').notNull().default(''),
  quantity: integer('quantity').notNull().default(1),
}, (t) => [uniqueIndex('cart_owner_variant').on(t.ownerId, t.productId, t.color, t.size, t.material)]);
export const wishlistItems = pgTable('wishlist_items', {
  ownerId: text('owner_id').notNull(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.ownerId, t.productId] })]);
export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull(),
  data: jsonb('data').$type<Address>().notNull(),
});
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: text('number').notNull().unique(),
  ownerId: text('owner_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  items: jsonb('items').$type<OrderItem[]>().notNull(),
  address: jsonb('address').$type<Address>().notNull(),
  email: text('email').notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  total: integer('total').notNull(),
  coupon: text('coupon'),
  status: text('status').notNull().default('Confirmed'),
  paymentMethod: text('payment_method').notNull().default('Cash on delivery'),
  tracking: text('tracking').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export const subscribers = pgTable('subscribers', {
  email: text('email').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
