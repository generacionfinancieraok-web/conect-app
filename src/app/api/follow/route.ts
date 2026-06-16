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

// GET /api/follow?userId=xxx — estado seguimiento
export async function GET(req: NextRequest) {
  const followerId = await getUserId(req);
  if (!followerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const followingId = req.nextUrl.searchParams.get('userId');
  if (!followingId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  const followersCount = await prisma.follow.count({ where: { followingId } });
  const followingCount = await prisma.follow.count({ where: { followerId: followingId } });

  return NextResponse.json({ isFollowing: !!follow, followersCount, followingCount });
}

// POST /api/follow — toggle follow
export async function POST(req: NextRequest) {
  const followerId = await getUserId(req);
  if (!followerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { followingId } = await req.json();
  if (!followingId) return NextResponse.json({ error: 'followingId requerido' }, { status: 400 });
  if (followerId === followingId)
    return NextResponse.json({ error: 'No podés seguirte a vos mismo' }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({ data: { followerId, followingId } });

  const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { name: true } });
  await sendPushNotification(followingId, {
    title: '👤 Nuevo seguidor',
    body: `${follower?.name} empezó a seguirte`,
    data: { type: 'NEW_FOLLOWER', userId: followerId },
  });
  await prisma.notification.create({
    data: {
      type: 'NEW_FOLLOWER',
      title: 'Nuevo seguidor',
      body: `${follower?.name} empezó a seguirte`,
      data: JSON.stringify({ userId: followerId }),
      userId: followingId,
    },
  });

  return NextResponse.json({ following: true });
}
