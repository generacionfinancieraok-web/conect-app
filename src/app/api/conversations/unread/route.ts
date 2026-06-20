export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/conversations/unread — conteo de mensajes no leídos del usuario
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.message.count({
    where: {
      read: false,
      senderId: { not: session.user.id },
      conversation: {
        participants: { some: { id: session.user.id } },
      },
    },
  });

  return NextResponse.json({ count });
}
