import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

// GET /api/reviews?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { reviewedId: userId },
    include: { reviewer: { select: { id: true, name: true, image: true, isVerified: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return NextResponse.json({ reviews, average: avg, count: reviews.length });
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  const reviewerId = await getUserId(req);
  if (!reviewerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { reviewedId, rating, comment, listingId } = await req.json();

  if (!reviewedId || !rating)
    return NextResponse.json({ error: 'reviewedId y rating son requeridos' }, { status: 400 });
  if (reviewedId === reviewerId)
    return NextResponse.json({ error: 'No podés calificarte a vos mismo' }, { status: 400 });
  if (rating < 1 || rating > 5)
    return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 });

  const existing = await prisma.review.findUnique({
    where: { reviewerId_reviewedId: { reviewerId, reviewedId } },
  });
  if (existing) return NextResponse.json({ error: 'Ya calificaste a este usuario' }, { status: 400 });

  const review = await prisma.review.create({
    data: { reviewerId, reviewedId, rating, comment, listingId },
    include: { reviewer: { select: { name: true } } },
  });

  // Recalcular rating promedio del usuario calificado
  const allReviews = await prisma.review.findMany({ where: { reviewedId } });
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await prisma.user.update({
    where: { id: reviewedId },
    data: { rating: avg, ratingCount: allReviews.length },
  });

  // Notificación
  await sendPushNotification(reviewedId, {
    title: '⭐ Nueva calificación',
    body: `${review.reviewer.name} te dio ${rating} estrella${rating !== 1 ? 's' : ''}`,
    data: { type: 'REVIEW' },
  });
  await prisma.notification.create({
    data: {
      type: 'REVIEW',
      title: 'Nueva calificación',
      body: `${review.reviewer.name} te dio ${rating} estrella${rating !== 1 ? 's' : ''}`,
      userId: reviewedId,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
