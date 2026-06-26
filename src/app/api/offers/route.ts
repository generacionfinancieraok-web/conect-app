import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { sendPushNotification } from '@/lib/push';
import { sendNewOfferEmail } from '@/lib/email';
import {
  canBuyerMakeOffer,
  getBuyerLabel,
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

// GET /api/offers?type=received|sent
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type') ?? 'received';

  // Marcar como expiradas las que vencieron
  await prisma.offer.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
      ...(type === 'received' ? { sellerId: userId } : { buyerId: userId }),
    },
    data: { status: 'EXPIRED' },
  });

  const offers = await prisma.offer.findMany({
    where: type === 'received' ? { sellerId: userId } : { buyerId: userId },
    include: {
      listing: {
        include: { images: { take: 1, orderBy: { order: 'asc' } } },
      },
      buyer: { select: { id: true, name: true, image: true, buyerLevel: true, completedPurchases: true } },
      seller: { select: { id: true, name: true, image: true, concretionRate: true, completedSales: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Agregar etiqueta de comprador para el vendedor
  const offersWithLabel = offers.map((o) => ({
    ...o,
    buyerLabel: type === 'received'
      ? getBuyerLabel(o.buyer.buyerLevel, o.buyer.completedPurchases)
      : undefined,
  }));

  return NextResponse.json(offersWithLabel);
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

  // Solo artículos con/sin precio aceptan ofertas (Tipo 1 y 2)
  if (listing.listingType === 'SERVICE')
    return NextResponse.json({ error: 'Los servicios no aceptan ofertas directas. Usá Enviar Mensaje.' }, { status: 400 });

  // Verificar precio mínimo (Tipo 1)
  if (listing.listingType === 'ITEM_WITH_PRICE' && listing.minPrice && amount < listing.minPrice) {
    const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: listing.currency }).format(listing.minPrice);
    return NextResponse.json({
      error: `El vendedor no acepta ofertas menores a ${formatted}`,
    }, { status: 400 });
  }

  // Verificar si el comprador puede ofertar
  const { allowed, reason } = await canBuyerMakeOffer(userId, listingId);
  if (!allowed) {
    return NextResponse.json({ error: reason }, { status: 429 });
  }

  // Solo una oferta pendiente por publicación/comprador
  const existing = await prisma.offer.findFirst({
    where: { listingId, buyerId: userId, status: 'PENDING' },
  });
  if (existing)
    return NextResponse.json({ error: 'Ya tenés una oferta pendiente para esta publicación' }, { status: 400 });

  // Obtener retryCount del bloque actual
  const block = await prisma.offerBlock.findUnique({
    where: { buyerId_listingId: { buyerId: userId, listingId } },
  });

  const offer = await prisma.offer.create({
    data: {
      listingId,
      buyerId: userId,
      sellerId: listing.userId,
      amount,
      message,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24hs
      retryCount: block?.ignoredCount ?? 0,
    },
    include: {
      buyer: { select: { id: true, name: true, image: true, buyerLevel: true, completedPurchases: true } },
      listing: { select: { title: true, currency: true } },
    },
  });

  const buyerLabel = getBuyerLabel(offer.buyer.buyerLevel, offer.buyer.completedPurchases);
  const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: listing.currency }).format(amount);

  // Notificaciones al vendedor — no bloqueantes
  Promise.all([
    sendPushNotification(listing.userId, {
      title: '💰 Nueva oferta recibida',
      body: `${offer.buyer.name} ofrece ${formatted} por "${listing.title}"`,
      data: { type: 'OFFER', offerId: offer.id },
    }),
    prisma.notification.create({
      data: {
        type: 'OFFER',
        title: 'Nueva oferta recibida',
        body: `${offer.buyer.name} ofrece ${formatted} por "${listing.title}"`,
        data: JSON.stringify({ offerId: offer.id, listingId, buyerLabel }),
        userId: listing.userId,
      },
    }),
    listing.user?.email
      ? sendNewOfferEmail(
          listing.user.email,
          offer.buyer.name ?? 'Alguien',
          listing.title,
          amount,
          listing.currency,
          offer.id,
        ).catch(() => {})
      : Promise.resolve(),
  ]).catch(() => {});

  return NextResponse.json({ ...offer, buyerLabel }, { status: 201 });
}
