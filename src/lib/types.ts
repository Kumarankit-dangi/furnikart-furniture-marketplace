export type ColorOption = { name: string; hex: string };
export type Address = { id?: string; label: string; fullName: string; phone: string; line1: string; line2: string; city: string; state: string; pin: string; isDefault?: boolean };
export type Product = {
  id: string; slug: string; name: string; sellerId: string; sellerName: string; category: string;
  price: number; originalPrice: number; rating: number; reviewCount: number; description: string;
  material: string; colors: ColorOption[]; sizes: string[]; images: string[]; dimensions: string;
  stock: number; badge: string; tags: string[]; createdAt: Date;
};
export type CartItem = { id: string; productId: string; ownerId: string; color: string; size: string; material?: string; quantity: number; product: Product };
export type User = { id: string; name: string; email: string; phone: string; role: string };
export type Seller = { id: string; name: string; slug: string; city: string; about: string; verified: boolean };
export type OrderItem = { productId: string; name: string; image: string; sellerId: string; color: string; size: string; material?: string; quantity: number; price: number; status?: string; sellerConfirmationRequired?: boolean; sellerConfirmedAt?: string };
export type Order = { id: string; number: string; ownerId: string; items: OrderItem[]; address: Address; email: string; subtotal: number; discount: number; total: number; coupon: string | null; status: string; paymentMethod: string; tracking: string; createdAt: string; };
export type Review = { id: string; productId: string; authorName: string; rating: number; title: string; body: string; verified: boolean; createdAt: Date };
export type StoreData = { user: User | null; cart: CartItem[]; wishlist: string[]; addresses: Address[]; orders: Order[]; seller: Seller | null; sellerOrders: Order[]; pin: string; };
export const money = (amount: number) => '₹' + Math.round(amount).toLocaleString('en-IN');
export const discount = (price: number, original: number) => original > price ? Math.round((1 - price / original) * 100) : 0;
export const emptyStore: StoreData = { user: null, cart: [], wishlist: [], addresses: [], orders: [], seller: null, sellerOrders: [], pin: '560001' };
export const liveCatalogTag = 'live-catalog';
export const pendingSellerConfirmation = 'Pending seller confirmation';
export function hasUntrackedInventory(product: Pick<Product, 'tags'>) { return product.tags.includes(liveCatalogTag); }
export function canPurchaseProduct(product: Pick<Product, 'stock' | 'tags'>) { return hasUntrackedInventory(product) || product.stock > 0; }
export function productQuantityLimit(product: Pick<Product, 'stock' | 'tags'>) { return hasUntrackedInventory(product) ? 10 : Math.min(product.stock, 10); }
export function materialOptions(product: Product) {
  const premium = ({ 'Solid wood': 'Premium teak', 'Fabric': 'Performance linen', 'Engineered wood': 'Natural oak veneer', 'Mesh': 'Premium mesh', 'Metal': 'Brushed steel' } as Record<string, string>)[product.material];
  return [{ name: product.material, extra: 0 }, ...(premium ? [{ name: premium, extra: Math.round(product.price * .15) }] : [])];
}
export function variantPrice(product: Product, size = 'Standard', material = product.material) {
  const option = materialOptions(product).find(m => m.name === material);
  return product.price + (option?.extra || 0) + (size === 'Large' ? Math.round(product.price * .12) : 0);
}
export function totals(cart: CartItem[], coupon = '') {
  const subtotal = cart.reduce((sum, item) => sum + variantPrice(item.product, item.size, item.material) * item.quantity, 0);
  let saving = 0;
  if (coupon === 'WELCOME10' && subtotal >= 10000) saving = Math.min(Math.round(subtotal * .1), 3000);
  if (coupon === 'HOME500' && subtotal >= 10000) saving = 500;
  return { subtotal, discount: saving, total: subtotal - saving, shipping: 0 };
}
