import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { rateLimit, getIP } from '@/lib/rateLimit';

// Este endpoint genera un JWT para la app móvil.
export async function POST(req: NextRequest) {
  // Rate limit: 10 intentos por IP cada 15 minutos
  const rl = rateLimit(`login:${getIP(req)}`, { limit: 10, windowSecs: 900 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos de inicio de sesión. Intentá en 15 minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'conect-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email },
      secret,
      { expiresIn: '90d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
