import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Categorías cacheadas por 1 hora — se revalidan con revalidateTag('categories')
 */
export const getCachedCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ['categories'],
  { revalidate: 3600, tags: ['categories'] }
);

/**
 * Listings de la home (activos, promovidos primero) — caché de 60s
 */
export const getCachedHomeListings = unstable_cache(
  async (limit = 24) =>
    prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ promoted: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: { select: { name: true, slug: true } },
        user: { select: { id: true, name: true, image: true } },
      },
    }),
  ['home-listings'],
  { revalidate: 60, tags: ['listings'] }
);

/**
 * Stats de una publicación — caché de 30s
 */
export const getCachedListingStats = unstable_cache(
  async (listingId: string) => {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { views: true, saves: true, _count: { select: { offers: true } } },
    });
    return listing ? {
      views: listing.views,
      saves: listing.saves,
      offers: listing._count.offers,
    } : null;
  },
  ['listing-stats'],
  { revalidate: 30, tags: ['listings'] }
);
