import { SkeletonStat, SkeletonCard } from '@/components/SkeletonCard';

export default function SellerLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 border-b border pb-6">
          <div className="mb-3 h-10 w-64 animate-pulse bg-background-raised" />
          <div className="h-6 w-96 animate-pulse bg-background-raised" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>

        <div className="mb-8">
          <div className="mb-4 h-6 w-48 animate-pulse bg-background-raised" />
          <div className="h-64 w-full animate-pulse rounded-none border border bg-background-raised" />
        </div>

        <div className="mb-8">
          <div className="mb-4 h-6 w-48 animate-pulse bg-background-raised" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
