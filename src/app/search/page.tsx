import { Suspense } from 'react';
import SearchContent from './SearchContent';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-400">Cargando...</div>}>
      <SearchContent />
    </Suspense>
  );
}
