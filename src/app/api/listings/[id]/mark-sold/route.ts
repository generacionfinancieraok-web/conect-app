/**
 * POST /api/listings/[id]/mark-sold
 * Marca la publicación como vendida y actualiza la reputación del vendedor.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { updateSellerReputation } from '@/lib/reputation';
import { sendPushNotification } from '@/lib/push';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      offers: {
        where: { status: 'ACCEPTED' },
        include: { buyer: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!listing) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  if (listing.userId !== userId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  if (listing.status === 'SOLD') return NextResponse.json({ error: 'Ya está marcada como vendida' }, { status: 400 });

  await prisma.listing.update({
    where: { id: params.id },
    data: { status: 'SOLD' },
  });

  // Actualizar reputación del vendedor
  await updateSellerReputation(userId, { newSale: true });

  // Actualizar compras concretadas del comprador (si hay oferta aceptada)
  const buyer = listing.offers[0]?.buyer;
  if (buyer) {
    await prisma.user.update({
      where: { id: buyer.id },
      data: { completedPurchases: { increment: 1 } },
    });

    // Notificar al comprador
    sendPushNotification(buyer.id, {
      title: '🎉 ¡Venta concretada!',
      body: `La venta de "${listing.title}" fue marcada como concretada.`,
      data: { type: 'LISTING_SOLD', listingId: listing.id },
    }).catch(() => {});

    prisma.notification.create({
      data: {
        type: 'LISTING_SOLD',
        title: '🎉 Venta concretada',
        body: `La venta de "${listing.title}" fue marcada como concretada. ¡Calificá tu experiencia!`,
        data: JSON.stringify({ listingId: listing.id }),
        userId: buyer.id,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, status: 'SOLD' });
}
