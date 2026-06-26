export const dynamic = 'force-dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Star, MapPin, Calendar, Package, Clock, TrendingUp, ShoppingBag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ListingCard from '@/components/ListingCard';
import { getSellerBadge, getBuyerLabel } from '@/lib/reputation';

interface Props {
  params: { id: string };
}

async function getProfile(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      listings: {
        where: { status: { in: ['ACTIVE', 'SOLD'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          reviewer: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
  return user;
}

export default async function ProfilePage({ params }: Props) {
  const user = await getProfile(params.id);
  if (!user) notFound();

  const activeListings = user.listings.filter((l) => l.status === 'ACTIVE');
  const soldListings = user.listings.filter((l) => l.status === 'SOLD');

  const sellerBadgeRaw = getSellerBadge(user.concretionRate ?? 0, user.completedSales ?? 0);
  const sellerBadge = sellerBadgeRaw
    ? {
        label: sellerBadgeRaw.text,
        emoji: sellerBadgeRaw.color === 'green' ? '⭐' : sellerBadgeRaw.color === 'yellow' ? '🟡' : sellerBadgeRaw.color === 'red' ? '🔴' : '⚪',
        bgClass: sellerBadgeRaw.color === 'green' ? 'bg-green-100 text-green-700' : sellerBadgeRaw.color === 'yellow' ? 'bg-amber-100 text-amber-700' : sellerBadgeRaw.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600',
      }
    : null;
  const buyerLabel = getBuyerLabel(user.buyerLevel ?? 0, user.completedPurchases ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Perfil header */}
      <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start mb-6">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || 'Usuario'}
            width={80}
            height={80}
            className="rounded-full border-2 border-gray-100"
          />
        ) : (
          <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-3xl shrink-0">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            {sellerBadge && (
              <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${sellerBadge.bgClass}`}>
                {sellerBadge.emoji} {sellerBadge.label}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
            {user.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <strong className="text-gray-800">{user.rating.toFixed(1)}</strong>
                <span>({user.ratingCount})</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Miembro desde {format(user.createdAt, 'MMMM yyyy', { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              {user.listings.length} publicaciones
            </span>
          </div>

          {user.bio && (
            <p className="mt-3 text-sm text-gray-600 max-w-lg">{user.bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="shrink-0 flex gap-2">
          {(user.completedSales ?? 0) > 0 && (
            <div className="text-center bg-gray-50 rounded-xl p-3 min-w-[80px]">
              <p className="text-2xl font-bold text-green-600">{user.completedSales}</p>
              <p className="text-xs text-gray-500 mt-1">ventas</p>
            </div>
          )}
          {(user.concretionRate ?? 0) > 0 && (
            <div className="text-center bg-gray-50 rounded-xl p-3 min-w-[80px]">
              <p className="text-2xl font-bold text-blue-600">{Math.round((user.concretionRate ?? 0) * 100)}%</p>
              <p className="text-xs text-gray-500 mt-1">concreción</p>
            </div>
          )}
        </div>
      </div>

      {/* Reputación desglosada */}
      {((user.completedSales ?? 0) > 0 || (user.avgResponseMinutes ?? 0) > 0) && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Reputación como vendedor</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {(user.completedSales ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <ShoppingBag className="w-4 h-4 text-green-500" />
                <span><strong>{user.completedSales}</strong> ventas concretadas</span>
              </div>
            )}
            {(user.concretionRate ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span><strong>{Math.round((user.concretionRate ?? 0) * 100)}%</strong> tasa de concreción</span>
              </div>
            )}
            {(user.avgResponseMinutes ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>Responde en ~<strong>
                  {(user.avgResponseMinutes ?? 0) < 60
                    ? `${user.avgResponseMinutes}min`
                    : `${Math.round((user.avgResponseMinutes ?? 0) / 60)}h`}
                </strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publicaciones activas */}
      {activeListings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Publicaciones activas
            <span className="ml-2 text-sm font-normal text-gray-400">({activeListings.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeListings.map((l) => (
              <ListingCard key={l.id} listing={l as any} />
            ))}
          </div>
        </section>
      )}

      {/* Vendidos */}
      {soldListings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-500">
            Vendidos
            <span className="ml-2 text-sm font-normal text-gray-400">({soldListings.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 opacity-70">
            {soldListings.map((l) => (
              <ListingCard key={l.id} listing={l as any} />
            ))}
          </div>
        </section>
      )}

      {/* Reseñas */}
      {user.reviews.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Reseñas</h2>
          <div className="space-y-3">
            {(user.reviews as any[]).map((review) => (
              <div key={review.id} className="card p-4 flex gap-3">
                {review.reviewer.image ? (
                  <Image
                    src={review.reviewer.image}
                    alt={review.reviewer.name}
                    width={36}
                    height={36}
                    className="rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                    {review.reviewer.name?.[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/profile/${review.reviewer.id}`} className="font-medium text-sm hover:text-brand-600">
                      {review.reviewer.name}
                    </Link>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-0.5">{review.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeListings.length === 0 && soldListings.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p>Este usuario no tiene publicaciones aún</p>
        </div>
      )}
    </div>
  );
}
