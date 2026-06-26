export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// ─── Haversine distance (km) ─────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Score (0-100) ────────────────────────────────────────────────────────────
// Interests 40% + Geography 25% + Quality 20% + Freshness 15%
function scoreListing(
  l: any,
  preferredCategoryIds: string[],
  lat: number | null,
  lng: number | null
): number {
  let score = 0;

  // — Interests (max 40) —
  if (preferredCategoryIds.length > 0 && preferredCategoryIds.includes(l.categoryId)) {
    const rank = preferredCategoryIds.indexOf(l.categoryId);
    // top = 40, 2nd = 32, 3rd = 24, 4th = 18, 5th = 12
    score += Math.max(12, 40 - rank * 8);
  }

  // — Geography (max 25) —
  if (lat && lng && l.latitude && l.longitude) {
    const dist = haversineKm(lat, lng, l.latitude, l.longitude);
    if (dist < 2)       score += 25;
    else if (dist < 5)  score += 20;
    else if (dist < 15) score += 14;
    else if (dist < 30) score += 8;
    else if (dist < 60) score += 3;
  }

  // — Quality (max 20) —
  // Seller rating (up to 14)
  if (l.user.rating >= 4.8)      score += 14;
  else if (l.user.rating >= 4.5) score += 11;
  else if (l.user.rating >= 4.0) score += 7;
  else if (l.user.rating >= 3.5) score += 3;
  // Saves popularity (up to 6)
  score += Math.min(Math.floor(l.saves / 2), 6);

  // — Freshness (max 15) —
  const ageHours = (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 6)       score += 15;
  else if (ageHours < 24) score += 12;
  else if (ageHours < 72) score += 8;
  else if (ageHours < 168) score += 4; // < 1 week
  else                    score += 1;

  // Promoted bonus (outside 100 scale, small nudge)
  if (l.promoted) score += 5;

  return score;
}

