'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScheduleCreatorForm, type ScheduleCreatorSeed } from './ScheduleCreatorForm';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  seed?: ScheduleCreatorSeed;
  title?: string;
}

export function ScheduleCreatorDrawer({ open, onClose, onCreated, seed, title = 'Schedule classes' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
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
        // Desktop: centered, wider than the default Modal so the schedule form fits
        'lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
        'lg:max-w-2xl lg:w-full lg:rounded-xl lg:bottom-auto',
      )}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-t-2xl lg:rounded-xl p-6 safe-bottom max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 lg:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] -m-2 text-2xl text-[#6b6b6b] hover:text-[#2d2d2d]"
          >
            ×
          </button>
        </div>
        <ScheduleCreatorForm seed={seed} onSuccess={onCreated} />
      </div>
    </dialog>
  );
}
