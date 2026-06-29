'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface Listing {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  condition: string;
  province: string;
  city: string;
  images: { url: string }[];
  user: { id: string; name: string };
  category: { name: string } | null;
}

const conditionLabel: Record<string, string> = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Como nuevo',
  GOOD: 'Buen estado',
  FAIR: 'Aceptable',
  POOR: 'Con detalles',
};

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status]);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/favorites')
      .then((r) => r.json())
      .then((data) => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.user]);

  async function handleRemove(listingId: string) {
    if (removing) return;
    setRemoving(listingId);
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch {}
    setRemoving(null);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Guardados</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-xl aspect-[3/4]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-red-500 fill-current" />
        <h1 className="text-2xl font-bold">Guardados</h1>
        {listings.length > 0 && (
          <span className="text-sm text-gray-400">({listings.length})</span>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Heart className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-lg font-medium text-gray-500">No tenés publicaciones guardadas</p>
          <p className="text-sm mt-1">Tocá el corazón en cualquier publicación para guardarla acá.</p>
          <Link href="/" className="mt-6 inline-block btn-primary">
            Explorar publicaciones
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="group relative card hover:shadow-md transition-shadow">
              {/* Botón quitar */}
              <button
                onClick={() => handleRemove(listing.id)}
                disabled={removing === listing.id}
                title="Quitar de favoritos"
                className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full p-1.5 shadow transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <Link href={`/listing/${listing.id}`}>
                {/* Imagen */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden rounded-t-xl">
                  {listing.images[0]?.url ? (
                    <Image
                      src={listing.images[0].url}
                      alt={listing.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">
                    {listing.title}
                  </p>
                  <p className="text-brand-600 font-bold mt-1 text-sm">
                    {formatPrice(listing.price, listing.currency)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {conditionLabel[listing.condition] ?? listing.condition}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {listing.city}, {listing.province}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
