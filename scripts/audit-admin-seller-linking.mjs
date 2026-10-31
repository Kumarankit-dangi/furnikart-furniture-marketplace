import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [auth, route, store, ui] = await Promise.all([
  readFile(new URL('../src/lib/admin-auth.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/api/admin/sellers/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/api/store/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/admin-sellers.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  ['authorization uses the existing session viewer and admin role', /getViewer\(\)/.test(auth) && /user\.role !== 'admin'/.test(auth)],
  ['both API methods require server-side admin authorization', (route.match(/await requireAdmin\(\)/g) || []).length === 2],
  ['seller records are restricted to products tagged live-catalog', route.includes("const liveTag = 'live-catalog'") && route.includes('products.tags') && route.includes('JSON.stringify([liveTag])')],
  ['link actions verify the target user exists', route.includes("tx.select({ id: users.id })") && route.includes("throw new Error('USER_NOT_FOUND')")],
  ['duplicate assignment check runs under a transaction advisory lock', route.includes('pg_advisory_xact_lock') && route.includes('USER_ALREADY_ASSIGNED')],
  ['unlink changes only the selected seller mapping', /update\(sellers\)\.set\(\{ userId: null \}\)\.where\(eq\(sellers\.id, seller\.id\)\)/.test(route)],
  ['UI exposes link, change and unlink controls with linked status', ui.includes('Change link') && ui.includes('Unlink') && ui.includes("'Linked' : 'Unlinked'")],
  ['seller registration shares the assignment lock and preserves admin role', store.includes('pg_advisory_xact_lock') && store.includes("viewer.user!.role !== 'admin'" )],
  ['no admin role promotion endpoint or account provisioning was added', !route.includes("set({ role: 'admin' })") && !store.includes("set({ role: 'admin' })")],
];

for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
}
assert.ok(checks.every(([, passed]) => passed), 'One or more admin seller-linking static checks failed.');
console.log(`\n${checks.length}/${checks.length} static checks passed. No database was opened.`);
