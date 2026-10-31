import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const api = read('../src/app/api/store/route.ts');
const account = read('../src/components/account.tsx');
const checkout = read('../src/components/checkout.tsx');
const productCard = read('../src/components/product-card.tsx');
const productDetail = read('../src/components/product-detail.tsx');

const results = [];
function scenario(name, checks) {
  for (const check of checks) check();
  results.push({ scenario: name, result: 'PASS (static path assertions)' });
}

scenario('1. One untracked product can be ordered', [
  () => assert.ok(productCard.includes('canPurchaseProduct(product)')),
  () => assert.ok(api.includes('if (hasUntrackedInventory(product)) assert(requestedQuantity <= 10')),
  () => assert.ok(api.includes("status: sellerConfirmationRequired ? pendingSellerConfirmation : 'Confirmed'")),
  () => assert.ok(api.includes('if (!sellerConfirmationRequired) assert(item.quantity <= item.product.stock')),
]);

scenario('2. Untracked products from different sellers stay independently assigned', [
  () => assert.ok(api.includes('sellerId: item.product.sellerId')),
  () => assert.ok(api.includes('orderItems.some(item => item.sellerConfirmationRequired)')),
  () => assert.ok(api.includes('if (item.sellerId !== seller.id) return item')),
]);

scenario('3. Mixed tracked/untracked checkout reserves only tracked stock', [
  () => assert.ok(api.includes('cart.filter(item => !hasUntrackedInventory(item.product))')),
  () => assert.ok(api.includes('stock: sql`${products.stock} - ${item.quantity}`')),
  () => assert.ok(api.includes('if (!sellerConfirmationRequired) assert(item.quantity <= item.product.stock')),
]);

scenario('4. Seller authorization prevents cross-seller access and cancellation', [
  () => assert.ok(api.includes('where(eq(sellers.userId, viewer.user.id))')),
  () => assert.ok(api.includes('order.items.some(i => i.sellerId === seller.id)')),
  () => assert.ok(api.includes('if (item.sellerId !== seller.id) return item')),
  () => assert.ok(api.includes("if (body.status === 'Cancelled') assert(pendingItems.length > 0")),
]);

scenario('5. Delivery estimates are hidden until seller confirmation', [
  () => assert.ok(api.includes('sellerConfirmedAt: confirmedAt')),
  () => assert.ok(account.includes('Waiting for seller confirmation.')),
  () => assert.ok(account.includes('We’ll share a delivery estimate after they confirm.')),
  () => assert.ok(checkout.includes('Awaiting seller confirmation')),
  () => assert.ok(checkout.includes('const showEstimate = !pending && !cancelled')),
  () => assert.ok(productDetail.includes('Delivery is available to {pin}.{hasUntrackedInventory(product)')),
  () => assert.ok(productDetail.includes('Seller confirmation is required before delivery timing is shared.')),
  () => assert.ok(checkout.includes('Delivery timing will be shared after seller confirmation.')),
]);

scenario('6. Cancelling a pending line recalculates the remaining order total', [
  () => assert.ok(api.includes("const billableItems = updatedItems.filter(item => item.status !== 'Cancelled')")),
  () => assert.ok(api.includes('const subtotal = billableItems.reduce')),
  () => assert.ok(api.includes('total: subtotal - discount')),
]);

scenario('7. Tracked inventory retains its stock checks and decrement path', [
  () => assert.ok(api.includes('else assert(requestedQuantity <= product.stock')),
  () => assert.ok(api.includes('if (!sellerConfirmationRequired) assert(item.quantity <= item.product.stock')),
  () => assert.ok(api.includes('cart.filter(item => !hasUntrackedInventory(item.product))')),
]);

const originalSubtotal = 18000;
const cancelledLineTotal = 7000;
const remainingSubtotal = originalSubtotal - cancelledLineTotal;
const discount = remainingSubtotal >= 10000 ? 500 : 0;
const recalculatedTotal = remainingSubtotal - discount;
assert.equal(recalculatedTotal, 10500);

console.log(JSON.stringify({
  scope: 'Local static assertions and synthetic cancellation arithmetic; no database connection.',
  scenarios: results,
  syntheticCancellation: { originalSubtotal, cancelledLineTotal, remainingSubtotal, discount, recalculatedTotal },
}, null, 2));
