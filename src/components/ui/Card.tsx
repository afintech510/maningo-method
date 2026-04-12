import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'w-full rounded-xl border border-border bg-white p-4 sm:p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
