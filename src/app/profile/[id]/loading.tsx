export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      {/* Header card */}
      <div className="card p-6 flex gap-5 items-start mb-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-72" />
          <div className="h-4 bg-gray-100 rounded w-56" />
        </div>
        <div className="h-9 bg-gray-100 rounded-lg w-28" />
      </div>

      {/* Grid skeleton */}
      <div className="h-5 bg-gray-100 rounded w-40 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
