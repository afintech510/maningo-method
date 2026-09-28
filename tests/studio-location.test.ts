import { describe, it, expect } from 'vitest';
import {
  MOVE_DATE,
  STUDIO_ADDRESS,
  classAddress,
  classAddressShort,
  classCalendarLocation,
} from '@/lib/studio-location';

// Booking emails, reminders and calendar invites for a class use that class's
// start time, so September classes still point at the previous studio.
describe('per-class address across the Oct 1 move', () => {
  it('moves at midnight Oct 1 studio time, not UTC', () => {
    expect(MOVE_DATE.toISOString()).toBe('2026-10-01T04:00:00.000Z');
  });

  it('sends the last September class to the previous studio', () => {
    const lastSept = '2026-09-30T23:00:00-04:00';
    expect(classAddress(lastSept)).toContain('Speonk');
    expect(classAddressShort(lastSept)).toBe('295 Montauk Hwy, Speonk');
    expect(classCalendarLocation(lastSept)).not.toContain('U Gotta Dance');
  });

  it('sends the first October class to U Gotta Dance, rear building', () => {
    const firstOct = '2026-10-01T07:00:00-04:00';
    expect(classAddress(firstOct)).toBe(
      'U Gotta Dance · Classes in Rear Building · 533 Montauk Highway, East Moriches, NY 11940'
    );
    expect(classAddressShort(firstOct)).toBe(
      'U Gotta Dance · Classes in Rear Building · 533 Montauk Hwy, East Moriches'
    );
    expect(classCalendarLocation(firstOct)).toContain('Classes in Rear Building');
  });

  it('treats the exact move instant as the new studio', () => {
    expect(classAddress(MOVE_DATE)).toContain(STUDIO_ADDRESS);
  });
});
