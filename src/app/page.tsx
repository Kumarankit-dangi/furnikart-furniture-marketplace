import { getProducts } from '@/lib/catalog';
import { Home } from '@/components/home';

export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const products = await getProducts();
  return <Home initialProducts={products} />;
}
