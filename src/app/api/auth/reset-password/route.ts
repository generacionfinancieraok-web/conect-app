import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: 'Token y contraseña (mínimo 8 caracteres) requeridos' }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json({ error: 'El enlace es inválido o expiró' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword },
  });

  // Delete the used token
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ message: 'Contraseña actualizada correctamente' });
}
