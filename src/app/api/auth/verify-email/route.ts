import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getIP } from '@/lib/rateLimit';
import { sendEmailVerification } from '@/lib/email';
import { requireAuth } from '@/lib/requireAuth';

/**
 * POST /api/auth/verify-email
 * Envía (o reenvía) el email de verificación al usuario autenticado.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const rl = rateLimit(`verify-email:${auth.id}`, { limit: 3, windowSecs: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Máximo 3 reenvíos por hora. Revisá tu bandeja de spam.' },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpires: expires },
  });

  await sendEmailVerification(user.email, user.name || 'Usuario', token);

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/auth/verify-email?token=xxx
 * Confirma el token y marca el email como verificado.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Token inválido o expirado. Solicitá un nuevo enlace.' },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerifyToken: null,
      emailVerifyExpires: null,
    },
  });

  // Redirect al frontend con confirmación
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/email-verificado`);
}
