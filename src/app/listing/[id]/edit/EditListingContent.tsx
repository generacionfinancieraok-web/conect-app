'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { PROVINCES } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

const CONDITIONS = [
  { value: 'NEW', label: 'Nuevo' },
  { value: 'LIKE_NEW', label: 'Como nuevo' },
  { value: 'GOOD', label: 'Buen estado' },
  { value: 'FAIR', label: 'Aceptable' },
  { value: 'POOR', label: 'Con detalles' },
];

export default function EditListingContent() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'ARS',
    condition: 'GOOD',
    categoryId: '',
    city: '',
    province: '',
    address: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/listings/${id}`).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([listingData, catData]) => {
      const l = listingData.listing;
      if (!l) { router.push('/'); return; }
      if (session?.user?.id && l.user.id !== session.user.id) {
        router.push(`/listing/${id}`);
        return;
      }
      setForm({
        title: l.title ?? '',
        description: l.description ?? '',
        price: String(l.price ?? ''),
        currency: l.currency ?? 'ARS',
        condition: l.condition ?? 'GOOD',
        categoryId: l.category?.id ?? '',
        city: l.city ?? '',
        province: l.province ?? '',
        address: l.address ?? '',
      });
      setCategories(catData.categories ?? []);
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
  }, [id, session?.user?.id]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio'); return; }
    if (!form.categoryId) { setError('Seleccioná una categoría'); return; }
    if (!form.city.trim() || !form.province) { setError('Completá la ubicación'); return; }

    setLoading(true);
    setError('');
    setSuccess(false);

    const res = await fetch(`/api/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Error al guardar');
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/listing/${id}`), 1200);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/profile/' + session?.user?.id);
    } catch {}
    setDeleteLoading(false);
  }

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/listing/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Editar publicación</h1>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          ¡Cambios guardados! Redirigiendo...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título y precio */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Información básica</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="input"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="input resize-none"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="input"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="input">
                <option value="ARS">ARS $</option>
                <option value="USD">USD $</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categoría y estado */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Detalles</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado del artículo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update('condition', c.value)}
                  className={`py-2 px-3 rounded-lg text-sm border transition-all ${
                    form.condition === c.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              className="input"
              required
            >
              <option value="">Seleccioná una categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ubicación */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Ubicación</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provincia <span className="text-red-500">*</span>
              </label>
              <select
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
                className="input"
                required
              >
                <option value="">Seleccioná</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barrio / Dirección (opcional)
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Zona de peligro */}
      <div className="mt-8 card p-5 border-red-100">
        <h2 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" /> Zona de peligro
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Eliminar la publicación es permanente. Las imágenes también se borrarán de Cloudinary.
        </p>
        {showDeleteConfirm ? (
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-600 font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Eliminar publicación
          </button>
        )}
      </div>
    </div>
  );
}
