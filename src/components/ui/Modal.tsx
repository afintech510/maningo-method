'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'fixed inset-0 z-50 m-0 p-0 bg-transparent',
        'backdrop:bg-black/50',
        // Mobile: bottom sheet
        'w-full max-w-full rounded-t-2xl',
        'bottom-0 top-auto',
        // Desktop: centered modal
        'lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
        'lg:max-w-md lg:rounded-xl lg:bottom-auto'
      )}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-t-2xl lg:rounded-xl p-6 safe-bottom">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 lg:hidden" />
        {title && (
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
        )}
        {children}
      </div>
    </dialog>
  );
}
