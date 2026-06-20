'use client';

import { useEffect, useState } from 'react';

type Listing = {
  id: string;
  title: string;
  price: number;
  status: string;
  createdAt: string;
  seller: { id: string; name: string | null; email: string | null; image: string | null };
  category: { name: string } | null;
  _count: { reports: number };
};

const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'SOLD', 'DELETED'];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-900/30',
  PAUSED: 'text-yellow-400 bg-yellow-900/30',
  SOLD: 'text-blue-400 bg-blue-900/30',
  DELETED: 'text-red-400 bg-red-900/30',
};

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set('status', statusFilter);
    if (q) params.set('q', q);
    const res = await fetch(`/api/admin/listings?${params}`);
    const data = await res.json();
    setListings(data.listings || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter, q, page]);

  async function changeStatus(listingId: string, status: string) {
    setActionLoading(listingId + status);
    await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, status }),
    });
    setActionLoading(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Publicaciones</h1>
        <span className="text-gray-400 text-sm">{total} publicaciones</span>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por título..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setQ(searchInput); setPage(1); } }}
          className="bg-gray-800 text-white placeholder-gray-500 px-3 py-1.5 rounded-lg text-sm border border-gray-700 focus:border-blue-500 outline-none"
        />
        <button
          onClick={() => { setQ(searchInput); setPage(1); }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
        >
          Buscar
        </button>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-sm border border-gray-700 focus:border-blue-500 outline-none"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Cargando...</div>
      ) : listings.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No hay publicaciones.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left pb-2 font-medium">Título</th>
                <th className="text-left pb-2 font-medium">Vendedor</th>
                <th className="text-left pb-2 font-medium">Categoría</th>
                <th className="text-right pb-2 font-medium">Precio</th>
                <th className="text-center pb-2 font-medium">Estado</th>
                <th className="text-center pb-2 font-medium">Reportes</th>
                <th className="text-right pb-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="py-2.5 pr-3">
                    <a href={`/listing/${l.id}`} target="_blank" className="text-white hover:text-blue-400 line-clamp-1">{l.title}</a>
                    <p className="text-gray-500 text-xs">{new Date(l.createdAt).toLocaleDateString('es-AR')}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-300">{l.seller.name || l.seller.email}</td>
                  <td className="py-2.5 pr-3 text-gray-400">{l.category?.name || '—'}</td>
                  <td className="py-2.5 pr-3 text-right text-white font-medium">${l.price.toLocaleString('es-AR')}</td>
                  <td className="py-2.5 pr-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[l.status] || 'text-gray-400 bg-gray-800'}`}>{l.status}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    {l._count.reports > 0 ? (
                      <span className="text-red-400 font-bold">{l._count.reports}</span>
                    ) : (
                      <span className="text-gray-600">0</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex gap-1.5 justify-end">
                      {l.status !== 'PAUSED' && (
                        <button
                          onClick={() => changeStatus(l.id, 'PAUSED')}
                          disabled={!!actionLoading}
                          className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          Pausar
                        </button>
                      )}
                      {l.status === 'PAUSED' && (
                        <button
                          onClick={() => changeStatus(l.id, 'ACTIVE')}
                          disabled={!!actionLoading}
                          className="px-2 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          Activar
                        </button>
                      )}
                      {l.status !== 'DELETED' && (
                        <button
                          onClick={() => { if (confirm('¿Eliminar esta publicación?')) changeStatus(l.id, 'DELETED'); }}
                          disabled={!!actionLoading}
                          className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-800 text-gray-300 rounded disabled:opacity-40">← Anterior</button>
          <span className="px-3 py-1 text-gray-400 text-sm">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 bg-gray-800 text-gray-300 rounded disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  );
}
