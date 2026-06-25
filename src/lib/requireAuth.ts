import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { verifyMobileToken } from './mobile-auth';

/**
 * Extrae el userId del request (Bearer token o sesión NextAuth).
 * Retorna { id, email } o null si no autenticado.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    if (payload) return { id: payload.userId, email: payload.email };
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return { id: session.user.id, email: session.user.email ?? '' };
  return null;
}
