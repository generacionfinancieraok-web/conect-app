import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/push';
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

// GET /api/conversations/:id/messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar que el usuario es participante
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      participants: { some: { id: userId } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = 30;

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Marcar mensajes recibidos como leídos
  await prisma.message.updateMany({
    where: {
      conversationId: params.id,
      senderId: { not: userId },
      read: false,
    },
    data: { read: true },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return NextResponse.json({
    messages: items.reverse(), // más viejos primero
    nextCursor: hasMore ? items[0].id : null,
  });
}

// POST /api/conversations/:id/messages — enviar mensaje
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      participants: { some: { id: userId } },
    },
    include: {
      participants: { select: { id: true, name: true } },
      listing: { select: { title: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  const { body } = await req.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        body: body.trim(),
        senderId: userId,
        conversationId: params.id,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Emitir via Socket.io
  const io = (global as any).io;
  if (io) {
    io.to(`conversation:${params.id}`).emit('new_message', message);
  }

  // Push notification + DB notification a los otros participantes
  const sender = conversation.participants.find((p) => p.id === userId);
  const recipients = conversation.participants.filter((p) => p.id !== userId);
  const preview = body.trim().length > 60 ? body.trim().slice(0, 60) + '…' : body.trim();
  const notifTitle = `💬 ${sender?.name ?? 'Alguien'}`;
  const notifBody = conversation.listing
    ? `${preview} · ${conversation.listing.title}`
    : preview;

  await Promise.all(
    recipients.map(async (r) => {
      await sendPushNotification(r.id, {
        title: notifTitle,
        body: notifBody,
        data: { type: 'MESSAGE', conversationId: params.id },
      });
      await prisma.notification.create({
        data: {
          type: 'MESSAGE',
          title: notifTitle,
          body: notifBody,
          data: JSON.stringify({ conversationId: params.id }),
          userId: r.id,
        },
      });
    })
  );

  return NextResponse.json({ message }, { status: 201 });
}
