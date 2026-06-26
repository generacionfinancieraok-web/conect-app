export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { Condition, ListingType, ServiceUnit, ServiceModality } from '@prisma/client';

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    return payload?.userId ?? null;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  price: z.number().min(0),
  minPrice: z.number().min(0).optional().nullable(),
  currency: z.string().default('ARS'),
  condition: z.nativeEnum(Condition).optional(),
  listingType: z.nativeEnum(ListingType).default('ITEM_WITH_PRICE'),
  serviceUnit: z.nativeEnum(ServiceUnit).optional().nullable(),
  serviceModality: z.nativeEnum(ServiceModality).optional().nullable(),
  serviceCoverage: z.string().optional().nullable(),
  city: z.string().min(1),
  province: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  categoryId: z.string(),
  images: z.array(z.string()).min(1).max(8),
});

// GET /api/listings — feed paginado con filtros y score de relevancia
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
  const sortBy = searchParams.get('sortBy') || 'relevance';
  const userId = searchParams.get('userId');
  const listingType = searchParams.get('listingType') as ListingType | null;
  const q = searchParams.get('q'); // búsqueda textual

  const where: any = { status: 'ACTIVE' };

  if (category) where.category = { slug: category };
  if (province) where.province = { contains: province, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (condition) where.condition = condition;
  if (userId) where.userId = userId;
  if (listingType) where.listingType = listingType;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orderBy: any =
    sortBy === 'price_asc' ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : sortBy === 'newest' ? { createdAt: 'desc' }
    : { createdAt: 'desc' }; // relevance: fetch all and sort in-memory

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: sortBy === 'relevance' ? 0 : (page - 1) * limit,
      take: sortBy === 'relevance' ? undefined : limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: {
          select: {
            id: true, name: true, image: true,
            concretionRate: true, completedSales: true, buyerLevel: true,
          },
        },
        category: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  // Relevance sort: penaliza vendedores con buyerLevel alto (cuando son sellers)
  let result = listings;
  if (sortBy === 'relevance') {
    const now = Date.now();
    const scored = listings.map((l) => {
      const ageDays = (now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const freshness = Math.max(0, 1 - ageDays / 30); // pierde peso en 30 días
      const concretion = (l.user as any).concretionRate ?? 0;
      const sales = Math.min((l.user as any).completedSales ?? 0, 50) / 50;
      const views = Math.min(l.views ?? 0, 200) / 200;
      // Penalizar si el seller tiene mal nivel como comprador (proxy para mal actor)
      const sellerPenalty = ((l.user as any).buyerLevel ?? 0) >= 3 ? 0.5 : 1;
      const score = (freshness * 0.5 + concretion * 0.25 + sales * 0.15 + views * 0.1) * sellerPenalty;
      return { ...l, _score: score };
    });
    scored.sort((a, b) => b._score - a._score);
    result = scored.slice((page - 1) * limit, page * limit);
  }

  return NextResponse.json({
    listings: result,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/listings — crear publicación
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
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
        minPrice: data.minPrice ?? null,
        currency: data.currency,
        condition: data.condition ?? 'GOOD',
        listingType: data.listingType,
        serviceUnit: data.serviceUnit ?? null,
        serviceModality: data.serviceModality ?? null,
        serviceCoverage: data.serviceCoverage ?? null,
        city: data.city,
        province: data.province,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        userId,
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
