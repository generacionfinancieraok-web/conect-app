import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      rating: true,
      ratingCount: true,
      isVerified: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, listings: true },
      },
      listings: {
        where: { status: { in: ['ACTIVE', 'SOLD'] } },
        orderBy: [{ promoted: 'desc' }, { createdAt: 'desc' }],
        take: 30,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
          user: { select: { id: true, name: true, image: true, isVerified: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          reviewer: { select: { id: true, name: true, image: true, isVerified: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  return NextResponse.json({
    profile: {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      listingsCount: user._count.listings,
    },
  });
}
