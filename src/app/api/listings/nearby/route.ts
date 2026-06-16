import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/listings/nearby?lat=xx&lng=xx&radius=xx&limit=xx
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');
  const radius = parseFloat(searchParams.get('radius') ?? '10'); // km
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const categoryId = searchParams.get('categoryId');

  if (!lat || !lng) return NextResponse.json({ error: 'lat y lng requeridos' }, { status: 400 });

  // Haversine bounding box aproximado (~1° lat ≈ 111 km)
  const latDelta = radius / 111;
  const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

  const listings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      images: { take: 1, orderBy: { order: 'asc' } },
      user: { select: { id: true, name: true, image: true, isVerified: true } },
      category: true,
    },
    orderBy: [{ promoted: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  // Calcular distancia real con Haversine
  function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const result = listings
    .filter((l) => l.latitude && l.longitude)
    .map((l) => ({
      ...l,
      distanceKm: haversine(lat, lng, l.latitude!, l.longitude!),
    }))
    .filter((l) => l.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json(result);
}
