import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPreference } from '@/lib/mercadopago';
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

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { listingId } = await req.json();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { user: true },
  });

  if (!listing) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  if (listing.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Esta publicación ya no está disponible' }, { status: 400 });
  }

  if (listing.userId === userId) {
    return NextResponse.json({ error: 'No puedes comprar tu propia publicación' }, { status: 400 });
  }

  const buyer = await prisma.user.findUnique({ where: { id: userId } });
  if (!buyer?.email) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 400 });
  }

  const preference = await createPreference({
    listingId: listing.id,
    listingTitle: listing.title,
    price: listing.price,
    currency: listing.currency,
    buyerEmail: buyer.email,
  });

  // Guardar pago pendiente
  const payment = await prisma.payment.create({
    data: {
      amount: listing.price,
      currency: listing.currency,
      status: 'PENDING',
      mpPreferenceId: preference.id,
      userId,
      listingId: listing.id,
    },
  });

  return NextResponse.json({
    preferenceId: preference.id,
    initPoint: preference.init_point,
    paymentId: payment.id,
  });
}
