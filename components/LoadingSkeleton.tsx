export function PaperCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
      <div className="flex justify-between pt-1 border-t border-gray-50">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function ExplanationSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="h-8 bg-gray-100 rounded w-1/3" />
      <div className="flex gap-4">
        <div className="h-10 bg-gray-100 rounded w-64" />
        <div className="h-10 bg-gray-100 rounded w-32" />
        <div className="h-10 bg-gray-100 rounded w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <PaperCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
