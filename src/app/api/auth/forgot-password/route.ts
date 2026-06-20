import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Always return 200 to avoid email enumeration
  if (!user) {
    return NextResponse.json({ message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
  }

  // Token: 32 random bytes as hex, expires in 1 hour
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token, expires },
    create: { userId: user.id, token, expires },
  });

  await sendPasswordResetEmail(user.email!, token);

  return NextResponse.json({ message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
}
