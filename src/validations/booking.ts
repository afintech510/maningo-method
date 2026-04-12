import { z } from 'zod';

export const createBookingSchema = z.object({
  class_id: z.string().uuid('Invalid class ID'),
  payment_type: z.enum(['subscription', 'drop_in'], {
    error: 'Payment type must be subscription or drop_in',
  }),
});

export const cancelBookingSchema = z.object({
  status: z.literal('cancelled'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
