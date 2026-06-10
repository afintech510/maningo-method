import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ScheduleExport } from '@/components/admin/ScheduleExport';
import { MarketingStats } from '@/components/admin/MarketingStats';
import { DiscountCodeManager } from '@/components/admin/DiscountCodeManager';

export const dynamic = 'force-dynamic';

// Week boundaries in studio time: Monday 00:00 → next Monday 00:00.
function studioWeekBounds(now = new Date()): { startIso: string; endIso: string } {
  const studioNow = toZonedTime(now, STUDIO_TIMEZONE);
  const dow = studioNow.getDay(); // 0 = Sun … 6 = Sat
  const daysSinceMonday = (dow + 6) % 7; // Mon → 0, Tue → 1 …
  const monday = new Date(studioNow);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  // monday / nextMonday currently carry the studio-local clock — convert back to real UTC instants.
  return {
    startIso: fromZonedTime(monday, STUDIO_TIMEZONE).toISOString(),
    endIso: fromZonedTime(nextMonday, STUDIO_TIMEZONE).toISOString(),
  };
}

export default async function AdminMarketingPage() {
  const auth = await getAuth();
  if (!auth || (auth.user.role !== 'admin' && auth.user.role !== 'superadmin')) {
    redirect('/login');
  }

  const supabase = createAdminClient();
  const { startIso, endIso } = studioWeekBounds();

  const { data: classes } = await supabase
    .from('classes')
    .select('id, title, starts_at, status')
    .gte('starts_at', startIso)
    .lt('starts_at', endIso)
    .order('starts_at', { ascending: true });

  // Marketing stats — discount codes + review emails (Phase 5).
  const [
    { count: emailsSent },
    { count: codesIssued },
    { count: codesRedeemed },
    { data: recent },
  ] = await Promise.all([
    supabase.from('marketing_emails_sent').select('id', { count: 'exact', head: true }),
    supabase.from('discount_codes').select('id', { count: 'exact', head: true }),
    supabase
      .from('discount_codes')
      .select('id', { count: 'exact', head: true })
      .not('redeemed_at', 'is', null),
    supabase
      .from('discount_codes')
      .select(
        'id, code, issued_at, expires_at, redeemed_at, is_active, profiles!discount_codes_member_id_fkey(full_name, email)',
      )
      .order('issued_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
          Marketing
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Weekly schedule export, review-request performance, and discount-code redemption.
        </p>
      </div>

      <ScheduleExport classes={classes || []} weekStart={startIso} weekEnd={endIso} />

      <div className="mt-10">
        <DiscountCodeManager />
      </div>

      <div className="mt-10">
        <MarketingStats
          emailsSent={emailsSent ?? 0}
          codesIssued={codesIssued ?? 0}
          codesRedeemed={codesRedeemed ?? 0}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recent={(recent as any[]) || []}
        />
      </div>
    </div>
  );
}
