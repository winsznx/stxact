'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-md rounded-none border border bg-background-raised p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-error bg-background">
              <AlertTriangle className="h-8 w-8 text-error" />
            </div>

            <h1 className="mb-2 font-serif text-2xl font-bold">
              Application Error
            </h1>

            <p className="mb-6 text-foreground-muted">
              An unexpected error occurred. Our team has been notified.
            </p>

            {error.digest && (
              <p className="mb-4 font-mono text-xs text-foreground-subtle">
                Error ID: {error.digest}
              </p>
            )}

            <button
              onClick={reset}
              className="w-full rounded-none border border bg-accent px-6 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
