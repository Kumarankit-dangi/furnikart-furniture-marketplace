import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getProducts } from '@/lib/catalog';
import { Catalog } from '@/components/catalog';
import { Loading } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Shop Furniture' };
export default async function ShopPage() { const products = await getProducts(); return <Suspense fallback={<Loading text="Finding your perfect piece…" />}><Catalog initialProducts={products} /></Suspense>; }