// ─── GET /api/discover ────────────────────────────────────────────────────────
// ?page=1&lat=...&lng=...&history=true
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const { searchParams } = new URL(req.url);

  // History mode: return dismissed listings
  if (searchParams.get('history') === 'true') {
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const dismissed = await prisma.discoverDismiss.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
            user: { select: { id: true, name: true, image: true, rating: true } },
            category: { select: { id: true, name: true, icon: true } },
          },
        },
      },
    });
    return NextResponse.json({
      dismissed: dismissed.map((d) => ({
        dismissId: d.id,
        reason: d.reason,
        dismissedAt: d.createdAt,
        reactivated: d.reactivated,
        listing: d.listing,
      })),
    });
  }

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
  const LIMIT = 10;

  // Collect exclusions
  const [ownListings, dismissedRows, favorited] = await Promise.all([
    userId
      ? prisma.listing.findMany({ where: { userId }, select: { id: true } })
      : Promise.resolve([] as { id: string }[]),
    userId
      ? prisma.discoverDismiss.findMany({
          where: { userId },
          include: { listing: { select: { id: true, price: true } } },
        })
      : Promise.resolve([] as any[]),
    userId
      ? prisma.favorite.findMany({ where: { userId }, select: { listingId: true } })
      : Promise.resolve([] as { listingId: string }[]),
  ]);

  // Auto-reactivation: if price dropped >15% since dismissal, un-dismiss it
  const reactivatableIds: string[] = [];
  for (const d of dismissedRows) {
    if (
      d.priceAtDismiss &&
      d.listing?.price &&
      d.listing.price < d.priceAtDismiss * 0.85 &&
      !d.reactivated
    ) {
      reactivatableIds.push(d.id);
    }
  }
  if (reactivatableIds.length) {
    await prisma.discoverDismiss.updateMany({
      where: { id: { in: reactivatableIds } },
      data: { reactivated: true },
    });
  }

  const reactivatedListingIds = new Set(
    dismissedRows
      .filter((d) => reactivatableIds.includes(d.id))
      .map((d) => d.listingId)
  );

  const excludedIds = [
    ...ownListings.map((l) => l.id),
    ...dismissedRows
      .filter((d) => !reactivatedListingIds.has(d.listingId))
      .map((d) => d.listingId),
    ...favorited.map((f) => f.listingId),
  ];

  // Cold start detection (< 5 favorites = calibration mode)
  const favoriteCount = favorited.length;
  const isColdStart = favoriteCount < 5;

  // Preferred categories from favorites
  let preferredCategoryIds: string[] = [];
  if (userId && !isColdStart) {
    const favListings = await prisma.favorite.findMany({
      where: { userId },
      include: { listing: { select: { categoryId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const categoryCounts: Record<string, number> = {};
    for (const fav of favListings) {
      const cid = fav.listing.categoryId;
      categoryCounts[cid] = (categoryCounts[cid] ?? 0) + 1;
    }
    preferredCategoryIds = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);
  }

  // Fetch candidate listings (fetch more for variety algorithm)
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60-day window
  const listings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: excludedIds.length ? excludedIds : ['__none__'] },
      createdAt: { gte: cutoff },
    },
    include: {
      images: { orderBy: { order: 'asc' }, take: 1 },
      user: {
        select: { id: true, name: true, image: true, rating: true, ratingCount: true },
      },
      category: { select: { id: true, name: true, icon: true } },
    },
    orderBy: [{ promoted: 'desc' }, { createdAt: 'desc' }],
    take: LIMIT * 6, // extra pool for variety algorithm
  });

  // Score all listings
  const scored = listings.map((l) => ({
    ...l,
    _score: scoreListing(l, preferredCategoryIds, lat, lng),
  }));
  scored.sort((a, b) => b._score - a._score);

  // — Variety forcing (6+2+1+1) —
  let batch: typeof scored = [];

  if (isColdStart) {
    // Cold start: just return highest-scored, spread across all available categories
    const seen = new Set<string>();
    for (const item of scored) {
      if (batch.length >= LIMIT) break;
      if (!seen.has(item.categoryId) || batch.length >= scored.length) {
        seen.add(item.categoryId);
        batch.push(item);
      }
    }
    // fill remaining slots
    for (const item of scored) {
      if (batch.length >= LIMIT) break;
      if (!batch.includes(item)) batch.push(item);
    }
  } else {
    // 6 from demonstrated interest
    const interest = scored.filter((l) => preferredCategoryIds.includes(l.categoryId));
    batch.push(...interest.slice(0, 6));

    // 2 from new categories (not in preferred)
    const newCats = scored.filter((l) => !preferredCategoryIds.includes(l.categoryId));
    const usedNewCats = new Set<string>();
    for (const item of newCats) {
      if (usedNewCats.size >= 2) break;
      if (!usedNewCats.has(item.categoryId)) {
        usedNewCats.add(item.categoryId);
        batch.push(item);
      }
    }

    // 1 popular (highest saves, not already in batch)
    const batchIds = new Set(batch.map((l) => l.id));
    const popular = scored
      .filter((l) => !batchIds.has(l.id))
      .sort((a, b) => b.saves - a.saves)[0];
    if (popular) { batch.push(popular); batchIds.add(popular.id); }

    // 1 wildcard (random from remaining)
    const remaining = scored.filter((l) => !batchIds.has(l.id));
    if (remaining.length) {
      const wildcard = remaining[Math.floor(Math.random() * Math.min(remaining.length, 10))];
      batch.push(wildcard);
    }

    // Fill up to LIMIT if variety didn't produce enough
    for (const item of scored) {
      if (batch.length >= LIMIT) break;
      if (!batch.some((b) => b.id === item.id)) batch.push(item);
    }
    batch = batch.slice(0, LIMIT);
  }

  // Paginate from the full scored list on subsequent pages
  const fullSortedIds = scored.map((l) => l.id);
  let paginated: typeof scored;
  if (page === 1) {
    paginated = batch;
  } else {
    const offset = (page - 1) * LIMIT;
    // exclude already-shown batch items
    const rest = scored.filter((l) => !batch.some((b) => b.id === l.id));
    paginated = rest.slice(offset - LIMIT, offset);
  }

  // Cold start: estimate total cards for progress bar (max 20)
  const coldStartTotal = isColdStart ? Math.min(scored.length, 20) : null;

  return NextResponse.json({
    listings: paginated,
    hasMore: fullSortedIds.length > page * LIMIT,
    page,
    isColdStart,
    coldStartTotal,
    favoriteCount,
  });
}

// ─── POST /api/discover — registrar descarte con motivo ────────────────────────
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { listingId, reason } = await req.json();
  if (!listingId) return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });

  // Fetch current price to store at dismissal (for reactivation check later)
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { price: true },
  });

  await prisma.discoverDismiss.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: {
      userId,
      listingId,
      reason: reason ?? null,
      priceAtDismiss: listing?.price ?? null,
    },
    update: {
      reason: reason ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/discover — deshacer descarte ─────────────────────────────────
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });

  await prisma.discoverDismiss.deleteMany({
    where: { userId, listingId },
  });

  return NextResponse.json({ ok: true });
}
