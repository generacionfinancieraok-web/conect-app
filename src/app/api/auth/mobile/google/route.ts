import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { rateLimit, getIP } from '@/lib/rateLimit';

/**
 * POST /api/auth/mobile/google
 * Recibe un Google ID token (obtenido por expo-auth-session en la app),
 * lo verifica con Google, y retorna un JWT propio + datos del usuario.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`google-auth:${getIP(req)}`, { limit: 10, windowSecs: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 });
  }

  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'idToken requerido' }, { status: 400 });
    }

    // Verificar el ID token con Google
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Token de Google inválido' }, { status: 401 });
    }

    const payload = await googleRes.json();

    // Validar audience (debe ser nuestro client ID)
    const validAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);

    if (validAudiences.length > 0 && !validAudiences.includes(payload.aud)) {
      return NextResponse.json({ error: 'Token no pertenece a esta app' }, { status: 401 });
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return NextResponse.json({ error: 'No se pudo obtener el email de Google' }, { status: 400 });
    }

    // Buscar usuario existente o crear uno nuevo
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Si ya existe pero no tiene Account de Google, vincularla
      const existingAccount = await prisma.account.findFirst({
        where: { userId: user.id, provider: 'google' },
      });
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: googleId,
          },
        });
      }
      // Marcar email como verificado si no lo estaba
      if (!user.emailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date(), image: user.image || picture || null },
        });
      }
    } else {
      // Crear usuario nuevo
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          image: picture || null,
          emailVerified: new Date(), // Google ya verificó el email
          accounts: {
            create: {
              type: 'oauth',
              provider: 'google',
              providerAccountId: googleId,
            },
          },
        },
      });
    }

    // Generar JWT
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'conect-secret-key';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '90d' });

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
    console.error('[google-auth]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
