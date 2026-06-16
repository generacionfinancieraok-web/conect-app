import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mpPayment } from '@/lib/mercadopago';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === 'payment' && data?.id) {
      const mpData = await mpPayment.get({ id: data.id });

      const status =
        mpData.status === 'approved' ? 'APPROVED'
        : mpData.status === 'rejected' ? 'REJECTED'
        : 'PENDING';

      const listingId = mpData.metadata?.listing_id;

      // Actualizar pago en DB
      await prisma.payment.updateMany({
        where: { mpPreferenceId: mpData.preference_id ?? undefined },
        data: {
          status,
          mpPaymentId: String(data.id),
          updatedAt: new Date(),
        },
      });

      // Si fue aprobado, marcar listing como vendido
      if (status === 'APPROVED' && listingId) {
        await prisma.listing.update({
          where: { id: listingId },
          data: { status: 'SOLD' },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook MercadoPago]', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
