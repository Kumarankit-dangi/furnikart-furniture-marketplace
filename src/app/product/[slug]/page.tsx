import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { getProduct, getProducts } from '@/lib/catalog';
import { ProductDetail } from '@/components/product-detail';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const product = await getProduct(slug);
  return { title: product?.name || 'Piece not found', description: product?.description, openGraph: { images: product?.images || [] } };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const product = await getProduct(slug); if (!product) notFound();
  const [catalog, productReviews] = await Promise.all([getProducts(), db.select().from(reviews).where(eq(reviews.productId, product.id)).orderBy(desc(reviews.createdAt))]);
  return <ProductDetail key={product.id} product={product} related={catalog.filter(p => p.id !== product.id).sort((a,b) => Number(b.category === product.category) - Number(a.category === product.category))} initialReviews={productReviews} />;
}
