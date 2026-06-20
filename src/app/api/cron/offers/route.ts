/**
 * GET /api/cron/offers
 * Cron job que expira ofertas vencidas y envía alertas de expiración próxima.
 * Llamar con Authorization: Bearer <CRON_SECRET> desde Railway Cron o similar.
 *
 * Ejecutar cada hora: Railway Cron → "0 * * * *"
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/push';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // 1. Expirar ofertas vencidas
  const expired = await prisma.offer.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  // 2. Notificar ofertas que vencen en las próximas 2 horas (sin notif previa)
  const expiringSoon = await prisma.offer.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { gte: now, lte: twoHoursFromNow },
    },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true } },
    },
  });

  let notified = 0;
  for (const offer of expiringSoon) {
    // Notificar al comprador que su oferta está por vencer
    await sendPushNotification(offer.buyerId, {
      title: '⏰ Tu oferta está por vencer',
      body: `Tu oferta para "${offer.listing.title}" vence en menos de 2 horas.`,
      data: { type: 'OFFER_EXPIRING_SOON', offerId: offer.id },
    }).catch(() => {});

    // Notificar al vendedor para que responda
    await sendPushNotification(offer.sellerId, {
      title: '⏰ Oferta próxima a vencer',
      body: `La oferta de ${offer.buyer.name} para "${offer.listing.title}" vence pronto.`,
      data: { type: 'OFFER_EXPIRING_SOON', offerId: offer.id },
    }).catch(() => {});

    // Crear notificación en DB para el comprador
    await prisma.notification.create({
      data: {
        type: 'OFFER_EXPIRING_SOON',
        title: '⏰ Tu oferta vence pronto',
        body: `Tu oferta para "${offer.listing.title}" vence en menos de 2 horas.`,
        data: JSON.stringify({ offerId: offer.id }),
        userId: offer.buyerId,
      },
    }).catch(() => {});

    notified++;
  }

  return NextResponse.json({
    ok: true,
    expired: expired.count,
    expiringSoonNotified: notified,
    timestamp: now.toISOString(),
  });
}
