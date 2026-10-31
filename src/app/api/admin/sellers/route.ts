import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { products, sellers, users } from '@/db/schema';
import { AdminAuthorizationError, requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const liveTag = 'live-catalog';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Admin seller management failed:', error);
  return NextResponse.json({ error: 'Seller management could not be completed.' }, { status: 500 });
}

function originAllowed(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try { return !origin || new URL(origin).host === host; } catch { return false; }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const search = (request.nextUrl.searchParams.get('q') || '').trim();
    const rows = await db.select({
      id: sellers.id, name: sellers.name, slug: sellers.slug, city: sellers.city,
      userId: sellers.userId, userName: users.name, userEmail: users.email,
    }).from(sellers)
      .innerJoin(products, eq(products.sellerId, sellers.id))
      .leftJoin(users, eq(users.id, sellers.userId))
      .where(sql`${products.tags} @> ${JSON.stringify([liveTag])}::jsonb`)
      .orderBy(asc(sellers.name));
    const uniqueSellers = [...new Map(rows.map(row => [row.id, row])).values()];
    const accounts = search.length >= 2
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
        .where(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)))
        .orderBy(asc(users.name)).limit(20)
      : [];
    return NextResponse.json({ sellers: uniqueSellers, accounts });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    if (!originAllowed(request)) return NextResponse.json({ error: 'This request is not allowed.' }, { status: 403 });
    await requireAdmin();
    const body = await request.json();
    const action = body?.action;
    const sellerId = String(body?.sellerId || '');
    if (!uuidPattern.test(sellerId)) return NextResponse.json({ error: 'Choose a valid seller.' }, { status: 400 });
    if (!['link', 'unlink'].includes(action)) return NextResponse.json({ error: 'Choose a valid mapping action.' }, { status: 400 });
    const userId = action === 'link' ? String(body?.userId || '') : null;
    if (action === 'link' && !uuidPattern.test(userId!)) return NextResponse.json({ error: 'Choose a valid existing user account.' }, { status: 400 });

    await db.transaction(async tx => {
      const lockIds = [...new Set([userId].filter((id): id is string => Boolean(id)))].sort();
      for (const id of lockIds) await tx.execute(sql`select pg_advisory_xact_lock(hashtext('seller-user:' || ${id}))`);

      const [seller] = await tx.select({ id: sellers.id, userId: sellers.userId })
        .from(sellers).innerJoin(products, eq(products.sellerId, sellers.id))
        .where(and(eq(sellers.id, sellerId), sql`${products.tags} @> ${JSON.stringify([liveTag])}::jsonb`)).limit(1);
      if (!seller) throw new Error('LIVE_SELLER_NOT_FOUND');

      if (action === 'unlink') {
        await tx.update(sellers).set({ userId: null }).where(eq(sellers.id, seller.id));
        return;
      }

      const [account] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId!)).limit(1);
      if (!account) throw new Error('USER_NOT_FOUND');
      const [assignment] = await tx.select({ id: sellers.id }).from(sellers)
        .where(and(eq(sellers.userId, userId!), sql`${sellers.id} <> ${seller.id}`)).limit(1);
      if (assignment) throw new Error('USER_ALREADY_ASSIGNED');
      await tx.update(sellers).set({ userId }).where(eq(sellers.id, seller.id));
    });
    return NextResponse.json({ success: true, message: action === 'link' ? 'Seller account linked.' : 'Seller account unlinked.' });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return errorResponse(error);
    if (error instanceof Error && error.message === 'LIVE_SELLER_NOT_FOUND') return NextResponse.json({ error: 'That live-catalog seller was not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') return NextResponse.json({ error: 'The selected user account no longer exists.' }, { status: 404 });
    if (error instanceof Error && error.message === 'USER_ALREADY_ASSIGNED') return NextResponse.json({ error: 'That user account is already linked to another seller.' }, { status: 409 });
    return errorResponse(error);
  }
}
