import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { addresses, cartItems, messages, orders, products, reviews, sellers, sessions, subscribers, users, wishlistItems } from '@/db/schema';
import { getProducts } from '@/lib/catalog';
import { checkPassword, getViewer, hashPassword, setCookie } from '@/lib/session';
import { hasUntrackedInventory, pendingSellerConfirmation, materialOptions, variantPrice, type Address, type OrderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
class StoreError extends Error { constructor(message: string, public status = 400) { super(message); } }
function assert(condition: unknown, message: string, status = 400): asserts condition { if (!condition) throw new StoreError(message, status); }
function text(value: unknown, min = 1, max = 500) { assert(typeof value === 'string' && value.trim().length >= min && value.trim().length <= max, `Please enter a valid value (${min}–${max} characters).`); return value.trim(); }
function email(value: unknown) { const result = text(value, 5, 200).toLowerCase(); assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 'Please enter a valid email address.'); return result; }
function pin(value: unknown) { const result = String(value ?? '').trim(); assert(/^[1-9]\d{5}$/.test(result), 'Please enter a valid 6-digit Indian PIN code.'); return result; }
function phone(value: unknown) { const result = String(value ?? '').replace(/\s/g, ''); assert(/^(?:\+91)?[6-9]\d{9}$/.test(result), 'Please enter a valid 10-digit Indian mobile number.'); return result; }
function address(value: unknown): Address {
  const a = value as Address;
  assert(a && typeof a === 'object', 'Please provide a delivery address.');
  return { label: text(a.label, 1, 30), fullName: text(a.fullName, 2, 100), phone: phone(a.phone), line1: text(a.line1, 5, 200), line2: text(a.line2 || '', 0, 200), city: text(a.city, 2, 70), state: text(a.state, 2, 70), pin: pin(a.pin), isDefault: !!a.isDefault };
}
const originAllowed = (request: NextRequest) => {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return !origin || new URL(origin).host === host;
};

