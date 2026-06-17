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

// GET /api/listings/[id]/stats
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      views: true,
      saves: true,
      promoted: true,
      promotedAt: true,
      _count: {
        select: {
          offers: true,
          favorites: true,
          conversations: true,
        },
      },
      offers: {
        select: { amount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      promotion: true,
    },
  });

  if (!listing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  if (listing.userId !== userId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  return NextResponse.json({
    views: listing.views,
    saves: listing.saves,
    offers: listing._count.offers,
    favorites: listing._count.favorites,
    conversations: listing._count.conversations,
    promoted: listing.promoted,
    promotedAt: listing.promotedAt,
    promotionExpiresAt: listing.promotion?.expiresAt ?? null,
    recentOffers: listing.offers,
  });
}
