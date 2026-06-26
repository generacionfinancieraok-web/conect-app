import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

// GET /api/conversations — listar conversaciones del usuario
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: userId } },
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          images: { orderBy: { order: 'asc' }, take: 1 },
        },
      },
      participants: {
        select: { id: true, name: true, image: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Agregar conteo de mensajes no leídos por conversación
  const unreadCounts = await Promise.all(
    conversations.map((c) =>
      prisma.message.count({
        where: { conversationId: c.id, read: false, senderId: { not: userId } },
      })
    )
  );

  const withUnread = conversations.map((c, i) => ({
    ...c,
    unreadCount: unreadCounts[i],
  }));

  return NextResponse.json({ conversations: withUnread });
}

// POST /api/conversations — iniciar una conversación
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { listingId, initialMessage, requestMessage, asPendingRequest } = await req.json();

  if (!listingId) {
    return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  if (listing.userId === userId) {
    return NextResponse.json({ error: 'No puedes contactarte contigo mismo' }, { status: 400 });
  }

  // Verificar si ya existe conversación entre estos usuarios para este listing
  const existing = await prisma.conversation.findFirst({
    where: {
      listingId,
      participants: {
        every: { id: { in: [userId, listing.userId] } },
      },
    },
  });

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  // Para servicios (Tipo 3): la conversación empieza en PENDING_REQUEST
  const isPendingRequest = asPendingRequest === true && listing.listingType === 'SERVICE';
  const msgBody = requestMessage || initialMessage;

  const conversation = await prisma.conversation.create({
    data: {
      listingId,
      status: isPendingRequest ? 'PENDING_REQUEST' : 'ACTIVE',
      requesterId: isPendingRequest ? userId : null,
      requestMessage: isPendingRequest ? (msgBody ?? null) : null,
      participants: {
        connect: [{ id: userId }, { id: listing.userId }],
      },
      ...(msgBody && {
        messages: {
          create: {
            body: msgBody,
            senderId: userId,
          },
        },
      }),
    },
    include: {
      listing: { select: { id: true, title: true, price: true } },
      participants: { select: { id: true, name: true, image: true } },
      messages: { include: { sender: { select: { id: true, name: true, image: true } } } },
    },
  });

  // Notificar al prestador si es solicitud pendiente
  if (isPendingRequest) {
    const { sendPushNotification } = await import('@/lib/push');
    sendPushNotification(listing.userId, {
      title: '📩 Nueva solicitud de chat',
      body: `Alguien quiere contactarte sobre "${listing.title}"`,
      data: { type: 'MESSAGE_REQUEST', conversationId: conversation.id },
    }).catch(() => {});
    prisma.notification.create({
      data: {
        type: 'MESSAGE_REQUEST',
        title: '📩 Nueva solicitud de chat',
        body: `Alguien quiere contactarte sobre "${listing.title}"`,
        data: JSON.stringify({ conversationId: conversation.id }),
        userId: listing.userId,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ conversation }, { status: 201 });
}
