import { SkeletonTable, SkeletonStat } from '@/components/SkeletonCard';

/**
 * Executes logic associated with receipts loading.
 */
export default function ReceiptsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 border-b border pb-6">
          <div className="mb-3 h-10 w-48 animate-pulse bg-background-raised" />
          <div className="h-6 w-80 animate-pulse bg-background-raised" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>

        <div className="mb-8 rounded-none border border bg-background-raised p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-10 w-full animate-pulse bg-background-overlay" />
            <div className="h-10 w-full animate-pulse bg-background-overlay" />
            <div className="h-10 w-full animate-pulse bg-background-overlay" />
          </div>
        </div>

        <div className="rounded-none border border bg-background-raised p-6">
          <SkeletonTable />
        </div>
      </div>
    </div>
  );
}
