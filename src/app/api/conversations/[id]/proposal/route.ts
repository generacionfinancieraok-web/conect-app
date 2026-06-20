/**
 * POST /api/conversations/[id]/proposal
 * Envía una propuesta formal (Tipo 3 — Servicios).
 * El prestador la crea; el cliente puede Aceptar / Rechazar / Contraofertar.
 *
 * PATCH /api/conversations/[id]/proposal
 * Responde a la propuesta formal.
 * body: { messageId, action: 'accept' | 'reject' | 'counter', counterAmount?, counterNote? }
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

// POST — crear propuesta formal
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { id: true } },
      listing: { select: { title: true, userId: true, serviceUnit: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  if (conv.status !== 'ACTIVE')
    return NextResponse.json({ error: 'El chat no está activo' }, { status: 400 });

  // Solo el prestador (dueño del listing) puede enviar propuesta
  if (conv.listing.userId !== userId)
    return NextResponse.json({ error: 'Solo el prestador puede enviar propuestas formales' }, { status: 403 });

  const { service, price, deadline, validHours = 48, note } = await req.json();
  if (!service || !price)
    return NextResponse.json({ error: 'Falta servicio o precio' }, { status: 400 });

  const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000);

  const proposalData = {
    type: 'proposal',
    service,
    price,
    deadline,
    validHours,
    expiresAt: expiresAt.toISOString(),
    note,
    status: 'pending', // pending | accepted | rejected | countered
  };

  const message = await prisma.message.create({
    data: {
      body: `📋 Propuesta formal: ${service} — $${price.toLocaleString('es-AR')}`,
      messageType: 'proposal',
      metadata: JSON.stringify(proposalData),
      senderId: userId,
      conversationId: params.id,
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Notificar al cliente
  const clientId = conv.participants.find((p) => p.id !== userId)?.id;
  if (clientId) {
    sendPushNotification(clientId, {
      title: '📋 Nueva propuesta formal',
      body: `${message.sender.name} te envió una propuesta para "${conv.listing.title}"`,
      data: { type: 'MESSAGE', conversationId: params.id },
    }).catch(() => {});
  }

  return NextResponse.json({ ...message, proposal: proposalData }, { status: 201 });
}

// PATCH — responder propuesta
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: { select: { id: true } },
      listing: { select: { title: true, userId: true } },
    },
  });

  if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });

  const { messageId, action, counterAmount, counterNote } = await req.json();

  const originalMessage = await prisma.message.findUnique({ where: { id: messageId } });
  if (!originalMessage || originalMessage.messageType !== 'proposal')
    return NextResponse.json({ error: 'Mensaje de propuesta no encontrado' }, { status: 404 });

  const proposal = JSON.parse(originalMessage.metadata ?? '{}');

  // Solo el cliente puede responder (no el prestador)
  if (conv.listing.userId === userId)
    return NextResponse.json({ error: 'El prestador no puede responder su propia propuesta' }, { status: 403 });

  if (action !== 'accept' && action !== 'reject' && action !== 'counter')
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  // Actualizar metadata del mensaje original
  const updatedProposal = { ...proposal, status: action };
  await prisma.message.update({
    where: { id: messageId },
    data: { metadata: JSON.stringify(updatedProposal) },
  });

  // Enviar mensaje de respuesta en el chat
  const responseTexts: Record<string, string> = {
    accept: `✅ Propuesta aceptada: ${proposal.service}`,
    reject: `❌ Propuesta rechazada`,
    counter: `🔄 Contraoferta: $${counterAmount?.toLocaleString('es-AR')}${counterNote ? ` — ${counterNote}` : ''}`,
  };

  await prisma.message.create({
    data: {
      body: responseTexts[action],
      messageType: action === 'counter' ? 'proposal' : 'system',
      metadata: action === 'counter'
        ? JSON.stringify({
            type: 'counter_proposal',
            originalMessageId: messageId,
            price: counterAmount,
            note: counterNote,
            status: 'pending',
          })
        : null,
      senderId: userId,
      conversationId: params.id,
    },
  });

  // Si acepta, marcar servicio como contratado en el chat
  if (action === 'accept') {
    await prisma.conversation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });
  }

  // Notificar al prestador
  const prestadorId = conv.listing.userId;
  const notifTitle = action === 'accept' ? '✅ Propuesta aceptada' : action === 'reject' ? '❌ Propuesta rechazada' : '🔄 Contraoferta recibida';
  sendPushNotification(prestadorId, {
    title: notifTitle,
    body: `Respuesta a tu propuesta para "${conv.listing.title}"`,
    data: { type: 'MESSAGE', conversationId: params.id },
  }).catch(() => {});

  return NextResponse.json({ ok: true, action });
}
