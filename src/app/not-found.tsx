import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <SearchX className="w-16 h-16 text-gray-200 mb-4" />
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Página no encontrada</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        La página que buscás no existe o fue eliminada.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn-primary">
          Ir al inicio
        </Link>
        <Link href="/search" className="btn-secondary">
          Explorar artículos
        </Link>
      </div>
    </div>
  );
}
