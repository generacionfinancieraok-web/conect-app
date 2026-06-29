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

// PATCH /api/notifications/[id] — marcar una notificación como leída
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const notif = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notif || notif.userId !== userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id: params.id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
