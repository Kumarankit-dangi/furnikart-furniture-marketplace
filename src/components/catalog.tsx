'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, GitCompareArrows, SearchX, SlidersHorizontal, X, Check } from 'lucide-react';
import { categories } from '@/lib/catalog-data';
import { money, type Product } from '@/lib/types';
import { useStore } from './store-provider';
import { ProductCard } from './product-card';
import { Loading, Modal, Photo } from './ui';

export function Catalog({ initialProducts }: { initialProducts: Product[] }) {
  const params = useSearchParams();
  const { products: storeProducts, loaded, notify } = useStore();
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [collection, setCollection] = useState(params.get('collection') || '');
  const [seller, setSeller] = useState(params.get('seller') || '');
  const [sort, setSort] = useState(params.get('sort') || 'recommended');
  const [min, setMin] = useState(Number(params.get('min')) || 0);
  const [max, setMax] = useState(Number(params.get('max')) || 100000);
  const [materials, setMaterials] = useState<string[]>([]);
  const [topRated, setTopRated] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const searchString = params.toString();
  useEffect(() => { const next = new URLSearchParams(searchString); setQuery(next.get('q') || ''); setCategory(next.get('category') || ''); setCollection(next.get('collection') || ''); setSeller(next.get('seller') || ''); setSort(next.get('sort') || 'recommended'); setMin(Number(next.get('min')) || 0); setMax(Number(next.get('max')) || 100000); }, [searchString]);
  const products = loaded ? storeProducts : initialProducts;
  const categoryName = categories.find(c => c.slug === category)?.name;
  const collectionNames: Record<string,string> = { new: 'Fresh arrivals. New favourites.', bestsellers: 'Bestsellers, for a reason.', trending: 'The pieces everyone is loving.', deals: 'Beautiful furniture. Even better prices.', premium: 'Considered pieces. Lasting beauty.', 'small-space': 'Small space. Big possibilities.' };
  const title = query ? `A little search for “${query}”.` : seller ? `Beautiful things by ${seller}.` : categoryName || collectionNames[collection] || 'Find your next favourite piece.';
  const result = useMemo(() => {
    let list = products.filter(product => {
      const search = `${product.name} ${product.sellerName} ${product.material} ${product.description} ${categories.find(c => c.slug === product.category)?.name || ''}`.toLowerCase();
      if (query && !query.toLowerCase().split(/\s+/).every(word => search.includes(word))) return false;
      if (category && product.category !== category) return false;
      if (seller && product.sellerName !== seller) return false;
      if (product.price < min || product.price > max) return false;
      if (materials.length && !materials.includes(product.material)) return false;
      if (topRated && product.rating < 4.5) return false;
      if (inStock && !product.stock) return false;
      if (collection === 'new' && !product.tags.includes('new')) return false;
      if (collection === 'bestsellers' && !product.tags.includes('bestseller')) return false;
      if (collection === 'trending' && !product.tags.includes('trending')) return false;
      if (collection === 'deals' && product.originalPrice <= product.price) return false;
      if (collection === 'premium' && !product.tags.includes('premium') && product.price < 30000) return false;
      if (collection === 'small-space' && !['coffee-tables', 'chairs', 'study-tables', 'storage', 'shoe-racks'].includes(product.category)) return false;
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a,b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a,b) => b.price - a.price);
    else if (sort === 'rating') list = [...list].sort((a,b) => b.rating - a.rating);
    else if (sort === 'new') list = [...list].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === 'discount') list = [...list].sort((a,b) => (1 - b.price / b.originalPrice) - (1 - a.price / a.originalPrice));
    return list;
  }, [products, query, category, seller, min, max, materials, topRated, inStock, collection, sort]);
  function clear() { setQuery(''); setCategory(''); setSeller(''); setCollection(''); setMin(0); setMax(100000); setMaterials([]); setTopRated(false); setInStock(false); setSort('recommended'); }
  function toggleCompare(id: string) { if (compare.includes(id)) setCompare(compare.filter(i => i !== id)); else if (compare.length < 3) setCompare([...compare, id]); else notify('You can compare up to 3 pieces at a time. Remove one to add another.', 'error'); }
  return <main id="main-content"><section className="page-heading"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link><ChevronRight /><span>Furniture</span>{categoryName && <><ChevronRight /><span>{categoryName}</span></>}</div><h1>{title}</h1><p>Thoughtfully made. Beautifully priced. Ready to feel like home.</p></div></section><div className="container"><div className="catalog-toolbar"><p><strong>{result.length}</strong> lovely pieces to make your own</p><div><button className="mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><SlidersHorizontal size={14} />Filters</button><button className="mobile-filter-button" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}><GitCompareArrows size={14} />Compare ({compare.length})</button><label className="catalog-sort">Sort by<select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort products"><option value="recommended">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Top rated</option><option value="new">Newest first</option><option value="discount">Biggest savings</option></select></label></div></div><div className="catalog-body"><aside className={`filters ${filtersOpen ? 'filters-open' : ''}`} aria-label="Filter furniture"><div className="filters-heading"><h3>A little more specific.</h3><button onClick={clear}>Reset</button></div><div className="filter-group"><h4>Shop by category</h4><label className="filter-option"><input type="radio" name="category-filter" checked={!category} onChange={() => setCategory('')} />All furniture</label>{categories.map(c => <label className="filter-option" key={c.slug}><input type="radio" name="category-filter" checked={category === c.slug} onChange={() => setCategory(c.slug)} />{c.name}<span>{products.filter(p => p.category === c.slug).length}</span></label>)}</div><div className="filter-group"><h4>Your budget</h4><input className="price-range" aria-label="Maximum price" type="range" min={1000} max={100000} step={1000} value={max} onChange={e => { setMax(Number(e.target.value)); }} /><div className="price-labels"><span>₹0</span><span>{money(max)}</span></div><label className="filter-option"><span>Minimum price</span><select aria-label="Minimum price" value={min} onChange={e => setMin(Number(e.target.value))}><option value={0}>No minimum</option><option value={10000}>₹10,000</option><option value={25000}>₹25,000</option><option value={50000}>₹50,000</option></select></label></div><div className="filter-group"><h4>Made of good things</h4>{['Solid wood','Fabric','Engineered wood','Mesh'].map(material => <label className="filter-option" key={material}><input type="checkbox" checked={materials.includes(material)} onChange={() => setMaterials(materials.includes(material) ? materials.filter(m => m !== material) : [...materials, material])} />{material}</label>)}</div><div className="filter-group"><h4>A few more details</h4><label className="filter-option"><input type="checkbox" checked={topRated} onChange={e => setTopRated(e.target.checked)} />Rated 4.5 stars & above</label><label className="filter-option"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} />In stock & ready to ship</label></div><div className="filter-group"><button className="btn btn-outline btn-full btn-small" disabled={compare.length < 2} onClick={() => setCompareOpen(true)}><GitCompareArrows size={15} />Compare ({compare.length}/3)</button></div></aside><section className="catalog-results" aria-label="Furniture results">{(category || query || seller || collection || min > 0 || max < 100000) && <div className="catalog-chips">{category && <button onClick={() => setCategory('')}>{categoryName}<X size={11} /></button>}{query && <button onClick={() => setQuery('')}>Search: {query}<X size={11} /></button>}{seller && <button onClick={() => setSeller('')}>{seller}<X size={11} /></button>}{collection && <button onClick={() => setCollection('')}>{collection.replace('-', ' ')}<X size={11} /></button>}{max < 100000 && <button onClick={() => { setMax(100000); setMin(0); }}>Budget: {money(min)}–{money(max)}<X size={11} /></button>}<button onClick={clear}>Clear all</button></div>}{!result.length ? <div className="catalog-no-results"><SearchX size={42} strokeWidth={1.2} /><h2>No pieces found, just yet.</h2><p>Try a different search or loosen a filter. Your perfect piece might be one little click away.</p><button className="btn btn-primary" onClick={clear}>Explore all furniture<ArrowRight size={16} /></button></div> : <div className="product-grid">{result.map((product, i) => <div className="catalog-product-wrap" key={product.id}><ProductCard product={product} index={i} /><label className="compare-option"><input type="checkbox" checked={compare.includes(product.id)} onChange={() => toggleCompare(product.id)} />Compare this piece</label></div>)}</div>}<p className="catalog-bottom-note">Thoughtfully selected. Independently made. Delivered with care.</p></section></div></div>{compareOpen && <Modal title="A little side-by-side thinking." onClose={() => setCompareOpen(false)} wide><p className="page-subtitle">Compare the details. Find the piece that feels right for you.</p><div className="comparison-table"><div className="comparison-column comparison-label"><span>THE DETAILS</span><p>Price</p><p>Made from</p><p>Dimensions</p><p>Rating</p><p>Colours</p><p>Availability</p></div>{products.filter(p => compare.includes(p.id)).map(p => <div className="comparison-column" key={p.id}><div className="compare-product-image"><Photo src={p.images[0]} alt={p.name} /></div><h3>{p.name}</h3><p>{money(p.price)}</p><p>{p.material}</p><p>{p.dimensions}</p><p>{p.rating} / 5 ({p.reviewCount})</p><p>{p.colors.map(c => c.name).join(', ')}</p><p className="green">{p.stock ? `${p.stock} in stock` : 'Out of stock'}</p><Link className="btn btn-primary btn-small" href={`/product/${p.slug}`} onClick={() => setCompareOpen(false)}>Take a closer look<ArrowRight size={13} /></Link></div>)}</div></Modal>}</main>;
}
