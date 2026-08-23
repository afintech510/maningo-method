import { z } from 'zod';

export const createClassSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  starts_at: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, 'Start time must be a valid future date'),
  duration_minutes: z.number().int().min(15).max(180),
  max_capacity: z.number().int().min(1).max(30),
  is_free: z.boolean().optional().default(false),
});

export const updateClassSchema = createClassSchema.partial();

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
