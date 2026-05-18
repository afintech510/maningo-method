import { describe, it, expect } from 'vitest';
import { shouldRefundOnCancel } from '@/lib/admin-bookings';

const ADMIN = '00000000-0000-0000-0000-000000000aaa';

describe('shouldRefundOnCancel', () => {
  it('refunds when student self-booked with a credit', () => {
    expect(shouldRefundOnCancel('pack_credit', null)).toBe(true);
  });

  it('does NOT refund when an admin added the booking, even with pack_credit', () => {
    expect(shouldRefundOnCancel('pack_credit', ADMIN)).toBe(false);
  });

  it('does NOT refund a comp seat regardless of who added it', () => {
    expect(shouldRefundOnCancel('comp', null)).toBe(false);
    expect(shouldRefundOnCancel('comp', ADMIN)).toBe(false);
  });

  it('does NOT refund a drop-in (paid via Stripe, not a credit)', () => {
    expect(shouldRefundOnCancel('drop_in', null)).toBe(false);
  });

  it('handles null payment_type defensively', () => {
    expect(shouldRefundOnCancel(null, null)).toBe(false);
  });
});
