export const dynamic = 'force-dynamic';
/**
 * GET /api/listings/[id]/similar
 * Devuelve publicaciones similares basadas en categoría y rango de precio.
 * Se usa principalmente al rechazar una oferta para sugerir alternativas.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { categoryId: true, price: true, province: true, listingType: true },
  });

  if (!listing) return NextResponse.json({ listings: [] });

  const priceFloor = listing.price * 0.6;
  const priceCeil = listing.price * 1.4;

  const similar = await prisma.listing.findMany({
    where: {
      id: { not: params.id },
      status: 'ACTIVE',
      categoryId: listing.categoryId,
      listingType: listing.listingType ?? 'ITEM_WITH_PRICE',
      ...(listing.price > 0 && {
        price: { gte: priceFloor, lte: priceCeil },
      }),
    },
    include: {
      images: { orderBy: { order: 'asc' }, take: 1 },
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  return NextResponse.json({ listings: similar });
}
