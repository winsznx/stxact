'use client';

import { useEffect } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

/**
 * Executes logic associated with error.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-none border border bg-background-raised p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-error bg-background">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>

          <div className="flex-1">
            <h1 className="mb-2 font-serif text-xl font-semibold">
              Something went wrong
            </h1>

            <p className="text-sm text-foreground-muted">
              We encountered an error while loading this page.
            </p>

            {error.message && (
              <p className="mt-2 text-sm text-foreground-subtle">
                {error.message}
              </p>
            )}

            {error.digest && (
              <p className="mt-2 font-mono text-xs text-foreground-subtle">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-none border border bg-accent px-4 py-2 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-none border border bg-background-overlay px-4 py-2 font-semibold transition-colors hover:bg-background-raised"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
