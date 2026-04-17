import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Section({ children, className, title, description }: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="font-serif text-xl font-semibold">{title}</h2>}
          {description && <p className="mt-1 text-sm text-foreground-muted">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
