import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

dotenv.config({ quiet: true });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const stamp = Date.now();
const password = 'FurniTest!2026';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const guests = new Set();
function client() {
  const jar = new Map();
  return { async call(path, body) {
    const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(jar.size ? { Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; ') } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    for (const cookie of res.headers.getSetCookie()) { const [pair] = cookie.split(';'); const i = pair.indexOf('='); if (cookie.includes('Max-Age=0')) jar.delete(pair.slice(0,i)); else { jar.set(pair.slice(0,i),pair.slice(i+1)); if (pair.startsWith('fk_guest=')) guests.add(pair.slice(i+1)); } }
    return { status: res.status, data: await res.json() };
  } };
}
function check(response, expected, label) { assert.equal(response.status, expected, `${label}: ${JSON.stringify(response.data)}`); console.log(`PASS ${label}`); }
async function cleanup() {
  for (const query of [
    sql`delete from reviews where user_id in (select id from users where email like 'qa-%@furnikart.test')`,
    sql`delete from orders where email like 'qa-%@furnikart.test'`,
    sql`delete from subscribers where email like 'qa-%@furnikart.test'`,
    sql`delete from messages where email like 'qa-%@furnikart.test'`,
    sql`delete from cart_items where owner_id in (select id::text from users where email like 'qa-%@furnikart.test')`,
    sql`delete from addresses where owner_id in (select id::text from users where email like 'qa-%@furnikart.test')`,
    sql`delete from wishlist_items where owner_id in (select id::text from users where email like 'qa-%@furnikart.test')`,
    sql`delete from products where name like 'QA Lounge %'`,
    sql`delete from products where seller_id in (select id from sellers where name like 'QA%Seller%')`,
    sql`delete from sellers where name like 'QA%Seller%'`,
    sql`delete from users where email like 'qa-%@furnikart.test'`,
  ]) await db.execute(query);
  for (const guest of guests) await db.execute(sql`delete from cart_items where owner_id = ${guest}`);
  console.log('PASS temporary test records cleaned up');
}
try {
  await cleanup();
  for (const path of ['/', '/shop', '/product/oslo-3-seater-sofa', '/account', '/checkout', '/sell', '/info/shipping', '/api/health']) {
    const response = await fetch(base + path); assert.equal(response.status, 200, path); console.log(`PASS route ${path}`);
  }
  const a = client(), b = client(), buyer = client();
  const initial = await buyer.call('/api/store');
  check(initial, 200, 'catalog database read');
  assert.ok(initial.data.products.length >= 24);
  const mailA = `qa-seller-a-${stamp}@furnikart.test`, mailB = `qa-seller-b-${stamp}@furnikart.test`, mailC = `qa-buyer-${stamp}@furnikart.test`;
  for (const [c, email, name] of [[a, mailA, 'QA Seller A'], [b, mailB, 'QA Seller B']]) {
    check(await c.call('/api/store', { action:'signup', email, password, name }), 200, `${name} signup`);
    check(await c.call('/api/store', { action:'seller-register', name:`QA Seller ${name} ${stamp}`, city:'Jaipur, Rajasthan', about:'A quality assurance furniture studio for testing real inventory and fulfilment.' }), 200, `${name} registration`);
  }
  async function listing(c, name, price) {
    return c.call('/api/store', { action:'seller-product', name, price, originalPrice:price+3000, stock:5, category:'chairs', material:'Solid wood', dimensions:'70 W × 70 D × 80 H cm', description:'A thoughtfully built furniture listing created for the fullstack marketplace quality assurance test.', image:'/images/lounge.jpg' });
  }
  check(await listing(a, `QA Lounge A ${stamp}`, 11999), 200, 'seller A product listing');
  check(await listing(b, `QA Lounge B ${stamp}`, 14999), 200, 'seller B product listing');
  const sa = await a.call('/api/store'), sb = await b.call('/api/store');
  const pa = sa.data.products.find(p => p.name === `QA Lounge A ${stamp}`), pb = sb.data.products.find(p => p.name === `QA Lounge B ${stamp}`);
  assert.ok(pa && pb);
  check(await b.call('/api/store', { action:'seller-product', id:pa.id, name:pa.name, price:pa.price, originalPrice:pa.originalPrice, stock:5, category:'chairs', material:'Solid wood', dimensions:pa.dimensions, description:pa.description, image:pa.images[0] }), 403, 'cross-seller listing protection');
  check(await buyer.call('/api/store', { action:'cart-add', productId:pa.id, color:pa.colors[0].name, size:'Standard', material:'Premium teak', quantity:1 }), 200, 'guest variant add to bag');
  check(await buyer.call('/api/store', { action:'wishlist', productId:pb.id }), 200, 'guest wishlist');
  check(await buyer.call('/api/store', { action:'signup', email:mailC, password, name:'QA Buyer' }), 200, 'buyer account creation');
  let state = (await buyer.call('/api/store')).data;
  assert.equal(state.cart.length,1); assert.equal(state.wishlist[0],pb.id); assert.equal(state.cart[0].material,'Premium teak'); console.log('PASS guest-to-account cart and wishlist migration');
  check(await buyer.call('/api/store', { action:'cart-quantity', id:state.cart[0].id, quantity:100 }), 400, 'invalid stock quantity rejected');
  check(await buyer.call('/api/store', { action:'cart-add', productId:pb.id, color:pb.colors[0].name, size:'Standard', material:'Solid wood', quantity:1 }), 200, 'multi-seller bag');
  const address = { label:'Home', fullName:'Ananya Sharma', phone:'9876543210', line1:'Flat 402, Maple Heights', line2:'12, 5th Main, Indiranagar', city:'Bengaluru', state:'Karnataka', pin:'560038', isDefault:true };
  check(await buyer.call('/api/store', { action:'save-address', address }), 200, 'saved Indian address');
  check(await buyer.call('/api/store', { action:'set-pin', pin:'000000' }), 400, 'invalid delivery PIN rejected');
  check(await buyer.call('/api/store', { action:'set-pin', pin:'560038' }), 200, 'delivery PIN saved');
  state = (await buyer.call('/api/store')).data; assert.equal(state.addresses.length,1); assert.equal(state.pin,'560038');
  const checked = await buyer.call('/api/store', { action:'checkout', address:state.addresses[0], email:mailC, paymentMethod:'cod', coupon:'WELCOME10' });
  check(checked, 200, 'cash-on-delivery checkout');
  assert.equal(checked.data.order.subtotal,28798); assert.equal(checked.data.order.discount,2880); assert.equal(checked.data.order.total,25918); console.log('PASS server-calculated material variant prices and welcome discount');
  state = (await buyer.call('/api/store')).data; assert.equal(state.cart.length,0); assert.equal(state.orders.length,1); assert.equal(state.orders[0].items.length,2);
  const orderId = state.orders[0].id;
  check(await a.call('/api/store', { action:'seller-order', id:orderId, status:'Shipped' }), 200, 'seller A dispatch');
  assert.equal((await b.call('/api/store')).data.sellerOrders.find(o => o.id === orderId).items[0].status,'Confirmed'); console.log('PASS independent seller fulfilment status');
  check(await b.call('/api/store', { action:'seller-order', id:orderId, status:'Preparing' }), 200, 'seller B preparation');
  check(await a.call('/api/store', { action:'seller-order', id:orderId, status:'Delivered' }), 200, 'seller A delivery');
  check(await b.call('/api/store', { action:'seller-order', id:orderId, status:'Delivered' }), 200, 'seller B delivery');
  assert.equal((await buyer.call('/api/store')).data.orders[0].status,'Delivered'); console.log('PASS delivery tracking across both sellers');
  check(await buyer.call('/api/store', { action:'review', productId:pa.id, rating:5, title:'A lovely QA-tested piece', body:'Beautifully made and thoughtfully delivered. This review verifies the database review flow.' }), 200, 'customer review');
  check(await buyer.call('/api/store', { action:'update-profile', name:'QA Buyer Updated', phone:'9876543210' }), 200, 'profile update');
  check(await buyer.call('/api/store', { action:'subscribe', email:mailC }), 200, 'newsletter subscription');
  check(await buyer.call('/api/store', { action:'contact', email:mailC, name:'QA Buyer', subject:'An order or delivery question', message:`Quality assurance message for ${state.orders[0].number}.` }), 200, 'customer support message');
  check(await buyer.call('/api/store', { action:'logout' }), 200, 'secure sign-out');
  assert.equal((await buyer.call('/api/store')).data.user,null);
  check(await buyer.call('/api/store', { action:'login', email:mailC, password:'wrongpassword' }), 401, 'incorrect password rejected');
  check(await buyer.call('/api/store', { action:'login', email:mailC, password }), 200, 'customer sign-in');
  assert.equal((await buyer.call('/api/store')).data.user.name,'QA Buyer Updated'); console.log('PASS complete FurniKart API smoke test');
} finally { await cleanup(); await pool.end(); }
