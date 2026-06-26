import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { rateLimit, getIP } from '@/lib/rateLimit';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// POST /api/reports
export async function POST(req: NextRequest) {
  // Rate limit: 5 reportes por IP por hora
  const rl = rateLimit(`report:${getIP(req)}`, { limit: 5, windowSecs: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados reportes. Intentá más tarde.' }, { status: 429 });
  }

  const reporterId = await getUserId(req);
  if (!reporterId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { reason, details, listingId, userId } = await req.json();
  if (!reason) return NextResponse.json({ error: 'Motivo requerido' }, { status: 400 });
  if (!listingId && !userId)
    return NextResponse.json({ error: 'Debe indicar listingId o userId' }, { status: 400 });

  const report = await prisma.report.create({
    data: { reporterId, reason, details, listingId, userId },
  });

  return NextResponse.json(report, { status: 201 });
}
