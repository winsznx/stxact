import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && (
          <label htmlFor={textareaId} className="mb-1 block text-sm font-medium">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded-none border border bg-background px-4 py-2 text-sm transition-colors',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
