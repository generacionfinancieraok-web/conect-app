import jwt from 'jsonwebtoken';

// Usar NEXTAUTH_SECRET — el mismo secret con el que /api/auth/mobile/login firma el JWT.
// Fallback a JWT_SECRET para retrocompatibilidad, y a 'conect-secret-key' en dev local.
const SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'conect-secret-key';

export function verifyMobileToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, SECRET) as any;
    // El login firma con { id, email }; soportamos también userId para tokens futuros.
    const userId = payload.id ?? payload.userId ?? null;
    if (!userId) return null;
    return { userId, email: payload.email ?? '' };
  } catch {
    return null;
  }
}
