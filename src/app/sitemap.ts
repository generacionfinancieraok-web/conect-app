import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL || 'https://conect-app-production.up.railway.app';

  // Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Publicaciones activas
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const listings = await prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
    listingPages = listings.map((l) => ({
      url: `${base}/listing/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Si falla la DB, solo retornar páginas estáticas
  }

  // Perfiles públicos
  let profilePages: MetadataRoute.Sitemap = [];
  try {
    const users = await prisma.user.findMany({
      where: { listings: { some: { status: 'ACTIVE' } } },
      select: { id: true, updatedAt: true },
      take: 2000,
    });
    profilePages = users.map((u) => ({
      url: `${base}/profile/${u.id}`,
      lastModified: u.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {}

  return [...staticPages, ...listingPages, ...profilePages];
}
