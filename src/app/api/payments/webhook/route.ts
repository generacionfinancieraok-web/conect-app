import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mpPayment } from '@/lib/mercadopago';
import crypto from 'crypto';
import { sendPushNotification } from '@/lib/push';

/**
 * Verifica la firma HMAC de MercadoPago para evitar requests fraudulentos.
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
function verifyMPSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Si no está configurado, aceptar (durante desarrollo)

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  const dataId = new URL(req.url).searchParams.get('data.id');

  if (!xSignature) return false;

  // Parsear ts y v1 del header
  const parts = Object.fromEntries(xSignature.split(',').map((p) => p.trim().split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Construir el manifest string
  const manifest = `id:${dataId ?? ''};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verificar firma (requiere MERCADOPAGO_WEBHOOK_SECRET en env vars)
    if (!verifyMPSignature(req, rawBody)) {
      console.warn('[Webhook] Firma inválida de MercadoPago');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { type, data } = body;

    if (type === 'payment' && data?.id) {
      const mpData = await mpPayment.get({ id: data.id });

      const status =
        mpData.status === 'approved' ? 'APPROVED'
        : mpData.status === 'rejected' ? 'REJECTED'
        : 'PENDING';

      const listingId = mpData.metadata?.listing_id;

      // Actualizar pago en DB
      const payments = await prisma.payment.findMany({
        where: { mpPreferenceId: mpData.preference_id ?? undefined },
        include: { user: { select: { id: true } }, listing: { select: { title: true, userId: true } } },
      });

      await prisma.payment.updateMany({
        where: { mpPreferenceId: mpData.preference_id ?? undefined },
        data: { status, mpPaymentId: String(data.id), updatedAt: new Date() },
      });

      // Si fue aprobado, marcar listing como vendido y notificar
      if (status === 'APPROVED' && listingId) {
        await prisma.listing.update({
          where: { id: listingId },
          data: { status: 'SOLD' },
        });

        // Notificar al comprador
        const payment = payments[0];
        if (payment?.user?.id) {
          await sendPushNotification(payment.user.id, {
            title: '✅ Pago aprobado',
            body: `Tu pago por "${payment.listing?.title ?? 'la publicación'}" fue aprobado`,
            data: { type: 'PAYMENT', listingId },
          });
          await prisma.notification.create({
            data: {
              type: 'PAYMENT',
              title: 'Pago aprobado',
              body: `Tu pago por "${payment.listing?.title ?? 'la publicación'}" fue aprobado`,
              data: JSON.stringify({ listingId }),
              userId: payment.user.id,
            },
          });
        }

        // Notificar al vendedor
        if (payment?.listing?.userId) {
          await sendPushNotification(payment.listing.userId, {
            title: '💰 ¡Vendiste!',
            body: `Tu publicación "${payment.listing.title}" fue pagada`,
            data: { type: 'PAYMENT', listingId },
          });
          await prisma.notification.create({
            data: {
              type: 'PAYMENT',
              title: '¡Vendiste!',
              body: `Tu publicación "${payment.listing.title}" fue pagada`,
              data: JSON.stringify({ listingId }),
              userId: payment.listing.userId,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook MercadoPago]', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
