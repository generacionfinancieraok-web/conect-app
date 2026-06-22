export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/cloudinary';
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

// GET /api/listings/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);

  const [listing, favoriteRecord] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { order: 'asc' } },
        user: {
          select: {
            id: true, name: true, image: true,
            rating: true, ratingCount: true, createdAt: true,
            completedSales: true, concretionRate: true, avgResponseMinutes: true,
          },
        },
        category: true,
        _count: { select: { conversations: true } },
      },
    }),
    userId
      ? prisma.favorite.findUnique({
          where: { userId_listingId: { userId, listingId: params.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!listing) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  // Incrementar vistas
  await prisma.listing.update({
    where: { id: params.id },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json({ listing: { ...listing, isFavorited: !!favoriteRecord } });
}

// PATCH /api/listings/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || listing.userId !== userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: body,
    include: { images: true, category: true },
  });

  return NextResponse.json({ listing: updated });
}

// DELETE /api/listings/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { images: true },
  });

  i