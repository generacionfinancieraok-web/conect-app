'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, MapPin, LocateFixed } from 'lucide-react';
import ListingCard from '@/components/ListingCard';
import { PROVINCES } from '@/lib/utils';

const CONDITIONS = [
  { value: '', label: 'Cualquier estado' },
  { value: 'NEW', label: 'Nuevo' },
  { value: 'LIKE_NEW', label: 'Como nuevo' },
  { value: 'GOOD', label: 'Buen estado' },
  { value: 'FAIR', label: 'Aceptable' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
];

interface Category { id: string; name: string; slug: string; icon: string | null; }

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Geolocalización
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoRadius, setGeoRadius] = useState(10);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function requestGeo() {
    if (!navigator.geolocation) { setGeoError('Tu navegador no soporta geolocalización'); return; }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => { setGeoError('No se pudo obtener la ubicación'); setGeoLoading(false); },
      { timeout: 8000 }
    );
  }

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const province = searchParams.get('province') || '';
  const condition = searchParams.get('condition') || '';
  const listingType = searchParams.get('listingType') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(d.categories));
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (province) params.set('province', province);
    if (condition) params.set('condition', condition);
    if (listingType) params.set('listingType', listingType);
    if (sortBy) params.set('sortBy', sortBy);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (geoCoords) {
      params.set('lat', String(geoCoords.lat));
      params.set('lng', String(geoCoords.lng));
      params.set('radius', String(geoRadius));
    }

    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();
    setListings(data.listings || []);
    setTotal(data.pagination?.total || 0);
    setLoading(false);
  }, [q, category, province, condition, listingType, sortBy, minPrice, maxPrice, geoCoords, geoRadius]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/search?${p}`);
  }

  function clearFilters() {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    router.push(`/search?${p}`);
  }

  const hasActiveFilters = !!(category || province || condition || listingType || minPrice || maxPrice || geoCoords);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {q ? `Resultados para "${q}"` : 'Explorar publicaciones'}
          </h1>
          {!loading && (
            <p className="text-sm text-gray-400">{total} publicaciones encontradas</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setParam('sortBy', e.target.value)}
            className="input text-sm w-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 text-sm relative ${hasActiveFilters ? 'border-brand-400 text-brand-600' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filtros sidebar */}
        {showFilters && (
          <aside className="w-56 shrink-0 space-y-5">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Filtros</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoría</label>
                <select value={category} onChange={(e) => setParam('category', e.target.value)} className="input text-sm">
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Provincia</label>
                <select value={province} onChange={(e) => setParam('province', e.target.value)} className="input text-sm">
                  <option value="">Todas</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
                <select value={listingType} onChange={(e) => setParam('listingType', e.target.value)} className="input text-sm">
                  <option value="">Todos</option>
                  <option value="ITEM_WITH_PRICE">Artículos con precio</option>
                  <option value="ITEM_NO_PRICE">Artículos sin precio</option>
                  <option value="SERVICE">Servicios</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Estado</label>
                <select value={condition} onChange={(e) => setParam('condition', e.target.value)} className="input text-sm">
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Precio (ARS)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={minPrice}
                    onChange={(e) => setParam('minPrice', e.target.value)}
                    className="input text-sm"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Máx"
                    value={maxPrice}
                    onChange={(e) => setParam('maxPrice', e.target.value)}
                    className="input text-sm"
                    min="0"
                  />
                </div>
              </div>

              {/* Geolocalización */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  <MapPin className="w-3 h-3 inline mr-1" />Cerca de mí
                </label>
                {geoCoords ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-lg px-2 py-1">
                      <LocateFixed className="w-3 h-3" />
                      <span>Ubicación activa</span>
                      <button onClick={() => setGeoCoords(null)} className="ml-auto text-gray-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <select
                      value={geoRadius}
                      onChange={(e) => setGeoRadius(parseInt(e.target.value))}
                      className="input text-sm"
                    >
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={25}>25 km</option>
                      <option value={50}>50 km</option>
                      <option value={100}>100 km</option>
                    </select>
                  </div>
                ) : (
                  <button
                    onClick={requestGeo}
                    disabled={geoLoading}
                    className="w-full flex items-center justify-center gap-1.5 text-xs btn-secondary py-1.5 disabled:opacity-60"
                  >
                 