import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createElement } from 'react';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM_EMAIL, REPLY_TO } from '@/lib/resend';
import { renderTemplate, buildMemberContext } from '@/lib/member-email';
import { MemberMessage } from '@/emails/MemberMessage';
import { logger, generateCorrelationId } from '@/lib/logger';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maningomethod.com';

const bodySchema = z.object({
  member_ids: z.array(z.string().uuid()).min(1).max(500),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
});

interface MemberProfile {
  id: string;
  full_name: string | null;
  email: string;
  credits: number | null;
  gift_balance_cents: number | null;
  email_marketing_consent: boolean | null;
}

interface AttendedRow {
  student_id: string;
  classes: { starts_at: string } | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 }
    );
  }

  const { member_ids, subject, body: bodyTemplate } = parsed.data;
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, credits, gift_balance_cents, email_marketing_consent')
    .in('id', member_ids);

  const profileById = new Map<string, MemberProfile>();
  (profiles || []).forEach((p) => profileById.set(p.id, p as MemberProfile));

  // Most-recent past class per requested student in one query.
  const nowIso = new Date().toISOString();
  const { data: attended } = await supabase
    .from('bookings')
    .select('student_id, classes!inner(starts_at)')
    .in('student_id', member_ids)
    .eq('status', 'confirmed')
    .lt('classes.starts_at', nowIso)
    .order('classes(starts_at)', { ascending: false });
  const lastAttendedByStudent = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (attended as any[] | null)?.forEach((r) => {
    const sid = r.student_id as string | undefined;
    const startsAt = (r.classes?.starts_at as string | undefined) || undefined;
    if (!sid || !startsAt) return;
    const prev = lastAttendedByStudent.get(sid);
    if (!prev || startsAt > prev) lastAttendedByStudent.set(sid, startsAt);
  });
  void (null as unknown as AttendedRow);

  const resend = getResend();
  const results: Array<{ member_id: string; ok: boolean; id?: string; reason?: string }> = [];
  const skipped: Array<{ member_id: string; reason: string }> = [];

  for (let i = 0; i < member_ids.length; i++) {
    if (i > 0) await sleep(250); // 5 req/s Resend free tier
    const mid = member_ids[i];
    const profile = profileById.get(mid);
    if (!profile?.email) {
      skipped.push({ member_id: mid, reason: 'No email on profile' });
      continue;
    }
    if (profile.email_marketing_consent === false) {
      skipped.push({ member_id: mid, reason: 'Member opted out of marketing email' });
      continue;
    }

    const fullName = profile.full_name || '';
    const firstName = fullName.split(' ')[0] || fullName;
    const ctx = buildMemberContext({
      first_name: firstName || 'there',
      full_name: fullName || profile.email,
      email: profile.email,
      credits: profile.credits || 0,
      gift_balance_cents: profile.gift_balance_cents || 0,
      last_attended_at: lastAttendedByStudent.get(mid) || null,
      site_url: SITE_URL,
    });

    const renderedSubject = renderTemplate(subject, ctx);
    const renderedBody = renderTemplate(bodyTemplate, ctx);

    try {
      const out = (await resend.emails.send({
        from: `Maningo Method <${FROM_EMAIL}>`,
        replyTo: REPLY_TO,
        to: profile.email,
        subject: renderedSubject,
        react: createElement(MemberMessage, { subject: renderedSubject, body: renderedBody }),
      })) as { data?: { id?: string }; error?: { message?: string } | null };
      if (out?.error) {
        results.push({ member_id: mid, ok: false, reason: out.error.message || 'Resend error' });
      } else {
        results.push({ member_id: mid, ok: true, id: out?.data?.id });
      }
    } catch (err) {
      results.push({
        member_id: mid,
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  log.info(
    { adminId: auth.user.id, attempted: member_ids.length, sent, failed: failed.length, skipped: skipped.length },
    'Bulk member email batch complete',
  );

  return NextResponse.json({
    attempted: member_ids.length,
    sent,
    failed,
    skipped,
  });
}
