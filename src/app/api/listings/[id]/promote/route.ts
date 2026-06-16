import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
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

// POST /api/listings/[id]/promote
// En producción: integrar pago. Por ahora activa por 7 días directo.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  if (listing.userId !== userId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: params.id },
      data: { promoted: true, promotedAt: new Date() },
    }),
    prisma.promotion.upsert({
      where: { listingId: params.id },
      update: { expiresAt },
      create: { listingId: params.id, expiresAt },
    }),
  ]);

  return NextResponse.json({ promoted: true, expiresAt });
}

// DELETE /api/listings/[id]/promote — quitar destacado
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || listing.userId !== userId)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  await prisma.$transaction([
    prisma.listing.update({ where: { id: params.id }, data: { promoted: false, promotedAt: null } }),
    prisma.promotion.deleteMany({ where: { listingId: params.id } }),
  ]);

  return NextResponse.json({ promoted: false });
}
