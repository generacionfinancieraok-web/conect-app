import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getIP } from '@/lib/rateLimit';
import { requireAuth } from '@/lib/requireAuth';

/**
 * POST /api/auth/verify-sms
 * Body: { code: "123456" }
 * Verifica el código SMS y marca el teléfono como verificado.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Anti-brute-force: 5 intentos por usuario por 10 minutos
  const rl = rateLimit(`verify-sms:${auth.id}`, { limit: 5, windowSecs: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Solicitá un nuevo código.' },
      { status: 429 }
    );
  }

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (user.phoneVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  if (!user.smsCode || !user.smsCodeExpires) {
    return NextResponse.json(
      { error: 'No hay código pendiente. Solicitá uno nuevo.' },
      { status: 400 }
    );
  }

  if (new Date() > user.smsCodeExpires) {
    return NextResponse.json(
      { error: 'El código expiró. Solicitá uno nuevo.' },
      { status: 400 }
    );
  }

  if (user.smsCode !== code.trim()) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneVerified: true,
      smsCode: null,
      smsCodeExpires: null,
    },
  });

  return NextResponse.json({ ok: true });
}
