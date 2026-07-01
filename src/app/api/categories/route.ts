import { NextResponse } from 'next/server';
import { getCachedCategories } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

// Categorías se cachean por 1 hora — sin force-dynamic
export async function GET() {
  try {
    // Usar caché para la lista base
    const base = await getCachedCategories();

    // Agregar conteo de publicaciones activas (este dato cambia frecuentemente, no se cachea)
    const counts = await prisma.listing.groupBy({
      by: ['categoryId'],
      where: { status: 'ACTIVE' },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count]));

    const categories = base.map((cat) => ({
      ...cat,
      _count: { listings: countMap.get(cat.id) ?? 0 },
    }));

    return NextResponse.json({ categories }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
