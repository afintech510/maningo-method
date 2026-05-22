import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Aggregate "everything we know about this member" so the admin panel can
// render a single complete history modal. Auth-gated to admin/superadmin
// (requireAuth('admin') accepts both via the SQL helper).
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const id = params.id;
  const supabase = createAdminClient();

  const [
    profileRes,
    bookingsRes,
    creditPurchasesRes,
    manualPaymentsRes,
    creditAdjustmentsRes,
    giftsPurchasedRes,
    giftsRedeemedRes,
    referralsMadeRes,
    referralRewardsRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, created_at, credits, gift_balance_cents, waiver_signed_at, referral_code, referred_by')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select('id, status, payment_type, amount_paid_cents, created_at, cancelled_at, classes!bookings_class_id_fkey(id, title, starts_at, duration_minutes, status)')
      .eq('student_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('credit_purchases')
      .select('id, pack_type, credits_added, amount_paid_cents, created_at')
      .eq('student_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('manual_payments')
      .select('id, pack_type, credits, amount_cents, payment_method, status, created_at, paid_at, notes')
      .eq('student_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('credit_adjustments')
      .select('id, delta, balance_after, reason, source, related_id, created_at')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('gift_packs')
      .select('id, code, recipient_name, recipient_email, pack_type, credits, amount_cents, status, redeemed_at, created_at')
      .eq('purchaser_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('gift_packs')
      .select('id, code, pack_type, credits, amount_cents, redeemed_at')
      .eq('redeemed_by', id)
      .order('redeemed_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('referred_by', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('referral_rewards')
      .select('id, referred_id, credits_rewarded, created_at')
      .eq('referrer_id', id),
  ]);

  if (!profileRes.data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Member not found.' } },
      { status: 404 }
    );
  }
  const profile = profileRes.data;

  // Resolve referrer profile if this member was referred by someone.
  let referrer: { id: string; full_name: string | null; email: string | null } | null = null;
  if (profile.referred_by) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', profile.referred_by)
      .maybeSingle();
    if (data) referrer = data;
  }

  // Stitch each referred friend with their reward status.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rewardByReferred = new Map<string, any>();
  (referralRewardsRes.data || []).forEach((r) => rewardByReferred.set(r.referred_id, r));
  const referralsMade = (referralsMadeRes.data || []).map((p) => ({
    profile: p,
    reward: rewardByReferred.get(p.id) || null,
  }));

  // Stats — derived so the modal doesn't have to compute over the lists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (bookingsRes.data as any[]) || [];
  const now = Date.now();
  let attended = 0;
  let upcoming = 0;
  let cancelled = 0;
  for (const b of bookings) {
    if (b.status === 'cancelled') {
      cancelled++;
      continue;
    }
    const startTs = b.classes?.starts_at ? new Date(b.classes.starts_at).getTime() : null;
    if (startTs !== null && startTs < now) attended++;
    else if (startTs !== null) upcoming++;
  }

  const stripeSpend = (creditPurchasesRes.data || []).reduce(
    (sum, p) => sum + (p.amount_paid_cents || 0),
    0,
  );
  const manualSpend = (manualPaymentsRes.data || [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount_cents || 0), 0);
  const giftSpend = (giftsPurchasedRes.data || []).reduce(
    (sum, g) => sum + (g.amount_cents || 0),
    0,
  );

  return NextResponse.json({
    profile,
    referrer,
    stats: {
      attended,
      upcoming,
      cancelled_bookings: cancelled,
      stripe_spend_cents: stripeSpend,
      manual_spend_cents: manualSpend,
      gift_spend_cents: giftSpend,
      total_spend_cents: stripeSpend + manualSpend + giftSpend,
    },
    bookings,
    credit_purchases: creditPurchasesRes.data || [],
    manual_payments: manualPaymentsRes.data || [],
    credit_adjustments: creditAdjustmentsRes.data || [],
    gifts_purchased: giftsPurchasedRes.data || [],
    gifts_redeemed: giftsRedeemedRes.data || [],
    referrals_made: referralsMade,
  });
}
