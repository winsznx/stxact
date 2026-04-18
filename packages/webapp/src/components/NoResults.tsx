import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface NoResultsProps {
  query?: string;
  message?: string;
  className?: string;
}

export function NoResults({ query, message, className }: NoResultsProps) {
  return (
    <div className={cn('py-12 text-center', className)}>
      <Search className="mx-auto mb-3 h-8 w-8 text-foreground-subtle" />
      <p className="text-sm text-foreground-muted">
        {message || (query ? `No results for "${query}"` : 'No results found')}
      </p>
    </div>
  );
}
