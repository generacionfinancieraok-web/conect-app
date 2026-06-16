import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
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

// PATCH /api/offers/[id] — responder oferta (accept/reject/counter)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { title: true } },
      seller: { select: { name: true } },
      buyer: { select: { name: true } },
    },
  });
  if (!offer) return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 });
  if (offer.sellerId !== userId)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { action, counterAmount } = await req.json();

  let status: 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  let notifType: 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'OFFER_COUNTERED';
  let notifTitle: string;
  let notifBody: string;

  if (action === 'accept') {
    status = 'ACCEPTED';
    notifType = 'OFFER_ACCEPTED';
    notifTitle = '✅ Oferta aceptada';
    notifBody = `${offer.seller.name} aceptó tu oferta por "${offer.listing.title}"`;
  } else if (action === 'reject') {
    status = 'REJECTED';
    notifType = 'OFFER_REJECTED';
    notifTitle = '❌ Oferta rechazada';
    notifBody = `${offer.seller.name} rechazó tu oferta por "${offer.listing.title}"`;
  } else if (action === 'counter' && counterAmount) {
    status = 'COUNTERED';
    notifType = 'OFFER_COUNTERED';
    notifTitle = '🔄 Contraoferta recibida';
    notifBody = `${offer.seller.name} contraoferta $${counterAmount.toLocaleString()} por "${offer.listing.title}"`;
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: { status, ...(counterAmount ? { amount: counterAmount } : {}) },
  });

  await sendPushNotification(offer.buyerId, { title: notifTitle, body: notifBody, data: { type: notifType, offerId: offer.id } });
  await prisma.notification.create({
    data: { type: notifType, title: notifTitle, body: notifBody, data: JSON.stringify({ offerId: offer.id }), userId: offer.buyerId },
  });

  return NextResponse.json(updated);
}
