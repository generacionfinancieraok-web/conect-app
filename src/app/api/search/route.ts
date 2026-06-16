import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category');
  const province = searchParams.get('province');
  const city = searchParams.get('city');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const condition = searchParams.get('condition');
  const sortBy = searchParams.get('sortBy') || 'newest';

  const where: any = {
    status: 'ACTIVE',
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    }),
    ...(category && { category: { slug: category } }),
    ...(province && { province: { contains: province, mode: 'insensitive' } }),
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
    ...(condition && { condition }),
    ...((minPrice || maxPrice) && {
      price: {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) }),
      },
    }),
  };

  const orderBy: any =
    sortBy === 'price_asc' ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : { createdAt: 'desc' };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: { select: { id: true, name: true, image: true } },
        category: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({
    listings,
    query: q,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
