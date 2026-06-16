'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MapPin, Eye, Star, MessageCircle, ShoppingBag,
  ChevronLeft, ChevronRight, Share2, Heart, Flag
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const conditionLabel: Record<string, string> = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Como nuevo',
  GOOD: 'Buen estado',
  FAIR: 'Aceptable',
  POOR: 'Con detalles',
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((d) => { setListing(d.listing); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleContact() {
    if (!session) { router.push('/login'); return; }
    setChatLoading(true);
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: id }),
    });
    const data = await res.json();
    setChatLoading(false);
    if (data.conversation) router.push(`/inbox/${data.conversation.id}`);
  }

  async function handleBuy() {
    if (!session) { router.push('/login'); return; }
    setBuyLoading(true);
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: id }),
    });
    const data = await res.json();
    setBuyLoading(false);
    if (data.initPoint) window.location.href = data.initPoint;
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="bg-gray-200 rounded-2xl aspect-video mb-6" />
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
    </div>
  );

  if (!listing) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
      <p className="text-4xl mb-3">😕</p>
      <p className="font-medium">Publicación no encontrada</p>
      <Link href="/" className="mt-4 inline-block btn-primary">Volver al inicio</Link>
    </div>
  );

  const isOwner = session?.user?.id === listing.user.id;
  const images = listing.images || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="grid md:grid-cols-5 gap-8">
        {/* Columna izquierda: imágenes */}
        <div className="md:col-span-3">
          {/* Imagen principal */}
          <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] mb-3">
            {images.length > 0 ? (
              <Image
                src={images[imageIdx]?.url}
                alt={listing.title}
                fill
                className="object-contain"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">📦</div>
            )}

            {/* Status badge */}
            {listing.status === 'SOLD' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white font-bold text-gray-800 px-5 py-2 rounded-full text-lg">Vendido</span>
              </div>
            )}

            {/* Flechas */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setImageIdx((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-2 right-3 text-xs text-white bg-black/40 px-2 py-0.5 rounded-full">
              {imageIdx + 1} / {images.length || 1}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: any, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setImageIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === imageIdx ? 'border-brand-500' : 'border-transparent'
                  }`}
                >
                  <Image src={img.url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}

          {/* Descripción */}
          <div className="card p-5 mt-5">
            <h2 className="font-semibold mb-3">Descripción</h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>
        </div>

        {/* Columna derecha: info + acciones */}
        <div className="md:col-span-2 space-y-4">
          {/* Precio y título */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatPrice(listing.price, listing.currency)}
                </p>
                <h1 className="text-lg font-semibold text-gray-800 mt-1">{listing.title}</h1>
              </div>
              <button
                onClick={() => setLiked(!liked)}
                className={`p-2 rounded-full border transition-colors ${
                  liked ? 'text-red-500 border-red-200 bg-red-50' : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {conditionLabel[listing.condition]}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {listing.category?.name}
              </span>
            </div>

            <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{listing.city}, {listing.province}</span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {listing.views} vistas</span>
              <span>
                {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: es })}
              </span>
            </div>

            {/* CTAs */}
            {!isOwner && listing.status === 'ACTIVE' && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleContact}
                  disabled={chatLoading}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  {chatLoading ? 'Abriendo chat...' : 'Contactar vendedor'}
                </button>
                <button
                  onClick={handleBuy}
                  disabled={buyLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {buyLoading ? 'Procesando...' : 'Comprar ahora'}
                </button>
              </div>
            )}

            {isOwner && (
              <div className="mt-4 space-y-2">
                <Link href={`/listing/${id}/edit`} className="btn-secondary w-full text-center block">
                  Editar publicación
                </Link>
              </div>
            )}
          </div>

          {/* Vendedor */}
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Vendedor</h2>
            <Link href={`/profile/${listing.user.id}`} className="flex items-center gap-3 group">
              {listing.user.image ? (
                <Image
                  src={listing.user.image}
                  alt={listing.user.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-lg">
                  {listing.user.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium group-hover:text-brand-600 transition-colors">
                  {listing.user.name}
                </p>
                {listing.user.ratingCount > 0 ? (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    <span>{listing.user.rating.toFixed(1)}</span>
                    <span className="text-xs">({listing.user.ratingCount})</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Sin calificaciones aún</p>
                )}
              </div>
            </Link>
          </div>

          {/* Compartir */}
          <div className="flex gap-2">
            <button
              onClick={() => navigator.share?.({ title: listing.title, url: window.location.href })}
              className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
            >
              <Share2 className="w-4 h-4" /> Compartir
            </button>
            <button className="btn-secondary px-3 text-gray-400 hover:text-red-500">
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
