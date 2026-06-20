'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tag, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Offer {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: { url: string }[];
  };
  buyer: { id: string; name: string | null; image: string | null };
  seller: { id: string; name: string | null; image: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendiente',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  ACCEPTED:  { label: 'Aceptada',      color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  REJECTED:  { label: 'Rechazada',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  COUNTERED: { label: 'Contraoferta',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  EXPIRED:   { label: 'Expirada',      color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200' },
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

export default function OffersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status]);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    fetch(`/api/offers?type=${tab}`)
      .then((r) => r.json())
      .then((d) => setOffers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [session?.user, tab]);

  async function respond(offerId: string, action: 'accept' | 'reject') {
    setActing(offerId);
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setOffers((prev) =>
          prev.map((o) =>
            o.id === offerId
              ? { ...o, status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' }
              : o
          )
        );
      }
    } finally {
      setActing(null);
    }
  }

  const tabs = [
    { key: 'received', label: 'Recibidas' },
    { key: 'sent',     label: 'Enviadas' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Tag className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold">Mis ofertas</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No hay ofertas {tab === 'received' ? 'recibidas' : 'enviadas'}</p>
          {tab === 'sent' && (
            <Link href="/search" className="mt-4 inline-block btn-primary text-sm">
              Explorar artículos
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const cfg = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.PENDING;
            const otherUser = tab === 'received' ? offer.buyer : offer.seller;
            const img = offer.listing.images[0]?.url;

            return (
              <div key={offer.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex gap-3">
                  {/* Imagen listing */}
                  <Link href={`/listing/${offer.listing.id}`} className="shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      {img ? (
                        <Image src={img} alt={offer.listing.title} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/listing/${offer.listing.id}`} className="text-sm font-semibold text-gray-800 hover:text-brand-600 truncate block">
                      {offer.listing.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tab === 'received' ? `De: ${otherUser.name}` : `A: ${otherUser.name}`}
                      {' · '}
                      {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true, locale: es })}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <div>
                        <span className="text-xs text-gray-400 line-through">{formatPrice(offer.listing.price, offer.listing.currency)}</span>
                        <span className="ml-2 text-base font-bold text-gray-900">{formatPrice(offer.amount, offer.listing.currency)}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {offer.message && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{offer.message}"</p>
                    )}
                  </div>
                </div>

                {/* Acciones (solo en recibidas + pendiente) */}
                {tab === 'received' && offer.status === 'PENDING' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => respond(offer.id, 'accept')}
                      disabled={acting === offer.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Aceptar
                    </button>
                    <button
                      onClick={() => respond(offer.id, 'reject')}
                      disabled={acting === offer.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
