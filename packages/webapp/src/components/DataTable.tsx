import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({ columns, data, keyExtractor, emptyMessage, className }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn('glass rounded-none p-12 text-center', className)}>
        <p className="text-sm text-foreground-muted">
          {emptyMessage || 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('glass overflow-hidden rounded-none', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted',
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="transition-colors hover:bg-background-raised/50"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm">
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
