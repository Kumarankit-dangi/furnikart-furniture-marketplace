'use client';
import Link from 'next/link';
import { ArrowRight, RotateCcw } from 'lucide-react';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main-content" className="container not-found"><span className="empty-icon"><RotateCcw size={32} strokeWidth={1.3} /></span><p className="eyebrow">LET’S TAKE A LITTLE BREATHER</p><h1>Something didn’t<br />come together just yet.</h1><p>We’re sorry for the little interruption. Please try again, or explore a different corner of FurniKart.</p><button onClick={reset} className="btn btn-primary">Let’s try that again<ArrowRight size={17} /></button><Link href="/" className="text-link mt-5">Back to a lovely home</Link></main>; }
