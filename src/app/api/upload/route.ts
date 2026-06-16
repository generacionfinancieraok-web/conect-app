import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

async function getUserId(req: NextRequest): Promise<string | null> {
  // 1. NextAuth session (web app)
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  // 2. JWT Bearer token (mobile app)
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const token = auth.slice(7);
      const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
      return payload.id ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera los 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const result = await uploadImage(base64);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}
