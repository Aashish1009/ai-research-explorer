import { ExplanationSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-4 w-24 bg-gray-100 rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-7 bg-gray-100 rounded w-3/4" />
        <div className="h-7 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="h-4 w-48 bg-gray-100 rounded" />
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="h-3 w-16 bg-gray-100 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
      </div>
      <ExplanationSkeleton />
    </div>
  );
}
