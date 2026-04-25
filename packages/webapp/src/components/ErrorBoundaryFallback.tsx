'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export function ErrorBoundaryFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  return (
    <div className="glass rounded-none p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-error bg-error/10">
        <AlertTriangle className="h-6 w-6 text-error" />
      </div>
      <h3 className="mb-2 font-serif text-lg font-semibold">Something went wrong</h3>
      <p className="mb-4 text-sm text-foreground-muted">{error.message}</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-none border border bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}


/**
 * Captured component stack-trace metadata bounded by error boundaries.
 */
export interface ErrorBoundaryInfo { readonly componentStack: string; }
