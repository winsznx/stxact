'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Executes logic associated with seller error.
 */
export default function SellerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Seller dashboard error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-none border border bg-background-raised p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-error bg-background">
          <AlertTriangle className="h-8 w-8 text-error" />
        </div>

        <h2 className="mb-2 font-serif text-xl font-semibold">
          Failed to Load Dashboard
        </h2>

        <p className="mb-6 text-sm text-foreground-muted">
          We could not load your seller dashboard. Please try again.
        </p>

        <button
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-none border border bg-accent px-6 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
