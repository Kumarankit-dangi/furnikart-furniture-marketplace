'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, Armchair, X, Star, LoaderCircle, Package } from 'lucide-react';

export function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="FurniKart home"><span className="brand-mark"><Armchair size={27} strokeWidth={1.6} /></span><span className="brand-words">Furni<span>Kart</span><small>MAKE EVERY CORNER FEEL LIKE HOME.</small></span></Link>;
}
export function Photo({ src, alt, className = '', priority = false, sizes = '(max-width: 700px) 90vw, (max-width: 1100px) 50vw, 30vw' }: { src: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  return <div className={`photo ${className}`}><Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.startsWith('http')} onError={(event) => { const image = event.currentTarget; if (!image.src.endsWith('/images/room.jpg')) image.src = '/images/room.jpg'; }} /></div>;
}
export function SectionHeading({ eyebrow, title, subtitle, href, linkText = 'View all', children }: { eyebrow?: string; title: string; subtitle?: string; href?: string; linkText?: string; children?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{subtitle && <p className="section-subtitle">{subtitle}</p>}</div>{children || (href && <Link href={href} className="text-link">{linkText}<ArrowRight size={17} /></Link>)}</div>;
}
export function Stars({ rating = 5, small = false }: { rating?: number; small?: boolean }) { return <span className={`stars ${small ? 'stars-small' : ''}`} aria-label={`${rating} out of 5 stars`}>{[1,2,3,4,5].map(n => <Star key={n} size={small ? 12 : 16} fill={n <= Math.round(rating) ? 'currentColor' : 'none'} strokeWidth={1.5} />)}</span>; }
export function Modal({ title, children, onClose, wide = false, drawer = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; drawer?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab') {
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a,input,select,textarea,[tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className={`modal-backdrop ${drawer ? 'drawer-backdrop' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal-panel ${wide ? 'modal-wide' : ''} ${drawer ? 'drawer-panel' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={panel} tabIndex={-1}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} /></button></div>{children}</div></div>;
}
export function Loading({ text = 'Making room for your favourites…' }: { text?: string }) { return <div className="loading-state"><LoaderCircle className="spin" size={24} /><p>{text}</p></div>; }
export function EmptyState({ title, description, href = '/shop', label = 'Explore furniture', onAction }: { title: string; description: string; href?: string; label?: string; onAction?: () => void }) { return <div className="empty-state"><span className="empty-icon"><Package size={34} strokeWidth={1.4} /></span><h2>{title}</h2><p>{description}</p>{onAction ? <button onClick={onAction} className="btn btn-primary">{label}<ArrowRight size={17} /></button> : <Link href={href} className="btn btn-primary">{label}<ArrowRight size={17} /></Link>}</div>; }
export function deliveryDate() { const date = new Date(); date.setDate(date.getDate() + 7); return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
export function cityForPin(pin: string) { return ({ '560': 'Bengaluru', '400': 'Mumbai', '110': 'New Delhi', '600': 'Chennai', '500': 'Hyderabad', '411': 'Pune', '302': 'Jaipur', '700': 'Kolkata', '380': 'Ahmedabad', '682': 'Kochi' } as Record<string,string>)[pin.slice(0,3)] || 'Your location'; }
