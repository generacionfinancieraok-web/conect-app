import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Zap } from 'lucide-react';
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
    <Link href={`/listing/${listing.id}`} className={`group card hover:shadow-md transition-shadow ${listing.promoted ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}>
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
        {listing.promoted && (
          <span className="absolute top-2 right-2 flex items-center gap-1 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            <Zap className="w-2.5 h-2.5" /> DESTACADO
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {listing.listingType === 'SERVICE' ? (
          <p className="font-bold text-brand-600 text-lg leading-tight">🔧 Servicio</p>
        ) : listing.listingType === 'ITEM_NO_PRICE' || listing.price === 0 ? (
          <p className="font-bold text-gray-500 text-lg leading-tight">Consultar precio</p>
        ) : (
          <p className="font-bold text-gray-900 text-lg leading-tight">
            {formatPrice(listing.price, listing.currency)}
          </p>
        )}
        <p className="text-sm text-gray-700 mt-0.5 line-clamp-2 font-medium">{listing.title}</p>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-0.5 truncate max-w-[60%]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{listing.city}</span>
          </span>
          <span className="shrink-0">{timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}