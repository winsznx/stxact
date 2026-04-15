import { cn } from '@/lib/cn';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function ExternalLink({ href, children, className, showIcon = true }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline',
        className
      )}
    >
      {children}
      {showIcon && <ExternalLinkIcon className="h-3 w-3 shrink-0" />}
    </a>
  );
}
