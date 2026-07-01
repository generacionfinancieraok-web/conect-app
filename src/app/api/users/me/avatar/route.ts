import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

export const runtime = 'nodejs';

// POST /api/users/me/avatar — sube foto de perfil
// Body: multipart/form-data con campo "file" (imagen)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Validar tipo y tamaño (máx 5 MB)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 5 MB' }, { status: 400 });
    }

    // Convertir a base64 para Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Obtener publicId actual para borrarlo después
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    // Subir nueva imagen a Cloudinary (sin moderación para avatares)
    const { url, publicId } = await uploadImage(base64, 'conect-app/avatars', false);

    // Actualizar en base de datos
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
      select: { id: true, name: true, email: true, image: true },
    });

    // Borrar imagen anterior de Cloudinary si era de nuestro CDN
    if (currentUser?.image?.includes('cloudinary.com')) {
      // Extraer publicId de la URL
      const match = currentUser.image.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
      if (match?.[1]) {
        deleteImage(match[1]).catch(() => {}); // no bloquear respuesta
      }
    }

    return NextResponse.json({ user: updatedUser });
  } catch (e: any) {
    console.error('[avatar] Error subiendo imagen:', e);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}
