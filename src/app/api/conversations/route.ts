import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/conversations — listar conversaciones del usuario
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: session.user.id } },
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

  return NextResponse.json({ conversations });
}

// POST /api/conversations — iniciar una conversación
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { listingId, initialMessage } = await req.json();

  if (!listingId) {
    return NextResponse.json({ error: 'listingId requerido' }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  if (listing.userId === session.user.id) {
    return NextResponse.json({ error: 'No puedes contactarte contigo mismo' }, { status: 400 });
  }

  // Verificar si ya existe conversación entre estos usuarios para este listing
  const existing = await prisma.conversation.findFirst({
    where: {
      listingId,
      participants: {
        every: { id: { in: [session.user.id, listing.userId] } },
      },
    },
  });

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  const conversation = await prisma.conversation.create({
    data: {
      listingId,
      participants: {
        connect: [{ id: session.user.id }, { id: listing.userId }],
      },
      ...(initialMessage && {
        messages: {
          create: {
            body: initialMessage,
            senderId: session.user.id,
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

  return NextResponse.json({ conversation }, { status: 201 });
}
