import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StoreProvider } from '@/components/store-provider';
import { Shell } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://furnikart.in'),
  title: { default: 'FurniKart — Make Every Corner Feel Like Home', template: '%s | FurniKart' },
  description: 'Discover beautifully made furniture for every room, every home, and every budget. Shop sofas, beds, dining sets and more, with free delivery across India. Make every corner feel like home.',
  applicationName: 'FurniKart',
  keywords: ['furniture India', 'FurniKart', 'sofas', 'beds', 'solid wood furniture', 'home furniture', 'office furniture'],
  openGraph: { title: 'FurniKart — Furniture That Fits Your Life', description: 'Thoughtfully designed furniture. For every room. For every chapter.', type: 'website', locale: 'en_IN', images: [{ url: '/images/room.jpg', width: 1600, height: 990 }] },
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en-IN"><body><StoreProvider><Shell>{children}</Shell></StoreProvider></body></html>;
}
