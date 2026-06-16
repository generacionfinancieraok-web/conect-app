import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { Condition } from '@prisma/client';

const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  price: z.number().positive(),
  currency: z.string().default('ARS'),
  condition: z.nativeEnum(Condition),
  city: z.string().min(1),
  province: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  categoryId: z.string(),
  images: z.array(z.string()).min(1).max(8), // base64 o URLs temporales
});

// GET /api/listings — feed paginado con filtros
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category');
  const province = searchParams.get('province');
  const city = searchParams.get('city');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const condition = searchParams.get('condition') as Condition | null;
  const sortBy = searchParams.get('sortBy') || 'newest';
  const userId = searchParams.get('userId');

  const where: any = { status: 'ACTIVE' };

  if (category) where.category = { slug: category };
  if (province) where.province = { contains: province, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (condition) where.condition = condition;
  if (userId) where.userId = userId;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  const orderBy: any =
    sortBy === 'price_asc' ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : { createdAt: 'desc' };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: { select: { id: true, name: true, image: true } },
        category: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({
    listings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/listings — crear publicación
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    // Subir imágenes a Cloudinary
    const uploadedImages = await Promise.all(
      data.images.map((img, i) =>
        uploadImage(img).then((res) => ({ ...res, order: i }))
      )
    );

    const listing = await prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency,
        condition: data.condition,
        city: data.city,
        province: data.province,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        userId: session.user.id,
        categoryId: data.categoryId,
        images: {
          create: uploadedImages.map((img) => ({
            url: img.url,
            publicId: img.publicId,
            order: img.order,
          })),
        },
      },
      include: {
        images: true,
        category: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('[POST /api/listings]', error);
    return NextResponse.json({ error: 'Error al crear la publicación' }, { status: 500 });
  }
}
