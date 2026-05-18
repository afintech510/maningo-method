import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { toZonedTime } from 'date-fns-tz';

export const WEEKDAY_RATE_CENTS = 4000; // $40/hr
export const WEEKEND_RATE_CENTS = 7500; // $75/hr

export interface RentMonthBucket {
  year: number;
  month: number; // 1-12
  weekday_hours: number;
  weekend_hours: number;
  class_count: number;
  total_cents: number;
}

export interface RentClass {
  starts_at: string;
}

/**
 * One class = one hour of studio time. Weekday vs weekend is decided by the
 * class's studio-local day-of-week (DST-safe via `toZonedTime`). Pass any
 * subset of classes (typically every scheduled class) and a target `year` +
 * `month`; the function returns the rent breakdown for that month.
 */
export function computeMonthRent(
  classes: RentClass[],
  year: number,
  month: number,
  rates: { weekday: number; weekend: number } = {
    weekday: WEEKDAY_RATE_CENTS,
    weekend: WEEKEND_RATE_CENTS,
  },
): RentMonthBucket {
  let weekdayHours = 0;
  let weekendHours = 0;
  let count = 0;
  classes.forEach((c) => {
    const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
    if (z.getFullYear() !== year || z.getMonth() + 1 !== month) return;
    const dow = z.getDay(); // 0 Sun, 6 Sat
    if (dow === 0 || dow === 6) weekendHours += 1;
    else weekdayHours += 1;
    count += 1;
  });
  const total_cents = weekdayHours * rates.weekday + weekendHours * rates.weekend;
  return {
    year,
    month,
    weekday_hours: weekdayHours,
    weekend_hours: weekendHours,
    class_count: count,
    total_cents,
  };
}

/** Returns the next month-key after a given (year, month). */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/** Current studio-local (year, month). */
export function currentStudioMonth(now = new Date()): { year: number; month: number } {
  const z = toZonedTime(now, STUDIO_TIMEZONE);
  return { year: z.getFullYear(), month: z.getMonth() + 1 };
}
