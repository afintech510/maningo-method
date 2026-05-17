import { getCapacityStatus, type CapacityState } from '@/lib/capacity-status';

const styleMap: Record<CapacityState, { pill: string; dot: string; pulse: boolean }> = {
  available: { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400', pulse: false },
  going_fast: { pill: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400', pulse: false },
  filling_up: { pill: 'bg-orange-50 text-orange-700', dot: 'bg-orange-400', pulse: false },
  almost_full: { pill: 'bg-red-50 text-red-600', dot: 'bg-red-400', pulse: false },
  final_spot: { pill: 'bg-red-100 text-red-700', dot: 'bg-red-500', pulse: true },
  waitlist: { pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', pulse: false },
};

interface CapacityBadgeProps {
  bookedCount: number;
  capacity?: number;
  className?: string;
}

export function CapacityBadge({ bookedCount, capacity = 20, className = '' }: CapacityBadgeProps) {
  const { state, label } = getCapacityStatus(bookedCount, capacity);
  const { pill, dot, pulse } = styleMap[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${pill} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
