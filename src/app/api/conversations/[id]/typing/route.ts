export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { chatEmitter } from '@/lib/chat-emitter';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// POST /api/conversations/[id]/typing — emite indicador de escritura
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  // Validate participation (lightweight check)
  const ok = await prisma.conversation.findFirst({
    where: { id: params.id, participants: { some: { id: userId } } },
    select: { id: true },
  });
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  chatEmitter.emit(`typing:${params.id}`, { userId });
  return NextResponse.json({ ok: true });
}
