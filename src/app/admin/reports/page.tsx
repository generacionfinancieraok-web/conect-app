'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';

type Report = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string | null; image: string | null };
  listing: { id: string; title: string; status: string } | null;
  reportedUser: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  REVIEWED: 'Revisado',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Descartado',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${statusFilter}&page=${page}`);
    const data = await res.json();
    setReports(data.reports || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter, page]);

  async function act(reportId: string, status: string, action?: string) {
    setActionLoading(reportId + (action || status));
    await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, status, action }),
    });
    setActionLoading(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Reportes</h1>
        <span className="text-gray-400 text-sm">{total} reportes</span>
      </div>

      <div className="flex gap-2 mb-4">
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(val); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === val ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Cargando...</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No hay reportes con este estado.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded font-medium">{r.reason}</span>
                    <span className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString('es-AR')}</span>
                  </div>
                  {r.description && <p className="text-gray-300 text-sm mb-2">"{r.description}"</p>}
                  <p className="text-gray-500 text-xs">
                    Reportado por: <span className="text-gray-300">{r.reporter.name || r.reporter.email}</span>
                    {r.listing && <> · Publicación: <a href={`/listing/${r.listing.id}`} target="_blank" className="text-blue-400 hover:underline">{r.listing.title}</a> ({r.listing.status})</>}
                    {r.reportedUser && <> · Usuario: <span className="text-gray-300">{r.reportedUser.name || r.reportedUser.email}</span></>}
                  </p>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {r.listing && (
                      <>
                        <button
                          onClick={() => act(r.id, 'RESOLVED', 'pause_listing')}
                          disabled={!!actionLoading}
                          className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded-lg disabled:opacity-50"
                        >
                          Pausar publicación
                        </button>
                        <button
                          onClick={() => act(r.id, 'RESOLVED', 'delete_listing')}
                          disabled={!!actionLoading}
                          className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg disabled:opacity-50"
                        >
                          Eliminar publicación
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => act(r.id, 'REVIEWED')}
                      disabled={!!actionLoading}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg disabled:opacity-50"
                    >
                      Marcar revisado
                    </button>
                    <button
                      onClick={() => act(r.id, 'DISMISSED')}
                      disabled={!!actionLoading}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                )}
                {r.status !== 'PENDING' && (
                  <span className="text-xs text-gray-500 shrink-0">{STATUS_LABELS[r.status]}</span>
                )}
              </div>
            </div>
          ))}
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
