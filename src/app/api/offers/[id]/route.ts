import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { sendPushNotification } from '@/lib/push';
import { sendOfferResponseEmail } from '@/lib/email';
import {
  recordOfferRejection,
  updateSellerReputation,
  updateBuyerReputation,
} from '@/lib/reputation';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// PATCH /api/offers/[id] — responder oferta (accept/reject/counter)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { title: true, currency: true } },
      seller: { select: { name: true } },
      buyer:  { select: { name: true, email: true } },
    },
  });
  if (!offer) return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 });
  if (offer.sellerId !== userId)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  if (offer.status !== 'PENDING')
    return NextResponse.json({ error: 'La oferta ya fue respondida o venció' }, { status: 400 });

  const { action, counterAmount } = await req.json();

  const responseMinutes = Math.round(
    (Date.now() - offer.createdAt.getTime()) / 60000
  );

  let status: 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  let notifType: 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'OFFER_COUNTERED';
  let notifTitle: string;
  let notifBody: string;
  let emailAction: 'accepted' | 'rejected' | 'countered';

  if (action === 'accept') {
    status = 'ACCEPTED';
    notifType = 'OFFER_ACCEPTED';
    notifTitle = '✅ Oferta aceptada';
    notifBody = `${offer.seller.name} aceptó tu oferta por "${offer.listing.title}"`;
    emailAction = 'accepted';
  } else if (action === 'reject') {
    status = 'REJECTED';
    notifType = 'OFFER_REJECTED';
    notifTitle = '❌ Oferta rechazada';
    notifBody = `${offer.seller.name} rechazó tu oferta por "${offer.listing.title}"`;
    emailAction = 'rejected';
  } else if (action === 'counter' && counterAmount) {
    status = 'COUNTERED';
    notifType = 'OFFER_COUNTERED';
    notifTitle = '🔄 Contraoferta recibida';
    notifBody = `${offer.seller.name} contraoferta ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: offer.listing.currency }).format(counterAmount)} por "${offer.listing.title}"`;
    emailAction = 'countered';
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: { status, ...(counterAmount ? { amount: counterAmount } : {}) },
  });

  // Actualizar reputación — no bloqueante
  if (action === 'reject') {
    recordOfferRejection(offer.buyerId, offer.listingId, 'rejected').catch(() => {});
  }
  if (action === 'accept') {
    prisma.user.update({
      where: { id: userId },
      data: { totalAcceptedOffers: { increment: 1 } },
    }).then(() => updateSellerReputation(userId, { responseMinutes })).catch(() => {});
    updateBuyerReputation(offer.buyerId).catch(() => {});
  }

  // Notificaciones
  await Promise.all([
    sendPushNotification(offer.buyerId, {
      title: notifTitle,
      body: notifBody,
      data: { type: notifType, offerId: offer.id },
    }),
    prisma.notification.create({
      data: {
        type: notifType,
        title: notifTitle,
        body: notifBody,
        data: JSON.stringify({ offerId: offer.id }),
        userId: offer.buyerId,
      },
    }),
    offer.buyer?.email
      ? sendOfferResponseEmail(
          offer.buyer.email,
          offer.seller.name ?? 'El vendedor',
          offer.listing.title,
          emailAction,
          counterAmount,
          offer.listing.currency,
        ).catch(() => {})
      : Promise.resolve(),
  ]);

  // Si la oferta fue rechazada, devolver publicaciones similares para sugerir
  let similarListings: any[] = [];
  if (action === 'reject') {
    const fullListing = await prisma.listing.findUnique({
      where: { id: offer.listingId },
      select: { categoryId: true, price: true, listingType: true },
    });
    if (fullListing) {
      const priceFloor = (fullListing.price ?? 0) * 0.6;
      const priceCeil = (fullListing.price ?? 0) * 1.4;
      similarListings = await prisma.listing.findMany({
        where: {
          id: { not: offer.listingId },
          status: 'ACTIVE',
          categoryId: fullListing.categoryId,
          ...(fullListing.price > 0 && { price: { gte: priceFloor, lte: priceCeil } }),
        },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      });
    }
  }

  return NextResponse.json({ ...updated, similarListings });
}
