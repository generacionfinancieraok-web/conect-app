'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Algo salió mal</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary">
          Intentar de nuevo
        </button>
        <a href="/" className="btn-secondary">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
