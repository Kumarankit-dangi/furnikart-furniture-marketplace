'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, CreditCard, LoaderCircle, LockKeyhole, MapPin, PackageCheck, Plus, ShieldCheck, Tag, Trash2, Truck, X } from 'lucide-react';
import { hasUntrackedInventory, money, pendingSellerConfirmation, totals, variantPrice, type Address, type Order } from '@/lib/types';
import { useStore } from './store-provider';
import { AddressForm } from './address-form';
import { EmptyState, Loading, Photo } from './ui';

export function Checkout() {
  const { data, loaded, busy, action, notify } = useStore();
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const email = emailOverride ?? data.user?.email ?? '';
  const [selected, setSelected] = useState('');
  const selectedAddress = data.addresses.find(address => address.id === selected)
    || data.addresses.find(address => address.isDefault)
    || data.addresses[data.addresses.length - 1];
  const selectedAddressId = selectedAddress?.id || '';
  const [addingAddress, setAddingAddress] = useState(false);
  const adding = !data.addresses.length || addingAddress;
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const price = totals(data.cart, coupon);
  const hasUntrackedCart = data.cart.some(item => hasUntrackedInventory(item.product));
  function applyCoupon() { const code = couponInput.trim().toUpperCase(); setCouponError(''); if (!['WELCOME10', 'HOME500'].includes(code)) { setCouponError('That code doesn’t look right. Try WELCOME10 or HOME500.'); return; } if (price.subtotal < 10000) { setCouponError('This offer starts on orders of ₹10,000 or more.'); return; } if (code === 'WELCOME10' && data.orders.length) { setCouponError('WELCOME10 is for your first order. HOME500 is here for you instead.'); return; } setCoupon(code); notify(`A little saving, just for you. ${code} applied.`); }
  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = selectedAddress;
    if (!address || adding) { notify('Please choose or save a delivery address before placing your order.', 'error'); return; }
    const result = await action('checkout', { address, email, paymentMethod: 'cod', coupon });
    if (result.order) { setConfirmed(result.order); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
  if (!loaded) return <Loading text="Getting your favourites ready for checkout…" />;
  if (confirmed) return <OrderConfirmation order={confirmed} />;
  if (!data.cart.length) return <main id="main-content" className="container"><EmptyState title="Something lovely is missing." description="Your bag is empty. Find a piece you’ll love coming home to, then we’ll take care of the rest." /></main>;
  return <main id="main-content" className="container"><div className="page-spacer"><div className="breadcrumbs"><Link href="/">Home</Link><ChevronRight /><Link href="/shop">Furniture</Link><ChevronRight /><span>Checkout</span></div><h1 className="page-title mt-5">Almost home.</h1><p className="page-subtitle">{hasUntrackedCart ? 'Submit your order request. The seller will confirm availability before fulfilment.' : 'A few little details, and your new favourites are on their way.'}</p><div className="checkout-grid"><div><section className="checkout-section"><div className="checkout-step-heading"><span className="step-number">1</span><h2>A place to call home.</h2></div><p>Choose where you’d like us to deliver your furniture.</p>{data.addresses.length > 0 && <div className="address-options">{data.addresses.map(address => <button key={address.id} className={`address-option ${selectedAddressId === address.id && !adding ? 'selected' : ''}`} onClick={() => { setSelected(address.id || ''); setAddingAddress(false); }} aria-pressed={selectedAddressId === address.id && !adding}><strong>{address.label}{address.isDefault && <span className="tag ml-2">Default</span>}</strong><p>{address.fullName}<br />{address.line1}<br />{address.line2 && <>{address.line2}<br /></>}{address.city}, {address.state} – {address.pin}</p><small>{address.phone}</small>{selectedAddressId === address.id && !adding && <CheckCircle2 size={17} />}</button>)}</div>}{!adding && <button className="add-address-button" onClick={() => setAddingAddress(true)}><Plus size={15} />Add a new delivery address</button>}{adding && <AddressForm onSaved={() => { setSelected(''); setAddingAddress(false); }} onCancel={data.addresses.length ? () => setAddingAddress(false) : undefined} />}</section><section className="checkout-section"><div className="checkout-step-heading"><span className="step-number">2</span><h2>So we can keep in touch.</h2></div><form id="checkout-contact-form" className="checkout-contact" onSubmit={placeOrder}><label>Email address<input name="email" type="email" required autoComplete="email" value={email} onChange={e => setEmailOverride(e.target.value)} placeholder="you@example.com" /></label><small className="muted text-xs">Your order number and delivery updates are always available in your account.</small></form></section><section className="checkout-section"><div className="checkout-step-heading"><span className="step-number">3</span><h2>A safe, simple way to pay.</h2></div><label className="payment-option"><input type="radio" name="payment" checked readOnly value="cod" /><span><strong>Cash on delivery</strong><small>{hasUntrackedCart ? 'No payment is due unless the seller confirms availability.' : 'Pay when your furniture arrives. No advance payment needed.'}</small></span><ShieldCheck size={20} className="ml-auto" /></label><p className="checkout-consent">By placing an order, you agree to our <Link href="/info/terms">Terms of Use</Link> and <Link href="/info/returns">Returns Policy</Link>. All prices include GST.</p></section></div><aside className="order-summary"><h2>Your little collection.</h2><div className="checkout-items">{data.cart.map(item => <div className="checkout-item" key={item.id}><Photo src={item.product.images[0]} alt={item.product.name} /><div><h4>{item.product.name}</h4><p>{item.color} · {item.size}{item.material && item.material !== item.product.material ? ` · ${item.material}` : ''}</p><p>Qty: {item.quantity}</p></div><strong>{money(variantPrice(item.product, item.size, item.material) * item.quantity)}</strong></div>)}</div><div className="coupon-form"><label><Tag size={16} />A little welcome code?</label>{coupon ? <div className="applied-coupon"><span><CheckCircle2 size={16} />{coupon} applied</span><button onClick={() => { setCoupon(''); setCouponInput(''); }} aria-label="Remove coupon"><X size={15} /></button></div> : <><div className="coupon-input-wrap"><input aria-label="Coupon code" value={couponInput} onChange={e => setCouponInput(e.target.value)} placeholder="Try WELCOME10" maxLength={30} /><button onClick={applyCoupon}>Apply</button></div><small>WELCOME10: 10% off, up to ₹3,000 on orders above ₹10,000.</small></>}{couponError && <p role="alert">{couponError}</p>}</div><div className="summary-row"><span>Subtotal</span><strong>{money(price.subtotal)}</strong></div><div className="summary-row"><span>Delivery & assembly</span><span className="green">On us</span></div>{price.discount > 0 && <div className="summary-row discount"><span>A little saving ({coupon})</span><span>−{money(price.discount)}</span></div>}<div className="summary-row total"><span>Total</span><strong>{money(price.total)}</strong></div><button className="btn btn-primary btn-full" type="submit" form="checkout-contact-form" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <>Place order · {money(price.total)}<ArrowRight size={17} /></>}</button><div className="secure-note"><LockKeyhole size={13} />Secure checkout · Pay only on delivery</div><div className="inline-notice mt-5"><Truck size={18} /><span>{hasUntrackedCart ? 'Delivery timing will be shared after seller confirmation.' : 'Free, careful delivery. Usually in 4–7 business days. Good things are worth a little wait.'}</span></div></aside></div></div></main>;
}

