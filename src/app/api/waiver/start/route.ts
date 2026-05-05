import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWaiverDocument } from '@/lib/signwell';
import { getBaseUrl } from '@/lib/utils';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const isMinor: boolean = !!body.is_minor;
    const minorName: string | null = body.minor_name || null;
    const minorDob: string | null = body.minor_dob || null;

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, waiver_signed_at')
      .eq('id', auth.user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } },
        { status: 404 }
      );
    }

    if (profile.waiver_signed_at) {
      return NextResponse.json({ already_signed: true });
    }

    if (isMinor && (!minorName || !minorDob)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Minor name and date of birth are required.' } },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();
    const result = await createWaiverDocument({
      fullName: profile.full_name || auth.user.email,
      email: profile.email || auth.user.email,
      studentId: auth.user.id,
      redirectUrl: `${baseUrl}/waiver/sign?status=complete`,
    });

    await supabase
      .from('profiles')
      .update({
        waiver_signwell_doc_id: result.documentId,
        waiver_signer_kind: isMinor ? 'parent_guardian' : 'adult',
        waiver_minor_name: isMinor ? minorName : null,
        waiver_minor_dob: isMinor ? minorDob : null,
      })
      .eq('id', auth.user.id);

    log.info({ studentId: auth.user.id, documentId: result.documentId, isMinor }, 'Waiver document created');
    return NextResponse.json({ embedded_url: result.embeddedSigningUrl, document_id: result.documentId });
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Waiver start failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not start waiver. Try again.' } },
      { status: 500 }
    );
  }
}
