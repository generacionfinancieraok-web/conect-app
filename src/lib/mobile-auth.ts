import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'conect-secret-key';

export function verifyMobileToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload;
  } catch {
    return null;
  }
}
