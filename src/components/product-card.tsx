'use client';
import Link from 'next/link';
import { Heart, Plus, Star, Truck, ArrowUpRight } from 'lucide-react';
import type { Product } from '@/lib/types';
import { canPurchaseProduct, discount, hasUntrackedInventory, money } from '@/lib/types';
import { useStore } from './store-provider';
import { Photo } from './ui';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { data, addCart, toggleWish, busy } = useStore();
  const saved = data.wishlist.includes(product.id);
  return <article className="product-card" style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}>
    <div className="product-media">
      <Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`} className="product-image-link"><Photo src={product.images[0]} alt={product.name} /></Link>
      {product.badge && <span className={`product-badge ${product.badge === 'New arrival' ? 'badge-green' : ''}`}>{product.badge}</span>}
      <button className={`wish-button ${saved ? 'is-saved' : ''}`} onClick={() => toggleWish(product.id)} disabled={busy} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} aria-pressed={saved}><Heart size={17} strokeWidth={1.6} fill={saved ? 'currentColor' : 'none'} /></button>
      <button className="quick-add" disabled={busy || !canPurchaseProduct(product)} onClick={() => addCart(product, undefined, undefined, 1, true)} aria-label={`Add ${product.name} to bag`}><Plus size={17} /><span>{canPurchaseProduct(product) ? 'Quick add' : 'Sold out'}</span></button>
      <span className="product-image-caption">{product.material}</span>
    </div>
    <div className="product-details"><div className="product-meta"><Link href={`/shop?seller=${encodeURIComponent(product.sellerName)}`}>{product.sellerName}</Link><span className="rating"><Star size={12} fill="currentColor" />{product.rating.toFixed(1)} <span>({product.reviewCount})</span></span></div><Link href={`/product/${product.slug}`} className="product-name">{product.name}</Link><div className="price-row"><strong>{money(product.price)}</strong>{product.originalPrice > product.price && <><del>{money(product.originalPrice)}</del><span>{discount(product.price, product.originalPrice)}% off</span></>}</div><div className="product-bottom"><span><Truck size={13} />{hasUntrackedInventory(product) ? 'Seller confirms availability and delivery' : 'Free delivery in 4–7 days'}</span><div className="swatches" aria-label={`${product.colors.length} available colours`}>{product.colors.slice(0,3).map(color => <span key={color.name} title={color.name} style={{ background: color.hex }} />)}</div></div></div>
  </article>;
}
export function CollectionCard({ image, label, title, href, className = '' }: { image: string; label: string; title: string; href: string; className?: string }) {
  return <Link href={href} className={`collection-card ${className}`}><Photo src={image} alt={title} /><div className="collection-shade" /><div className="collection-content"><p>{label}</p><h3>{title}</h3><span className="collection-link">Explore the collection<ArrowUpRight size={19} /></span></div><span className="collection-arrow"><ArrowUpRight size={22} /></span></Link>;
}
