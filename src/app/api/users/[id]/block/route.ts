/**
 * POST /api/users/[id]/block  — bloquear usuario (invisible para el bloqueado)
 * DELETE /api/users/[id]/block — desbloquear
 * GET /api/users/[id]/block   — verificar si está bloqueado
 */
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const blockerId = await getUserId(req);
  if (!blockerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const blockedId = params.id;
  if (blockerId === blockedId)
    return NextResponse.json({ error: 'No podés bloquearte a vos mismo' }, { status: 400 });

  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const blockerId = await getUserId(req);
  if (!blockerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const blockedId = params.id;

  await prisma.blockedUser.deleteMany({
    where: { blockerId, blockedId },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const blockerId = await getUserId(req);
  if (!blockerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const blockedId = params.id;
  const block = await prisma.blockedUser.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });

  // También verificar si el otro me bloqueó a mí
  const blockedByOther = await prisma.blockedUser.findUnique({
    where: { blockerId_blockedId: { blockerId: blockedId, blockedId: blockerId } },
  });

  return NextResponse.json({
    iBlocked: !!block,
    theyBlocked: !!blockedByOther,
    isBlocked: !!(block || blockedByOther),
  });
}
