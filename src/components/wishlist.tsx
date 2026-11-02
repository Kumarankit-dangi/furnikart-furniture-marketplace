'use client';
import Link from 'next/link';
import { ArrowRight, Heart, ShoppingBag, Star, Trash2 } from 'lucide-react';
import { canPurchaseProduct, money, type Product } from '@/lib/types';
import { useStore } from './store-provider';
import { Loading, Photo } from './ui';

export function Wishlist() {
  const { data, products, loaded, busy, toggleWish, addCart } = useStore();
  const savedProducts = data.wishlist.map(id => products.find(product => product.id === id)).filter((product): product is Product => product !== undefined);

  if (!loaded) return <main id="main-content" className="container"><Loading text="Finding your saved pieces…" /></main>;

  return <main id="main-content" className="container wishlist-page">
    <header className="wishlist-heading">
      <div><p className="eyebrow">YOUR LITTLE COLLECTION</p><h1>Wishlist</h1><p>{savedProducts.length} {savedProducts.length === 1 ? 'saved piece' : 'saved pieces'}</p></div>
      <Heart size={30} strokeWidth={1.3} aria-hidden="true" />
    </header>
    {savedProducts.length ? <div className="wishlist-grid">
      {savedProducts.map((product, index) => <article className="wishlist-item" key={product.id}>
        <Link href={`/product/${product.slug}`} className="wishlist-item-image" aria-label={`View ${product.name}`}><Photo src={product.images[0]} alt={product.name} priority={index === 0} sizes="(max-width: 760px) 30vw, 150px" /></Link>
        <div className="wishlist-item-content">
          <div className="wishlist-item-heading">
            <div><p>{product.category}</p><Link href={`/product/${product.slug}`}><h2>{product.name}</h2></Link></div>
            <button className="wishlist-remove" onClick={() => void toggleWish(product.id)} disabled={busy} aria-label={`Remove ${product.name} from wishlist`}><Trash2 size={17} /></button>
          </div>
          <div className="wishlist-rating" aria-label={`${product.rating.toFixed(1)} out of 5 stars, ${product.reviewCount} reviews`}><Star size={14} fill="currentColor" />{product.rating.toFixed(1)} <span>({product.reviewCount})</span></div>
          <strong className="wishlist-price">{money(product.price)}</strong>
          <div className="wishlist-item-actions">
            <button className="btn btn-primary" onClick={() => void addCart(product, undefined, undefined, 1, true)} disabled={busy || !canPurchaseProduct(product)}><ShoppingBag size={16} />{canPurchaseProduct(product) ? 'Add to bag' : 'Sold out'}</button>
            <Link href={`/product/${product.slug}`} className="btn btn-outline"><ArrowRight size={15} />View piece</Link>
          </div>
        </div>
      </article>)}
    </div> : <section className="wishlist-empty">
      <span className="wishlist-empty-icon"><Heart size={32} strokeWidth={1.3} /></span>
      <h2>Your favourites will feel at home here.</h2>
      <p>Tap the heart on any piece you love. We’ll keep it here, ready for another look.</p>
      <Link href="/shop" className="btn btn-primary">Find something lovely<ArrowRight size={16} /></Link>
    </section>}
  </main>;
}
