export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category');
  const province = searchParams.get('province');
  const city = searchParams.get('city');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const condition = searchParams.get('condition');
  const listingType = searchParams.get('listingType');
  const sortBy = searchParams.get('sortBy') || 'newest';
  // Geolocalización
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
  const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : null; // km

  const where: any = {
    status: 'ACTIVE',
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    }),
    ...(category && { category: { slug: category } }),
    ...(province && { province: { contains: province, mode: 'insensitive' } }),
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
    ...(condition && { condition }),
    ...(listingType && { listingType }),
    ...((minPrice || maxPrice) && {
      price: {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) }),
      },
    }),
  };

  const orderBy: any = [
    { promoted: 'desc' },
    sortBy === 'price_asc'  ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : { createdAt: 'desc' },
  ];

  // Si hay filtro geográfico, traemos más registros y filtramos en memoria
  const useGeoFilter = lat !== null && lng !== null && radius !== null;
  const fetchLimit = useGeoFilter ? 500 : limit;
  const fetchSkip  = useGeoFilter ? 0 : (page - 1) * limit;

  const [rawListings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: fetchSkip,
      take: fetchLimit,
      include: {
        images:   { orderBy: { order: 'asc' }, take: 1 },
        user:     { select: { id: true, name: true, image: true } },
        category: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  let listings = rawListings;

  // Filtrar por radio geográfico si se proporcionaron coordenadas
  if (useGeoFilter) {
    listings = rawListings.filter((l: any) => {
      if (l.latitude == null || l.longitude == null) return false;
      return haversineKm(lat!, lng!, l.latitude, l.longitude) <= radius!;
    });
    // Paginar después del filtro geográfico
    const start = (page - 1) * limit;
    listings = listings.slice(start, start + limit);
  }

  return NextResponse.json(
    {
      listings,
      query: q,
      geoFilter: useGeoFilter ? { lat, lng, radius } : null,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
    {
      headers: {
        // Cache público de 10s — acelera búsquedas repetidas sin filtros de usuario
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    }
  );
}
