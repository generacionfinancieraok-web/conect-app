import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/cloudinary';

// GET /api/listings/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { order: 'asc' } },
      user: { select: { id: true, name: true, image: true, rating: true, ratingCount: true, createdAt: true } },
      category: true,
      _count: { select: { conversations: true } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  }

  // Incrementar vistas
  await prisma.listing.update({
    where: { id: params.id },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json({ listing });
}

// PATCH /api/listings/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || listing.userId !== session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: body,
    include: { images: true, category: true },
  });

  return NextResponse.json({ listing: updated });
}

// DELETE /api/listings/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { images: true },
  });

  if (!listing || listing.userId !== session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Eliminar imágenes de Cloudinary
  await Promise.all(listing.images.map((img) => deleteImage(img.publicId)));

  await prisma.listing.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
