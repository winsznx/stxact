import { cn } from '@/lib/cn';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  className?: string;
}

const variantConfig = {
  info: { icon: Info, classes: 'border-accent/30 bg-accent/5 text-foreground' },
  success: { icon: CheckCircle2, classes: 'border-success/30 bg-success/5 text-foreground' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 bg-warning/5 text-foreground' },
  error: { icon: AlertCircle, classes: 'border-error/30 bg-error/5 text-foreground' },
} as const;

export function Alert({ children, variant = 'info', title, className }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-none border p-4', config.classes, className)}>
      <div className="flex gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          {title && <p className="mb-1 text-sm font-semibold">{title}</p>}
          <div className="text-sm text-foreground-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}
