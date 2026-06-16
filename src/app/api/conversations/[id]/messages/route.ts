import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/conversations/:id/messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar que el usuario es participante
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      participants: { some: { id: session.user.id } },
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
      senderId: { not: session.user.id },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      participants: { some: { id: session.user.id } },
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
        senderId: session.user.id,
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

  return NextResponse.json({ message }, { status: 201 });
}
