'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Dialog({ open, onClose, children, title, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'w-full max-w-lg rounded-none border border bg-background-overlay p-0 shadow-xl backdrop:bg-black/50',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border px-6 py-4">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-background-raised" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="p-6">{children}</div>
    </dialog>
  );
}
