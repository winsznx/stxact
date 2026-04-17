import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/api-error';

export function ErrorMessage({ error, className }: { error: unknown; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-error', className)}>
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{getErrorMessage(error)}</span>
    </div>
  );
}
