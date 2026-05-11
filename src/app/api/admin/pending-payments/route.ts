import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Unified pending-payments feed for the admin reconcile view. Merges
 * manual_payments (cash/venmo pack buys) with gift_packs that don't have a
 * Stripe PaymentIntent (cash/venmo gifts) so Chelsea has one inbox.
 *
 * Result rows share a tagged shape:
 *   - kind: 'pack' | 'gift'
 *   - id, buyer_name, buyer_email, buyer_phone, amount_cents,
 *     payment_method, status, created_at
 *   - pack rows also carry pack_type + credits
 *   - gift rows also carry code, recipient_name, recipient_email,
 *     delivery_mode, pack_type
 */
export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

  const [{ data: packsRaw }, { data: giftsRaw }] = await Promise.all([
    supabase
      .from('manual_payments')
      .select(
        'id, pack_type, credits, amount_cents, payment_method, status, created_at, paid_at, cancelled_at, provisional_credits_applied, profiles:student_id (full_name, email, phone)'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('gift_packs')
      .select(
        'id, code, pack_type, credits, amount_cents, delivery_mode, recipient_name, recipient_email, purchaser_name, purchaser_email, status, created_at, redeemed_at, stripe_payment_intent_id'
      )
      .is('stripe_payment_intent_id', null)
      .order('created_at', { ascending: false }),
  ]);

  type PendingRow =
    | {
        kind: 'pack';
        id: string;
        buyer_name: string;
        buyer_email: string;
        buyer_phone: string | null;
        amount_cents: number;
        payment_method: string;
        status: string;
        created_at: string;
        completed_at: string | null;
        pack_type: string;
        credits: number;
        provisional_credits_applied: number;
      }
    | {
        kind: 'gift';
        id: string;
        buyer_name: string;
        buyer_email: string;
        buyer_phone: string | null;
        amount_cents: number;
        payment_method: 'cash' | 'venmo' | 'manual';
        status: string;
        created_at: string;
        completed_at: string | null;
        pack_type: string;
        credits: number;
        code: string;
        recipient_name: string | null;
        recipient_email: string | null;
        delivery_mode: 'email' | 'share';
      };

  const packs: PendingRow[] = (packsRaw || []).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (p as any).profiles;
    return {
      kind: 'pack' as const,
      id: p.id,
      buyer_name: profile?.full_name || 'Unknown',
      buyer_email: profile?.email || '',
      buyer_phone: profile?.phone || null,
      amount_cents: p.amount_cents,
      payment_method: p.payment_method,
      status: p.status,
      created_at: p.created_at,
      completed_at: p.paid_at || p.cancelled_at || null,
      pack_type: p.pack_type,
      credits: p.credits,
      provisional_credits_applied: p.provisional_credits_applied || 0,
    };
  });

  const gifts: PendingRow[] = (giftsRaw || []).map((g) => ({
    kind: 'gift' as const,
    id: g.id,
    buyer_name: g.purchaser_name || 'Guest',
    buyer_email: g.purchaser_email || '',
    buyer_phone: null,
    amount_cents: g.amount_cents,
    payment_method: 'manual', // payment method not stored on gift_packs yet
    status: g.status,
    created_at: g.created_at,
    completed_at: g.redeemed_at || null,
    pack_type: g.pack_type,
    credits: g.credits,
    code: g.code,
    recipient_name: g.recipient_name,
    recipient_email: g.recipient_email,
    delivery_mode: (g.delivery_mode === 'email' ? 'email' : 'share') as 'email' | 'share',
  }));

  const all = [...packs, ...gifts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ payments: all });
}
