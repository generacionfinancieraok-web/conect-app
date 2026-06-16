import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
import { ListingCardData } from '@/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  listing: ListingCardData;
}

const conditionLabel: Record<string, string> = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Como nuevo',
  GOOD: 'Buen estado',
  FAIR: 'Aceptable',
  POOR: 'Con detalles',
};

export default function ListingCard({ listing }: Props) {
  const image = listing.images[0]?.url;
  const timeAgo = formatDistanceToNow(new Date(listing.createdAt), {
    addSuffix: true,
    locale: es,
  });

  return (
    <Link href={`/listing/${listing.id}`} className="group card hover:shadow-md transition-shadow">
      {/* Imagen */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
            📦
          </div>
        )}
        {listing.status === 'SOLD' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-bold px-3 py-1 rounded-full text-sm">
              Vendido
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-0.5 rounded-full font-medium text-gray-700">
          {conditionLabel[listing.condition]}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-gray-900 text-lg leading-tight">
          {formatPrice(listing.price, listing.currency)}
        </p>
        <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{listing.title}</p>
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{listing.city}, {listing.province}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>
    </Link>
  );
}
