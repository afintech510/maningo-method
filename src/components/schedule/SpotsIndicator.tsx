import { cn } from '@/lib/utils';

interface SpotsIndicatorProps {
  remaining: number;
  total: number;
}

export function SpotsIndicator({ remaining, total }: SpotsIndicatorProps) {
  const maxDots = 5;
  const filledDots = Math.min(maxDots, Math.round((remaining / total) * maxDots));
  const isLow = remaining <= 3 && remaining > 0;
  const isFull = remaining <= 0;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'text-sm font-medium',
          isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'
        )}
      >
        {isFull ? 'Full' : `${remaining} spots`}
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: maxDots }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'w-2 h-2 rounded-full',
              i < filledDots
                ? isFull
                  ? 'bg-red-400'
                  : isLow
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-green-400'
                : 'bg-gray-200'
            )}
          />
        ))}
      </div>
    </div>
  );
}
