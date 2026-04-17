export function SkeletonPage() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-48 bg-background-raised" />
          <div className="mt-2 h-4 w-64 bg-background-raised" />
        </div>
        <div className="h-10 w-32 bg-background-raised" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 border border bg-background-raised" />
        ))}
      </div>
      <div className="h-96 border border bg-background-raised" />
    </div>
  );
}
