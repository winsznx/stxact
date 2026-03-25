export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-none border border bg-background-raised p-6">
      <div className="mb-4 flex items-start justify-between border-b border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border-2 border-foreground bg-background" />
          <div>
            <div className="mb-2 h-5 w-32 bg-background-overlay" />
            <div className="h-4 w-20 bg-background-overlay" />
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between border-b border pb-2">
          <div className="h-4 w-24 bg-background-overlay" />
          <div className="h-4 w-16 bg-background-overlay" />
        </div>
        <div className="flex items-center justify-between border-b border pb-2">
          <div className="h-4 w-24 bg-background-overlay" />
          <div className="h-4 w-16 bg-background-overlay" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="h-7 w-16 bg-background-overlay" />
        <div className="h-7 w-16 bg-background-overlay" />
      </div>
    </div>
  );
}

/**
 * Executes logic associated with skeleton table.
 */
export function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border pb-3">
          <div className="h-4 w-32 bg-background-overlay" />
          <div className="h-4 w-24 bg-background-overlay" />
          <div className="h-4 w-20 bg-background-overlay" />
          <div className="ml-auto h-4 w-16 bg-background-overlay" />
        </div>
      ))}
    </div>
  );
}

/**
 * Executes logic associated with skeleton stat.
 */
export function SkeletonStat() {
  return (
    <div className="animate-pulse rounded-none border border bg-background-raised p-6">
      <div className="mb-2 h-4 w-24 bg-background-overlay" />
      <div className="h-8 w-32 bg-background-overlay" />
    </div>
  );
}
