'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';

interface Props {
  profileId: string;
}

export default function ReviewForm({ profileId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!session?.user || done) {
    if (done) return (
      <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
        ✓ Tu reseña fue enviada. ¡Gracias!
      </div>
    );
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError('Seleccioná una calificación'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedId: profileId, rating, comment: comment || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(data.error || 'Error al enviar la reseña');
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium border border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 px-4 py-2 rounded-lg transition-colors"
      >
        <Star className="w-4 h-4" /> Dejar una reseña
      </button>
    );
  }

  return (
    <div className="card p-5 border-brand-100">
      <h3 className="font-semibold text-gray-900 mb-4">Dejá tu reseña</h3>

      {/* Estrellas */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hover || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Contá tu experiencia con este usuario (opcional)"
          className="input w-full resize-none"
          rows={3}
          maxLength={500}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setOpen(false); setError(''); setRating(0); setComment(''); }}
            className="flex-1 btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar reseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
