export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ListingCard from '@/components/ListingCard';

async function getHomeData() {
  const [listings, categories] = await Promise.all([
    prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: { select: { id: true, name: true, image: true } },
        category: true,
      },
    }),
    prisma.category.findMany({
      include: { _count: { select: { listings: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);
  return { listings, categories };
}

export default async function HomePage() {
  const { listings, categories } = await getHomeData();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Compra y vende cerca tuyo</h1>
        <p className="text-brand-100 mb-4">Encontrá lo que buscás en tu ciudad. Miles de publicaciones en Argentina.</p>
        <div className="flex gap-3">
          <Link href="/listing/new" className="bg-white text-brand-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-50 transition-colors">
            Publicar gratis
          </Link>
          <Link href="/search" className="border border-white/30 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
            Explorar
          </Link>
        </div>
      </section>

      {/* Categorías */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Categorías</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/search?category=${cat.slug}`}
              className="shrink-0 flex flex-col items-center gap-1 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-brand-300 hover:shadow-sm transition-all text-center min-w-[80px]"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-gray-700">{cat.name}</span>
              <span className="text-xs text-gray-400">{cat._count.listings}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Publicaciones recientes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Publicaciones recientes</h2>
          <Link href="/search" className="text-sm text-brand-600 hover:underline font-medium">
            Ver todas →
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📦</p>
            <p>Todavía no hay publicaciones. ¡Sé el primero!</p>
            <Link href="/listing/new" className="mt-4 inline-block btn-primary">
              Publicar ahora
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as any} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
