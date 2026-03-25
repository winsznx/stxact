import { SkeletonCard } from '@/components/SkeletonCard';

/**
 * Executes logic associated with directory loading.
 */
export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 border-b border pb-6">
          <div className="mb-3 h-10 w-64 animate-pulse bg-background-raised" />
          <div className="h-6 w-96 animate-pulse bg-background-raised" />
        </div>

        <div className="mb-8 rounded-none border border bg-background-raised p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-10 w-full animate-pulse bg-background-overlay" />
            <div className="h-10 w-full animate-pulse bg-background-overlay" />
            <div className="h-10 w-full animate-pulse bg-background-overlay" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
