/**
 * PATCH /api/conversations/[id]/request
 * Acepta o rechaza una solicitud de chat (Tipo 3 — Servicios)
 * body: { action: 'accept' | 'reject' }
 */
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { id: true, name: true } },
      listing: { select: { title: true, userId: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  if (conv.status !== 'PENDING_REQUEST')
    return NextResponse.json({ error: 'No hay solicitud pendiente' }, { status: 400 });

  // Solo el dueño del listing puede aceptar/rechazar
  if (conv.listing.userId !== userId)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { action } = await req.json();
  if (action !== 'accept' && action !== 'reject')
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  const newStatus = action === 'accept' ? 'ACTIVE' : 'REJECTED';

  await prisma.conversation.update({
    where: { id: params.id },
    data: { status: newStatus },
  });

  // Notificar al solicitante
  const requesterId = conv.requesterId;
  if (requesterId) {
    const type = action === 'accept' ? 'MESSAGE_REQUEST_ACCEPTED' : 'MESSAGE_REQUEST_REJECTED';
    const title = action === 'accept' ? '✅ Solicitud de chat aceptada' : '❌ Solicitud rechazada';
    const body = action === 'accept'
      ? `El prestador aceptó tu solicitud para "${conv.listing.title}"`
      : `Tu solicitud para "${conv.listing.title}" fue rechazada`;

    sendPushNotification(requesterId, { title, body, data: { type, conversationId: params.id } }).catch(() => {});
    prisma.notification.create({
      data: { type, title, body, data: JSON.stringify({ conversationId: params.id }), userId: requesterId },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
