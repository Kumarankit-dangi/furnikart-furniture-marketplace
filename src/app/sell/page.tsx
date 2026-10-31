import type { Metadata } from 'next';
import { SellerStudio } from '@/components/seller';
export const metadata: Metadata = { title: 'A Lovely Home for Your Craft — Become a Seller' };
export default function SellerPage() { return <SellerStudio />; }
