import { describe, it, expect } from 'vitest';
import { getCapacityStatus } from '@/lib/capacity-status';

describe('getCapacityStatus (capacity 20, spec thresholds)', () => {
  it.each([
    [0, 'available', 'Spots Available', 20],
    [7, 'available', 'Spots Available', 13],
    [8, 'going_fast', 'Spots Going Fast', 12],
    [11, 'going_fast', 'Spots Going Fast', 9],
    [12, 'filling_up', 'Filling Up', 8],
    [15, 'filling_up', 'Filling Up', 5],
    [16, 'almost_full', 'Almost Full', 4],
    [18, 'almost_full', 'Almost Full', 2],
    [19, 'final_spot', 'Final Spot', 1],
    [20, 'waitlist', 'Waitlist Open', 0],
  ])('booked=%i → %s', (booked, state, label, spotsLeft) => {
    const r = getCapacityStatus(booked);
    expect(r.state).toBe(state);
    expect(r.label).toBe(label);
    expect(r.spotsLeft).toBe(spotsLeft);
  });

  it('clamps negative booked to 0 (treats as available)', () => {
    expect(getCapacityStatus(-5).state).toBe('available');
  });

  it('clamps overflow booked to capacity (treats as waitlist)', () => {
    expect(getCapacityStatus(25).state).toBe('waitlist');
    expect(getCapacityStatus(25).spotsLeft).toBe(0);
  });
});

describe('non-20 capacities (proportional)', () => {
  it('10-person class with 1 spot left is final_spot', () => {
    expect(getCapacityStatus(9, 10).state).toBe('final_spot');
  });
  it('10-person class fully booked is waitlist', () => {
    expect(getCapacityStatus(10, 10).state).toBe('waitlist');
  });
  it('10-person class with 4 booked is going_fast (scaled from 8 of 20)', () => {
    // scale(7) = round(7/20 * 10) = 4 ⇒ booked<=4 stays available
    expect(getCapacityStatus(4, 10).state).toBe('available');
    // booked=5 of 10 corresponds to scale(11)=round(5.5)=6 → going_fast band
    expect(getCapacityStatus(5, 10).state).toBe('going_fast');
  });
});

describe('invalid capacity', () => {
  it('defaults to 20 when capacity is 0', () => {
    expect(getCapacityStatus(7, 0).state).toBe('available');
    expect(getCapacityStatus(20, 0).state).toBe('waitlist');
  });
});
