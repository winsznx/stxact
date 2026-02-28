import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-none border border bg-background-raised p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-none border border-error bg-background">
          <AlertCircle className="h-6 w-6 text-error" />
        </div>
        <h1 className="mb-2 font-serif text-3xl font-bold">Page Not Found</h1>
        <p className="mb-6 text-foreground-muted">
          The page you requested does not exist or has moved to a different route.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-none border border bg-accent px-4 py-2 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Home
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-none border border px-4 py-2 font-semibold transition-colors hover:border-accent hover:bg-background-overlay"
          >
            Open Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
