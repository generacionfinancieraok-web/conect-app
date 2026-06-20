'use client';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isVerified: boolean;
  rating: number;
  ratingCount: number;
  createdAt: string;
  _count: { listings: number; reviews: number; reportsMade: number; reportsReceived: number };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }

  useEffect(() => { load(); }, [q, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Usuarios</h1>
        <span className="text-gray-400 text-sm">{total} usuarios</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setQ(searchInput); setPage(1); } }}
          className="bg-gray-800 text-white placeholder-gray-500 px-3 py-1.5 rounded-lg text-sm border border-gray-700 focus:border-blue-500 outline-none flex-1 max-w-sm"
        />
        <button
          onClick={() => { setQ(searchInput); setPage(1); }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
        >
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Cargando...</div>
      ) : users.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No hay usuarios.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left pb-2 font-medium">Usuario</th>
                <th className="text-left pb-2 font-medium">Email</th>
                <th className="text-center pb-2 font-medium">Verificado</th>
                <th className="text-center pb-2 font-medium">Calificación</th>
                <th className="text-center pb-2 font-medium">Publicaciones</th>
                <th className="text-center pb-2 font-medium">Reportado</th>
                <th className="text-left pb-2 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      {u.image ? (
                        <img src={u.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                          {(u.name || u.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-white">{u.name || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-2.5 pr-4 text-center">
                    {u.isVerified ? (
                      <span className="text-green-400 text-xs bg-green-900/30 px-2 py-0.5 rounded">✓ Verificado</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    {u.ratingCount > 0 ? (
                      <span className="text-yellow-400">⭐ {u.rating.toFixed(1)} <span className="text-gray-500">({u.ratingCount})</span></span>
                    ) : (
                      <span className="text-gray-600 text-xs">Sin calificaciones</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-center text-gray-300">{u._count.listings}</td>
                  <td className="py-2.5 pr-4 text-center">
                    {u._count.reportsReceived > 0 ? (
                      <span className="text-red-400 font-bold">{u._count.reportsReceived}</span>
                    ) : (
                      <span className="text-gray-600">0</span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
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
