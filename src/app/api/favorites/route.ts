import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// GET /api/favorites — lista favoritos del usuario
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      listing: {
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          user: { select: { id: true, name: true, image: true } },
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(favorites.map((f) => f.listing));
}

// POST /api/favorites — toggle favorito
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.listing.update({ where: { id: listingId }, data: { saves: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ favorited: false });
  }

  await prisma.$transaction([
    prisma.favorite.create({ data: { userId, listingId } }),
    prisma.listing.update({ where: { id: listingId }, data: { saves: { increment: 1 } } }),
  ]);
  return NextResponse.json({ favorited: true });
}
