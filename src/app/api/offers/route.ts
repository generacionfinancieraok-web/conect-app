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

// GET /api/offers?type=received|sent
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type') ?? 'received';

  const offers = await prisma.offer.findMany({
    where: type === 'received' ? { sellerId: userId } : { buyerId: userId },
    include: {
      listing: {
        include: { images: { take: 1, orderBy: { order: 'asc' } } },
      },
      buyer: { select: { id: true, name: true, image: true, rating: true, isVerified: true } },
      seller: { select: { id: true, name: true, image: true, rating: true, isVerified: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(offers);
}

// POST /api/offers — crear oferta
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { listingId, amount, message } = await req.json();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { user: true },
  });
  if (!listing) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  if (listing.userId === userId)
    return NextResponse.json({ error: 'No podés hacerte una oferta a vos mismo' }, { status: 400 });
  if (listing.status !== 'ACTIVE')
    return NextResponse.json({ error: 'La publicación no está disponible' }, { status: 400 });

  // Solo una oferta pendiente por publicación/comprador
  const existing = await prisma.offer.findFirst({
    where: { listingId, buyerId: userId, status: 'PENDING' },
  });
  if (existing)
    return NextResponse.json({ error: 'Ya tenés una oferta pendiente para esta publicación' }, { status: 400 });

  const offer = await prisma.offer.create({
    data: { listingId, buyerId: userId, sellerId: listing.userId, amount, message },
    include: {
      buyer: { select: { id: true, name: true, image: true } },
      listing: { select: { title: true } },
    },
  });

  // Notificación push al vendedor
  await sendPushNotification(listing.userId, {
    title: '💰 Nueva oferta recibida',
    body: `${offer.buyer.name} ofrece $${amount.toLocaleString()} por "${listing.title}"`,
    data: { type: 'OFFER', offerId: offer.id },
  });

  // Notificación en base de datos
  await prisma.notification.create({
    data: {
      type: 'OFFER',
      title: 'Nueva oferta recibida',
      body: `${offer.buyer.name} ofrece $${amount.toLocaleString()} por "${listing.title}"`,
      data: JSON.stringify({ offerId: offer.id, listingId }),
      userId: listing.userId,
    },
  });

  return NextResponse.json(offer, { status: 201 });
}
