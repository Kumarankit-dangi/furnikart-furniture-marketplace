-- Test-only initial schema for the disposable FurniKart database.
-- Includes the sellers index from production migration 0001; do not apply
-- production migration 0001 to the test database after this migration.
-- Use only with drizzle-test.config.ts and the drizzle-test/ migration stream.

CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '' NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'customer' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_unique UNIQUE (email)
);
--> statement-breakpoint

CREATE TABLE public.sessions (
  token text NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamp NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (token),
  CONSTRAINT sessions_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE public.sellers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  city text NOT NULL,
  about text DEFAULT 'Thoughtfully crafted furniture for everyday living.' NOT NULL,
  verified boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT sellers_pkey PRIMARY KEY (id),
  CONSTRAINT sellers_slug_unique UNIQUE (slug),
  CONSTRAINT sellers_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE public.products (
  id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  seller_id uuid NOT NULL,
  seller_name text NOT NULL,
  category text NOT NULL,
  price integer NOT NULL,
  original_price integer NOT NULL,
  rating real DEFAULT 4.7 NOT NULL,
  review_count integer DEFAULT 0 NOT NULL,
  description text NOT NULL,
  material text NOT NULL,
  colors jsonb NOT NULL,
  sizes jsonb NOT NULL,
  images jsonb NOT NULL,
  dimensions text NOT NULL,
  stock integer DEFAULT 20 NOT NULL,
  badge text DEFAULT '' NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_seller_id_sellers_id_fk
    FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE public.cart_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id text NOT NULL,
  product_id text NOT NULL,
  color text DEFAULT 'Natural' NOT NULL,
  size text DEFAULT 'Standard' NOT NULL,
  material text DEFAULT '' NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_product_id_products_id_fk
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE UNIQUE INDEX cart_owner_variant
  ON public.cart_items USING btree
    (owner_id, product_id, color, size, material);
--> statement-breakpoint

CREATE TABLE public.wishlist_items (
  owner_id text NOT NULL,
  product_id text NOT NULL,
  CONSTRAINT wishlist_items_pkey PRIMARY KEY (owner_id, product_id),
  CONSTRAINT wishlist_items_product_id_products_id_fk
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE public.addresses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id text NOT NULL,
  data jsonb NOT NULL,
  CONSTRAINT addresses_pkey PRIMARY KEY (id)
);
--> statement-breakpoint

CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  number text NOT NULL,
  owner_id text NOT NULL,
  user_id uuid,
  items jsonb NOT NULL,
  address jsonb NOT NULL,
  email text NOT NULL,
  subtotal integer NOT NULL,
  discount integer DEFAULT 0 NOT NULL,
  total integer NOT NULL,
  coupon text,
  status text DEFAULT 'Confirmed' NOT NULL,
  payment_method text DEFAULT 'Cash on delivery' NOT NULL,
  tracking text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_number_unique UNIQUE (number),
  CONSTRAINT orders_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE public.reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id text NOT NULL,
  user_id uuid,
  author_name text NOT NULL,
  rating integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_products_id_fk
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT reviews_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE public.subscribers (
  email text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT subscribers_pkey PRIMARY KEY (email)
);
--> statement-breakpoint

CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);
--> statement-breakpoint

CREATE UNIQUE INDEX sellers_user_id_unique_idx
  ON public.sellers USING btree (user_id)
  WHERE (user_id IS NOT NULL);
