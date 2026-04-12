import { cn } from '@/lib/utils';

type SkeletonVariant = 'card' | 'row' | 'text';

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

export function Skeleton({ variant = 'text', className }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('w-full rounded-xl border border-border bg-white p-4 animate-pulse', className)}>
        <div className="flex justify-between mb-3">
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-16 bg-gray-200 rounded mb-4" />
        <div className="h-11 w-full bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={cn('flex items-center gap-3 py-3 animate-pulse', className)}>
        <div className="h-10 w-10 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 w-2/3 bg-gray-200 rounded mb-1.5" />
          <div className="h-3 w-1/3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 animate-pulse', className)}>
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-4/5 bg-gray-200 rounded" />
      <div className="h-4 w-3/5 bg-gray-200 rounded" />
    </div>
  );
}
