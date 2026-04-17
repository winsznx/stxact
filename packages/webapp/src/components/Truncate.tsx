import { cn } from '@/lib/cn';

interface TruncateProps { text: string; maxLength?: number; className?: string; }

export function Truncate({ text, maxLength = 32, className }: TruncateProps) {
  if (text.length <= maxLength) return <span className={className}>{text}</span>;
  return <span className={cn('cursor-help', className)} title={text}>{`${text.slice(0, maxLength)}...`}</span>;
}
