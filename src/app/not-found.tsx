import Link from 'next/link';
import { ArrowRight, Armchair } from 'lucide-react';
export default function NotFound() { return <main id="main-content" className="container not-found"><span className="empty-icon"><Armchair size={37} strokeWidth={1.3} /></span><p className="eyebrow">404 · A LITTLE CHANGE OF PLANS</p><h1>This corner is still<br />coming together.</h1><p>We couldn’t find that page. But there are plenty of beautiful things waiting to come home with you.</p><Link href="/shop" className="btn btn-primary">Find a little inspiration<ArrowRight size={17} /></Link></main>; }
