'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
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

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const province = searchParams.get('province') || '';
  const condition = searchParams.get('condition') || '';
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
    if (sortBy) params.set('sortBy', sortBy);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();
    setListings(data.listings || []);
    setTotal(data.pagination?.total || 0);
    setLoading(false);
  }, [q, category, province, condition, sortBy, minPrice, maxPrice]);

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

  const hasActiveFilters = !!(category || province || condition || minPrice || maxPrice);

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
            </div>
          </aside>
        )}

        {/* Resultados */}
        <div className="flex-1">
          {/* Chips de categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            <button
              onClick={() => setParam('category', '')}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                !category ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
              }`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setParam('category', c.slug)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  category === c.slug ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">No encontramos resultados</p>
              <p className="text-sm mt-1">Probá con otros términos o filtros</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 btn-secondary text-sm">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
