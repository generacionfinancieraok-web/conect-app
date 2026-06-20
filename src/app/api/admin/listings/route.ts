import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  if (ADMIN_EMAILS.length === 0) return true;
  return ADMIN_EMAILS.includes(email);
}

// GET /api/admin/listings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const q = searchParams.get('q') || undefined;
  const page = Number(searchParams.get('page') || 1);
  const limit = 20;

  const where: any = {};
  if (status) where.status = status;
  if (q) where.title = { contains: q, mode: 'insensitive' };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        seller: { select: { id: true, name: true, email: true, image: true } },
        category: { select: { name: true } },
        _count: { select: { reports: true } },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({ listings, total, page, pages: Math.ceil(total / limit) });
}

// PATCH /api/admin/listings — Cambiar status de publicación
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { listingId, status } = await req.json();
  if (!listingId || !status) {
    return NextResponse.json({ error: 'listingId y status requeridos' }, { status: 400 });
  }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: { status },
  });

  return NextResponse.json(listing);
}
