export default function SearchLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Filtros skeleton */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 rounded-full animate-pulse shrink-0" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