function OrderConfirmation({ order }: { order: Order }) {
  const pending = order.status === pendingSellerConfirmation;
  const cancelled = order.status === 'Cancelled';
  const sellerConfirmedDates = order.items
    .filter(item => item.sellerConfirmationRequired && item.status !== 'Cancelled' && item.sellerConfirmedAt)
    .map(item => new Date(item.sellerConfirmedAt as string).getTime())
    .filter(Number.isFinite);
  const delivery = new Date(sellerConfirmedDates.length ? Math.max(...sellerConfirmedDates) : order.createdAt);
  delivery.setDate(delivery.getDate() + 7);
  const showEstimate = !pending && !cancelled;
  return <main id="main-content" className="container checkout-confirmation">
    <div className="confirmation-icon"><PackageCheck size={45} strokeWidth={1.3} /></div>
    <p className="eyebrow">{pending ? 'ORDER REQUEST RECEIVED' : cancelled ? 'ORDER REQUEST CANCELLED' : 'YOUR NEXT CHAPTER STARTS HERE'}</p>
    <h1>{pending ? <>Waiting for<br /><em>seller confirmation.</em></> : cancelled ? <>The seller could not<br /><em>confirm this request.</em></> : <>A little happiness<br /><em>is on its way.</em></>}</h1>
    <p>{pending ? 'Your order request is with the seller. We’ll share fulfilment and delivery details after they confirm availability.' : cancelled ? 'This order request was cancelled before fulfilment. No payment was collected.' : `Your order is confirmed, ${order.address.fullName.split(' ')[0]}. We’re getting your new favourites ready for their home.`}</p>
    <div className="confirmation-details">
      <div><span>Order number</span><strong>{order.number}</strong></div>
      {showEstimate && <div><span>Expected delivery</span><strong>By {delivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</strong></div>}
      {pending && <div><span>Availability</span><strong>Awaiting seller confirmation</strong></div>}
      <div><span>Total · Pay on delivery</span><strong>{money(order.total)}</strong></div>
    </div>
    <div className="confirmation-address"><MapPin size={19} /><p><strong>{order.address.fullName}</strong><br />{order.address.line1}, {order.address.line2}<br />{order.address.city}, {order.address.state} – {order.address.pin}</p></div>
    <p className="confirmation-email">Order status and any seller updates are available in My Account.</p>
    <div className="confirmation-actions"><Link href="/account?tab=orders" className="btn btn-primary">Track my order<ArrowRight size={17} /></Link><Link href="/shop" className="btn btn-outline">A little more inspiration</Link></div>
    <div className="secure-note"><ShieldCheck size={14} />{pending ? 'No payment is due unless the seller confirms the request.' : 'Order securely placed · We’ll take care of the rest.'}</div>
  </main>;
}
