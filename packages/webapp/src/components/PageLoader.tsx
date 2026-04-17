import { Spinner } from './Spinner';
import { cn } from '@/lib/cn';

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message = 'Loading...', className }: PageLoaderProps) {
  return (
    <div className={cn('flex min-h-[50vh] flex-col items-center justify-center gap-4', className)}>
      <Spinner size="lg" />
      <p className="text-sm text-foreground-muted">{message}</p>
    </div>
  );
}
