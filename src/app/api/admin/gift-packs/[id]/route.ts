import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGiftReceived } from '@/lib/resend';
import { formatCents } from '@/lib/pricing';
import { logger, generateCorrelationId } from '@/lib/logger';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maningomethod.com';

const PACK_LABEL: Record<string, string> = {
  single: 'Drop-In Class',
  '5pack': '5-Class Pack',
  '10pack': '10-Class Pack',
  custom: 'Custom Gift Pack',
};

const patchSchema = z.object({
  status: z.enum(['active', 'cancelled']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: gift, error: fetchErr } = await supabase
      .from('gift_packs')
      .select('id, code, status, delivery_mode, recipient_name, recipient_email, sender_message, purchaser_name, pack_type, amount_cents')
      .eq('id', params.id)
      .single();

    if (fetchErr || !gift) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Gift not found.' } },
        { status: 404 }
      );
    }

    if (gift.status !== 'pending') {
      return NextResponse.json(
        { error: { code: 'WRONG_STATE', message: `Gift is already ${gift.status}.` } },
        { status: 409 }
      );
    }

    const { error: updateErr } = await supabase
      .from('gift_packs')
      .update({ status: parsed.data.status })
      .eq('id', params.id)
      .eq('status', 'pending');

    if (updateErr) {
      log.error({ err: updateErr, giftId: params.id }, 'Failed to update gift status');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Could not update gift.' } },
        { status: 500 }
      );
    }

    // If activated and delivery=email, send the recipient their gift now.
    if (parsed.data.status === 'active' && gift.delivery_mode === 'email' && gift.recipient_email) {
      void sendGiftReceived(gift.recipient_email, {
        recipientName: gift.recipient_name || 'there',
        senderName: gift.purchaser_name || 'A friend',
        senderMessage: gift.sender_message || null,
        packLabel: PACK_LABEL[gift.pack_type] || `Gift (${formatCents(gift.amount_cents)})`,
        code: gift.code,
        redemptionUrl: `${SITE_URL}/redeem`,
      });
    }

    log.info(
      { giftId: params.id, status: parsed.data.status, adminId: auth.user.id },
      'Gift status updated by admin'
    );

    return NextResponse.json({ id: params.id, status: parsed.data.status });
  } catch (err) {
    log.error({ err }, 'PATCH /api/admin/gift-packs/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
