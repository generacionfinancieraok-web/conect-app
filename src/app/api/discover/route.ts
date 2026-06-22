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

// GET /api/discover?page=1&lat=...&lng=...
// Devuelve un feed personalizado de publicaciones para el modo Descubrir
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
  const LIMIT = 10;

  // IDs a excluir: propias + descartadas + ya guardadas (favoritos ya vistos)
  const [ownListings, dismissed, favorited] = await Promise.all([
    userId
      ? prisma.listing.findMany({ where: { userId }, select: { id: true } })
      : Promise.resolve([] as { id: string }[]),
    userId
      ? prisma.discoverDismiss.findMany({ where: { userId }, select: { listingId: true } })
      : Promise.resolve([] as { listingId: string }[]),
    userId
      ? prisma.favorite.findMany({ where: { userId }, select: { listingId: true } })
      : Promise.resolve([] as { listingId: string }[]),
  ]);

  const excludedIds = [
    ...ownListings.map((l) => l.id),
    ...dismissed.map((d) => d.listingId),
    ...favorited.map((f) => f.listingId),
  ];

  // Categorías preferidas del usuario (basado en sus favoritos históricos)
  let preferredCategoryIds: string[] = [];
  if (userId) {
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

  // Fecha de corte: 30 días
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Query principal
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
    take: LIMIT * 3, // fetch extra para poder reordenar
  });

  // Score personalizado
  const scored = listings.map((l) => {
    let score = 0;

    // Categoría preferida
    if (preferredCategoryIds.includes(l.categoryId)) {
      const rank = preferredCategoryIds.indexOf(l.categoryId);
      score += 30 - rank * 5; // top cat = +30, 2nd = +25, etc.
    }

    // Reputación del vendedor
    if (l.user.rating >= 4.5) score += 20;
    else if (l.user.rating >= 4.0) score += 12;
    else if (l.user.rating >= 3.5) score += 6;

    // Recencia (más nuevo = más score)
    const ageHours = (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 15 - Math.floor(ageHours / 24) * 2); // -2 por día, máx +15

    // Saves (popularidad)
    score += Math.min(l.saves, 10);

    // Proximidad (si hay coords)
    if (lat && lng && l.latitude && l.longitude) {
      const dist = Math.sqrt(
        Math.pow(l.latitude - lat, 2) + Math.pow(l.longitude - lng, 2)
      ) * 111; // grados a km aproximado
      if (dist < 5) score += 15;
      else if (dist < 20) score += 8;
      else if (dist < 50) score += 3;
    }

    // Bonus destacado
    if (l.promoted) score += 10;

    return { ...l, _score: score };
  });

  // Ordenar por score y paginar
  scored.sort((a, b) => b._score - a._score);
  const paginated = scored.slice((page - 1) * LIMIT, page * LIMIT);

  return NextResponse.json({
    listings: paginated,
    hasMore: scored.length > page * LIMIT,
    page,
  });
}

// POST /api/discover — registrar descarte
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });

  await prisma.discoverDismiss.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
