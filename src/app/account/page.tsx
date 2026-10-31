import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Account } from '@/components/account';
import { Loading } from '@/components/ui';
export const metadata: Metadata = { title: 'Your Little Corner' };
export default function AccountPage() { return <Suspense fallback={<Loading />}><Account /></Suspense>; }
