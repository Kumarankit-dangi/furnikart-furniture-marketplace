import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminSellerManagement } from '@/components/admin-sellers';
import { AdminAuthorizationError, requireAdmin } from '@/lib/admin-auth';

export const metadata: Metadata = { title: 'Admin · Seller accounts' };
export const dynamic = 'force-dynamic';

export default async function AdminSellersPage() {
  try { await requireAdmin(); }
  catch (error) {
    if (error instanceof AdminAuthorizationError) redirect('/');
    throw error;
  }
  return <AdminSellerManagement />;
}
