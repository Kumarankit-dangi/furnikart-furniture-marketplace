import { cookies, headers } from 'next/headers';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
export async function setCookie(name: string, value: string, days = 30) {
  const jar = await cookies();
  const requestHeaders = await headers();
  jar.set(name, value, { httpOnly: true, sameSite: 'lax', secure: requestHeaders.get('x-forwarded-proto') === 'https', path: '/', maxAge: days * 86400 });
}
export async function getViewer() {
  const jar = await cookies();
  let guest = jar.get('fk_guest')?.value;
  if (!guest || !/^guest-[a-f0-9-]{36}$/.test(guest)) {
    guest = `guest-${randomUUID()}`;
    await setCookie('fk_guest', guest, 365);
  }
  const token = jar.get('fk_auth')?.value;
  let user: typeof users.$inferSelect | undefined;
  if (token) {
    const result = await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date()))).limit(1);
    user = result[0]?.user;
  }
  return { ownerId: user?.id ?? guest, user, guest, pin: jar.get('fk_pin')?.value || '560001' };
}
