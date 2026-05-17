// Capacity FOMO indicator — single source of truth for the threshold logic
// that drives the CapacityBadge UI on every class card / detail view.
//
// Defaults assume a 20-person class. If a class carries its own max_capacity
// pass it via the `capacity` argument; the threshold breakpoints scale
// proportionally so a 10-person class still renders sensible labels.

export type CapacityState =
  | 'available'
  | 'going_fast'
  | 'filling_up'
  | 'almost_full'
  | 'final_spot'
  | 'waitlist';

export interface CapacityStatus {
  state: CapacityState;
  label: string;
  spotsLeft: number;
}

const STATE_LABELS: Record<CapacityState, string> = {
  available: 'Spots Available',
  going_fast: 'Spots Going Fast',
  filling_up: 'Filling Up',
  almost_full: 'Almost Full',
  final_spot: 'Final Spot',
  waitlist: 'Waitlist Open',
};

/**
 * Spec thresholds at the canonical 20-person capacity:
 *   0–7   → available
 *   8–11  → going_fast
 *   12–15 → filling_up
 *   16–18 → almost_full
 *   19    → final_spot
 *   20    → waitlist
 *
 * For non-20 capacities we scale each cutoff by capacity / 20, keeping the
 * "exactly 1 spot left" → final_spot and "full" → waitlist invariants.
 */
export function getCapacityStatus(bookedCount: number, capacity = 20): CapacityStatus {
  const cap = capacity > 0 ? capacity : 20;
  const booked = Math.max(0, Math.min(bookedCount, cap));
  const spotsLeft = cap - booked;

  if (spotsLeft === 0) return { state: 'waitlist', label: STATE_LABELS.waitlist, spotsLeft: 0 };
  if (spotsLeft === 1) return { state: 'final_spot', label: STATE_LABELS.final_spot, spotsLeft };

  const scale = (cutoff: number) => Math.round((cutoff / 20) * cap);
  if (booked <= scale(7)) return { state: 'available', label: STATE_LABELS.available, spotsLeft };
  if (booked <= scale(11)) return { state: 'going_fast', label: STATE_LABELS.going_fast, spotsLeft };
  if (booked <= scale(15)) return { state: 'filling_up', label: STATE_LABELS.filling_up, spotsLeft };
  return { state: 'almost_full', label: STATE_LABELS.almost_full, spotsLeft };
}
