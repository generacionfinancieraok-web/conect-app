'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, MapPin } from 'lucide-react';
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

export default function NewListingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<{ preview: string; base64: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories));
  }, [status]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 8 - images.length;
    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImages((prev) => [...prev, { preview: base64, base64 }]);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (images.length === 0) { setError('Agregá al menos una foto'); return; }
    if (!form.categoryId) { setError('Seleccioná una categoría'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        images: images.map((i) => i.base64),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Error al publicar');
    } else {
      router.push(`/listing/${data.listing.id}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Publicar artículo</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Fotos */}
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Fotos <span className="text-red-500">*</span></h2>
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image src={img.preview} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded">
                    Principal
                  </span>
                )}
              </div>
            ))}
            {images.length < 8 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Agregar</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Máximo 8 fotos. La primera será la principal.</p>
        </div>

        {/* Detalles */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Detalles</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="input"
              placeholder="Ej: iPhone 13 128GB Negro"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="input resize-none"
              rows={4}
              placeholder="Describí el artículo: características, estado, motivo de venta..."
              minLength={10}
              maxLength={2000}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <select
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                  className="input rounded-r-none w-20 border-r-0"
                >
                  <option value="ARS">ARS $</option>
                  <option value="USD">USD $</option>
                </select>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="input rounded-l-none flex-1"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={form.condition}
                onChange={(e) => update('condition', e.target.value)}
                className="input"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
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
          <h2 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Ubicación
          </h2>

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
                placeholder="Tu ciudad"
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
              placeholder="Palermo, Villa Crespo..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading ? 'Publicando...' : 'Publicar ahora'}
        </button>
      </form>
    </div>
  );
}
