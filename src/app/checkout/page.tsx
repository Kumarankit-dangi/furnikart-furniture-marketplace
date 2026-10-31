import type { Metadata } from 'next';
import { Checkout } from '@/components/checkout';
export const metadata: Metadata = { title: 'Almost Home — Checkout' };
export default function CheckoutPage() { return <Checkout />; }
