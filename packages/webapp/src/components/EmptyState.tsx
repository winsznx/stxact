import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Executes logic associated with empty state.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass rounded-none py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border bg-background">
        <Icon className="h-8 w-8 text-foreground-muted" />
      </div>

      <h3 className="mb-2 font-serif text-lg font-semibold">{title}</h3>

      <p className="mb-6 text-sm text-foreground-muted">{description}</p>

      {action && <div>{action}</div>}
    </div>
  );
}
