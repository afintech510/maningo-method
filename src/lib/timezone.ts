import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const STUDIO_TIMEZONE = process.env.STUDIO_TIMEZONE || 'America/New_York';

export function formatStudioTime(date: Date | string, formatStr: string = 'h:mm a'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, STUDIO_TIMEZONE);
  return format(zonedDate, formatStr);
}

export function formatStudioDate(date: Date | string, formatStr: string = 'EEE MMM d'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, STUDIO_TIMEZONE);
  return format(zonedDate, formatStr);
}

export function formatStudioDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, STUDIO_TIMEZONE);
  return format(zonedDate, 'EEE MMM d · h:mm a');
}
