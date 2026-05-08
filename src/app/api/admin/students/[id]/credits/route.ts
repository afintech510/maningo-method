import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { applyCreditDelta, InsufficientCreditsError } from '@/lib/credits';
import { logger, generateCorrelationId } from '@/lib/logger';

const adjustSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, { message: 'delta must be non-zero' }),
  reason: z.string().min(3).max(280),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const result = adjustSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }

    const { newBalance } = await applyCreditDelta({
      studentId: params.id,
      delta: result.data.delta,
      reason: result.data.reason,
      source: 'admin_manual',
      adminId: auth.user.id,
    });

    log.info({ studentId: params.id, delta: result.data.delta, newBalance, adminId: auth.user.id }, 'Admin credit adjustment');
    return NextResponse.json({ new_balance: newBalance });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_CREDITS', message: 'Cannot deduct that many credits — balance would go negative.' } },
        { status: 400 }
      );
    }
    log.error({ err: err instanceof Error ? err.message : err }, 'Admin credit adjustment failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
