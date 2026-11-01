'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Order, Product, StoreData } from '@/lib/types';
import { emptyStore } from '@/lib/types';

type Response = { success?: boolean; error?: string; message?: string; order?: Order };
type StoreContextValue = {
  data: StoreData; products: Product[]; loaded: boolean; busy: boolean;
  refresh: () => Promise<void>; action: (action: string, payload?: Record<string, unknown>) => Promise<Response>;
  addCart: (product: Product, color?: string, size?: string, quantity?: number, open?: boolean, material?: string) => Promise<boolean>;
  toggleWish: (productId: string) => Promise<void>;
  modal: 'auth' | 'location' | null; setModal: (modal: 'auth' | 'location' | null) => void;
  cartOpen: boolean; setCartOpen: (open: boolean) => void;
  toast: { message: string; type: 'success' | 'error' } | null;
  notify: (message: string, type?: 'success' | 'error') => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyStore);
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'auth' | 'location' | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<StoreContextValue['toast']>(null);
  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/store', { cache: 'no-store' });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error);
      setData(next); setProducts(next.products);
    } catch (error) { console.error(error); }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/store', { cache: 'no-store' });
        const next = await response.json();
        if (!response.ok) throw new Error(next.error);
        if (active) { setData(next); setProducts(next.products); }
      } catch (error) {
        if (active) console.error(error);
      } finally {
        if (active) setLoaded(true);
      }
    }
    void load();
    return () => { active = false; };
  }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 4500); return () => clearTimeout(timer); } }, [toast]);
  const action = useCallback(async (actionName: string, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const response = await fetch('/api/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: actionName, ...payload }) });
      const result: Response = await response.json();
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
      await refresh();
      if (result.message) notify(result.message);
      return result;
    } catch (error) { const message = error instanceof Error ? error.message : 'Please check your connection and try again.'; notify(message, 'error'); return { error: message }; }
    finally { setBusy(false); }
  }, [notify, refresh]);
  const addCart = useCallback(async (product: Product, color?: string, size?: string, quantity = 1, open = false, material?: string) => {
    const result = await action('cart-add', { productId: product.id, color: color || product.colors[0]?.name, size: size || product.sizes[0], material: material || product.material, quantity });
    if (!result.error && open) setCartOpen(true);
    return !result.error;
  }, [action]);
  const toggleWish = useCallback(async (productId: string) => { await action('wishlist', { productId }); }, [action]);
  return <StoreContext.Provider value={{ data, products, loaded, busy, refresh, action, addCart, toggleWish, modal, setModal, cartOpen, setCartOpen, toast, notify }}>{children}</StoreContext.Provider>;
}
export function useStore() { const store = useContext(StoreContext); if (!store) throw new Error('StoreProvider is required.'); return store; }