export async function GET() {
  try {
    const viewer = await getViewer();
    const [catalog, cart, wishlist, savedAddresses, myOrders, seller, allOrders] = await Promise.all([
      getProducts(),
      db.select({ ...getTableColumns(cartItems), product: getTableColumns(products) }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.ownerId, viewer.ownerId)),
      db.select({ productId: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.ownerId, viewer.ownerId)),
      db.select().from(addresses).where(eq(addresses.ownerId, viewer.ownerId)),
      db.select().from(orders).where(eq(orders.ownerId, viewer.ownerId)).orderBy(desc(orders.createdAt)),
      viewer.user ? db.select().from(sellers).where(eq(sellers.userId, viewer.user.id)).limit(1) : Promise.resolve([]),
      viewer.user ? db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200) : Promise.resolve([]),
    ]);
    const sellerOrders = seller[0] ? allOrders.filter(order => order.items.some(item => item.sellerId === seller[0].id)).map(order => ({ ...order, items: order.items.filter(item => item.sellerId === seller[0].id) })) : [];
    return NextResponse.json({ products: catalog, user: viewer.user ? { id: viewer.user.id, name: viewer.user.name, email: viewer.user.email, phone: viewer.user.phone, role: viewer.user.role } : null, cart, wishlist: wishlist.map(i => i.productId), addresses: savedAddresses.map(i => ({ ...i.data, id: i.id })), orders: myOrders, seller: seller[0] || null, sellerOrders, pin: viewer.pin });
  } catch (error) { console.error('Store read:', error); return NextResponse.json({ error: 'We couldn’t load your shopping bag. Please try again.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    assert(originAllowed(request), 'This request is not allowed.', 403);
    const body = await request.json();
    const { action } = body;
    const viewer = await getViewer();
    const ownerId = viewer.ownerId;
    let result: Record<string, unknown> = { success: true };
    if (action === 'set-pin') {
      const value = pin(body.pin);
      await setCookie('fk_pin', value, 365);
      result = { success: true, message: `Delivery is available to ${value}.` };
    } else if (action === 'signup' || action === 'login') {
      const mail = email(body.email);
      const password = text(body.password, 8, 128);
      let [user] = await db.select().from(users).where(eq(users.email, mail)).limit(1);
      if (action === 'signup') {
        assert(!user, 'An account with this email already exists. Try signing in.');
        const name = text(body.name, 2, 100);
        [user] = await db.insert(users).values({ name, email: mail, passwordHash: hashPassword(password) }).returning();
      } else {
        assert(user && checkPassword(password, user.passwordHash), 'That email and password don’t match. Please try again.', 401);
      }
      const token = randomBytes(32).toString('hex');
      await db.insert(sessions).values({ token, userId: user.id, expiresAt: new Date(Date.now() + 30 * 86400000) });
      await setCookie('fk_auth', token);
      if (!viewer.user) {
        const guestCart = await db.select().from(cartItems).where(eq(cartItems.ownerId, viewer.guest));
        for (const item of guestCart) {
          await db.insert(cartItems).values({ ownerId: user.id, productId: item.productId, color: item.color, size: item.size, material: item.material, quantity: item.quantity }).onConflictDoUpdate({ target: [cartItems.ownerId, cartItems.productId, cartItems.color, cartItems.size, cartItems.material], set: { quantity: sql`${cartItems.quantity} + ${item.quantity}` } });
          await db.delete(cartItems).where(eq(cartItems.id, item.id));
        }
        const guestWishes = await db.select().from(wishlistItems).where(eq(wishlistItems.ownerId, viewer.guest));
        for (const wish of guestWishes) await db.insert(wishlistItems).values({ ownerId: user.id, productId: wish.productId }).onConflictDoNothing();
        await db.delete(wishlistItems).where(eq(wishlistItems.ownerId, viewer.guest));
        await db.update(addresses).set({ ownerId: user.id }).where(eq(addresses.ownerId, viewer.guest));
        await db.update(orders).set({ ownerId: user.id, userId: user.id }).where(eq(orders.ownerId, viewer.guest));
      }
      result = { success: true, message: action === 'signup' ? 'Welcome home! Your FurniKart account is ready.' : `Welcome back, ${user.name.split(' ')[0]}!` };
    } else if (action === 'logout') {
      const jar = await cookies();
      const token = jar.get('fk_auth')?.value;
      if (token) await db.delete(sessions).where(eq(sessions.token, token));
      jar.delete('fk_auth');
      result = { message: 'You’ve been safely signed out.' };
    } else if (action === 'cart-add') {
      const [product] = await db.select().from(products).where(eq(products.id, String(body.productId)));
      assert(product, 'This product is no longer available.');
      const color = String(body.color || product.colors[0]?.name || 'Natural');
      const size = String(body.size || 'Standard');
      const quantity = Number(body.quantity || 1);
      const material = String(body.material || product.material);
      assert(materialOptions(product).some(m => m.name === material), 'Please choose an available material.');
      assert(product.colors.some(c => c.name === color) && product.sizes.includes(size), 'Please choose an available colour and size.');
      assert(Number.isInteger(quantity) && quantity > 0 && quantity <= 10, 'Please choose between 1 and 10 items.');
      const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.ownerId, ownerId), eq(cartItems.productId, product.id), eq(cartItems.color, color), eq(cartItems.size, size), eq(cartItems.material, material)));
      const requestedQuantity = (existing?.quantity || 0) + quantity;
      if (hasUntrackedInventory(product)) assert(requestedQuantity <= 10, 'Please keep order requests to 10 items per product.');
      else assert(requestedQuantity <= product.stock, 'There isn’t enough stock for that quantity.');
      await db.insert(cartItems).values({ ownerId, productId: product.id, color, size, material, quantity }).onConflictDoUpdate({ target: [cartItems.ownerId, cartItems.productId, cartItems.color, cartItems.size, cartItems.material], set: { quantity: (existing?.quantity || 0) + quantity } });
      result = { success: true, message: `${product.name} added to your bag.` };
    } else if (action === 'cart-quantity') {
      const [item] = await db.select({ ...getTableColumns(cartItems), stock: products.stock, tags: products.tags }).from(cartItems).innerJoin(products, eq(products.id, cartItems.productId)).where(and(eq(cartItems.id, String(body.id)), eq(cartItems.ownerId, ownerId)));
      assert(item, 'This item is no longer in your bag.');
      const quantity = Number(body.quantity);
      const quantityLimit = item.tags.includes('live-catalog') ? 10 : Math.min(item.stock, 10);
      assert(Number.isInteger(quantity) && quantity >= 1 && quantity <= quantityLimit, 'Please choose a quantity within the available stock.');
      await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, item.id));
    } else if (action === 'cart-remove') {
      await db.delete(cartItems).where(and(eq(cartItems.id, String(body.id)), eq(cartItems.ownerId, ownerId)));
      result = { message: 'Item removed from your bag.' };
    } else if (action === 'wishlist') {
      const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, String(body.productId)));
      assert(product, 'Product not found.');
      const [existing] = await db.select().from(wishlistItems).where(and(eq(wishlistItems.ownerId, ownerId), eq(wishlistItems.productId, product.id)));
      if (existing) { await db.delete(wishlistItems).where(and(eq(wishlistItems.ownerId, ownerId), eq(wishlistItems.productId, product.id))); result = { message: 'Removed from your wishlist.' }; }
      else { await db.insert(wishlistItems).values({ ownerId, productId: product.id }); result = { message: 'Saved for a little later. Added to your wishlist.' }; }
    } else if (action === 'save-address') {
      const data = address(body.address);
      if (data.isDefault) await db.update(addresses).set({ data: sql`jsonb_set(${addresses.data}, '{isDefault}', 'false'::jsonb)` }).where(eq(addresses.ownerId, ownerId));
      if (body.id) {
        const updated = await db.update(addresses).set({ data }).where(and(eq(addresses.ownerId, ownerId), eq(addresses.id, String(body.id)))).returning();
        assert(updated.length, 'Address not found.');
      } else await db.insert(addresses).values({ ownerId, data });
      result = { message: 'Your address has been saved.' };
    } else if (action === 'delete-address') {
      await db.delete(addresses).where(and(eq(addresses.id, String(body.id)), eq(addresses.ownerId, ownerId)));
      result = { message: 'Address removed.' };
    } else if (action === 'update-profile') {
      assert(viewer.user, 'Please sign in to manage your profile.', 401);
      await db.update(users).set({ name: text(body.name, 2, 100), phone: body.phone ? phone(body.phone) : '' }).where(eq(users.id, viewer.user.id));
      result = { message: 'Your profile is up to date.' };
    } else if (action === 'checkout') {
      const deliveryAddress = address(body.address);
      const mail = email(body.email);
      assert(body.paymentMethod === 'cod', 'Please select cash on delivery.');
      const order = await db.transaction(async tx => {
        const cart = await tx.select({ ...getTableColumns(cartItems), product: getTableColumns(products) }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.ownerId, ownerId)).for('update');
        assert(cart.length, 'Your bag is empty. Find something you love first.');
        const orderItems: OrderItem[] = cart.map(item => {
          const sellerConfirmationRequired = hasUntrackedInventory(item.product);
          if (!sellerConfirmationRequired) assert(item.quantity <= item.product.stock, `${item.product.name} has only ${item.product.stock} in stock. Please update your bag.`);
          return {
            productId: item.productId, name: item.product.name, image: item.product.images[0], sellerId: item.product.sellerId,
            quantity: item.quantity, color: item.color, size: item.size, material: item.material || item.product.material,
            price: variantPrice(item.product, item.size, item.material),
            status: sellerConfirmationRequired ? pendingSellerConfirmation : 'Confirmed',
            ...(sellerConfirmationRequired ? { sellerConfirmationRequired: true } : {}),
          };
        });
        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const coupon = String(body.coupon || '').trim().toUpperCase();
        if (coupon) assert(coupon === 'WELCOME10' || coupon === 'HOME500', 'That coupon isn’t valid. Try WELCOME10 or HOME500.');
        if (coupon) assert(subtotal >= 10000, 'This coupon requires a minimum order of ₹10,000.');
        if (coupon === 'WELCOME10') { const previous = await tx.select({ id: orders.id }).from(orders).where(or(eq(orders.email, mail), eq(orders.ownerId, ownerId))).limit(1); assert(!previous.length, 'WELCOME10 is for your first order. Please use HOME500 instead.'); }
        const discount = coupon === 'WELCOME10' ? Math.min(Math.round(subtotal * .1), 3000) : coupon === 'HOME500' ? 500 : 0;
        for (const item of cart.filter(item => !hasUntrackedInventory(item.product))) {
          const [updated] = await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}` }).where(and(eq(products.id, item.productId), sql`${products.stock} >= ${item.quantity}`)).returning({ stock: products.stock });
          assert(updated, `${item.product.name} just sold out. Please update your bag.`);
        }
        const orderStatus = orderItems.some(item => item.sellerConfirmationRequired) ? pendingSellerConfirmation : 'Confirmed';
        const [placed] = await tx.insert(orders).values({ number: `FK-${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`, ownerId, userId: viewer.user?.id, items: orderItems, address: deliveryAddress, email: mail, subtotal, discount, total: subtotal - discount, coupon: coupon || null, status: orderStatus, tracking: `FKIN${randomBytes(6).toString('hex').toUpperCase()}`, paymentMethod: 'Cash on delivery' }).returning();
        await tx.delete(cartItems).where(eq(cartItems.ownerId, ownerId));
        return placed;
      });
      result = { success: true, message: 'A little happiness is on its way! Your order is confirmed.', order };
    } else if (action === 'review') {
      assert(viewer.user, 'Please sign in to share your review.', 401);
      const rating = Number(body.rating);
      assert(Number.isInteger(rating) && rating >= 1 && rating <= 5, 'Please select a star rating.');
      const [product] = await db.select().from(products).where(eq(products.id, String(body.productId)));
      assert(product, 'This product could not be found.');
      const purchased = await db.select({ items: orders.items }).from(orders).where(and(eq(orders.ownerId, ownerId), or(eq(orders.status, 'Delivered'), eq(orders.status, 'Confirmed'))));
      const verified = purchased.some(order => order.items.some(item => item.productId === product.id));
      await db.insert(reviews).values({ productId: product.id, userId: viewer.user.id, authorName: viewer.user.name, rating, title: text(body.title, 3, 120), body: text(body.body, 10, 2000), verified });
      await db.update(products).set({ rating: Math.round(((product.rating * product.reviewCount + rating) / (product.reviewCount + 1)) * 10) / 10, reviewCount: product.reviewCount + 1 }).where(eq(products.id, product.id));
      result = { message: 'Thank you! Your review has been published.' };
    } else if (action === 'subscribe') {
      await db.insert(subscribers).values({ email: email(body.email) }).onConflictDoNothing();
      result = { message: 'You’re on the list! A little inspiration is coming your way.' };
    } else if (action === 'contact') {
      await db.insert(messages).values({ email: email(body.email), name: text(body.name, 2, 100), subject: text(body.subject, 3, 120), message: text(body.message, 10, 2000) });
      result = { message: 'Your message has been received. Our care team will reply within 1–2 business days.' };
    } else if (action === 'seller-register') {
      assert(viewer.user, 'Please sign in or create an account to become a seller.', 401);
      const name = text(body.name, 2, 100);
      await db.transaction(async tx => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext('seller-user:' || ${viewer.user!.id}))`);
        const existing = await tx.select({ id: sellers.id }).from(sellers).where(eq(sellers.userId, viewer.user!.id)).limit(1);
        assert(!existing.length, 'You already have a seller account.');
        await tx.insert(sellers).values({ userId: viewer.user!.id, name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 6)}`, city: text(body.city, 2, 70), about: text(body.about, 20, 1000) });
        if (viewer.user!.role !== 'admin') await tx.update(users).set({ role: 'seller' }).where(eq(users.id, viewer.user!.id));
      });
      result = { message: 'Welcome to the FurniKart seller community!' };
    } else if (action === 'seller-product') {
      assert(viewer.user, 'Please sign in to manage your store.', 401);
      const [seller] = await db.select().from(sellers).where(eq(sellers.userId, viewer.user.id));
      assert(seller, 'Please register as a seller first.', 403);
      const price = Number(body.price), originalPrice = Number(body.originalPrice || body.price), stock = Number(body.stock);
      assert(Number.isInteger(price) && price >= 500 && price <= 1000000 && Number.isInteger(originalPrice) && originalPrice >= price, 'Please enter valid pricing. Minimum price is ₹500.');
      assert(Number.isInteger(stock) && stock >= 0 && stock <= 10000, 'Please enter a valid stock quantity.');
      const name = text(body.name, 3, 100);
      const image = text(body.image || '/images/room.jpg', 5, 1000);
      assert(image.startsWith('/images/') || /^https:\/\/.+/.test(image), 'Please use an HTTPS image URL or a local furniture image.');
      const data = { name, sellerName: seller.name, category: text(body.category, 1, 50), price, originalPrice, stock, material: text(body.material, 2, 50), description: text(body.description, 20, 5000), dimensions: text(body.dimensions, 3, 100), images: [image], badge: 'New arrival', colors: [{ name: 'Natural', hex: '#b39474' }], sizes: ['Standard'], tags: ['new'] };
      if (body.id) {
        const updated = await db.update(products).set(data).where(and(eq(products.id, String(body.id)), eq(products.sellerId, seller.id))).returning();
        assert(updated.length, 'You can only edit your own products.', 403);
      } else {
        const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 8)}`;
        await db.insert(products).values({ ...data, id, slug: id, sellerId: seller.id });
      }
      result = { message: body.id ? 'Your product has been updated.' : 'Your new listing is live on FurniKart!' };
    } else if (action === 'seller-order') {
      assert(viewer.user, 'Please sign in to manage your orders.', 401);
      const [seller] = await db.select().from(sellers).where(eq(sellers.userId, viewer.user.id));
      assert(seller, 'Seller account not found.', 403);
      assert(['Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'].includes(body.status), 'Please select a valid order status.');
      await db.transaction(async tx => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, String(body.id))).for('update');
        assert(order && order.items.some(i => i.sellerId === seller.id), 'You can only manage orders for your products.', 403);
        const sellerItems = order.items.filter(item => item.sellerId === seller.id);
        const pendingItems = sellerItems.filter(item => item.sellerConfirmationRequired && item.status === pendingSellerConfirmation);
        if (body.status === 'Cancelled') assert(pendingItems.length > 0, 'Only pending seller-confirmation requests can be cancelled.');
        if (['Preparing', 'Shipped', 'Delivered'].includes(body.status)) assert(!pendingItems.length, 'Confirm the seller request before updating fulfilment.');
        const confirmedAt = body.status === 'Confirmed' ? new Date().toISOString() : undefined;
        const updatedItems = order.items.map(item => {
          if (item.sellerId !== seller.id) return item;
          if (item.sellerConfirmationRequired && item.status === 'Cancelled') return item;
          if (body.status === 'Cancelled') {
            return item.sellerConfirmationRequired && item.status === pendingSellerConfirmation ? { ...item, status: 'Cancelled' } : item;
          }
          if (body.status === 'Confirmed' && item.sellerConfirmationRequired && item.status === pendingSellerConfirmation) {
            return { ...item, status: 'Confirmed', sellerConfirmedAt: confirmedAt };
          }
          return { ...item, status: body.status };
        });
        const statuses = updatedItems.map(item => item.status || 'Confirmed');
        const activeStatuses = statuses.filter(status => status !== 'Cancelled');
        const overallStatus = !activeStatuses.length ? 'Cancelled' : activeStatuses.includes(pendingSellerConfirmation) ? pendingSellerConfirmation : activeStatuses.every(status => status === 'Delivered') ? 'Delivered' : activeStatuses.some(status => status === 'Shipped') ? 'Shipped' : activeStatuses.some(status => status === 'Preparing') ? 'Preparing' : 'Confirmed';
        const changesAvailability = body.status === 'Cancelled' && pendingItems.length > 0;
        if (changesAvailability) {
          const billableItems = updatedItems.filter(item => item.status !== 'Cancelled');
          const subtotal = billableItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const discount = subtotal < 10000 ? 0 : order.coupon === 'WELCOME10' ? Math.min(Math.round(subtotal * .1), 3000) : order.coupon === 'HOME500' ? 500 : 0;
          await tx.update(orders).set({ status: overallStatus, items: updatedItems, subtotal, discount, total: subtotal - discount, coupon: discount ? order.coupon : null }).where(eq(orders.id, order.id));
        } else {
          await tx.update(orders).set({ status: overallStatus, items: updatedItems }).where(eq(orders.id, order.id));
        }
      });
      result = { message: 'Order status updated. The customer can see the new status.' };
    } else throw new StoreError('That action isn’t available.');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StoreError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Store action failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 });
  }
}
