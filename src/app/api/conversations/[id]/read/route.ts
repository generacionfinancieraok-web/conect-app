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

// POST /api/conversations/[id]/read — marca todos los mensajes de otros como leídos
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id: conversationId } = params;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { id: userId } } },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      read: false,
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
