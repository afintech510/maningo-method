import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDocumentPdfUrl, verifySignWellWebhook } from '@/lib/signwell';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const raw = await request.text();
  const signature = request.headers.get('x-signwell-signature') || request.headers.get('signwell-signature');
  if (!verifySignWellWebhook(raw, signature, process.env.SIGNWELL_WEBHOOK_SECRET)) {
    log.warn('SignWell webhook signature failed');
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const eventType: string = event.event?.type || event.type || '';
  if (!eventType.toLowerCase().includes('completed') && !eventType.toLowerCase().includes('signed')) {
    return NextResponse.json({ received: true });
  }

  const doc = event.data?.object || event.document || event.data || {};
  const documentId: string | undefined = doc.id;
  const studentId: string | undefined = doc.metadata?.student_id;
  if (!documentId) {
    return NextResponse.json({ received: true });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;

  const supabase = createAdminClient();
  let pdfUrl: string | null = null;
  try {
    pdfUrl = await getDocumentPdfUrl(documentId);
  } catch (err) {
    log.warn({ err, documentId }, 'Could not fetch completed PDF URL');
  }

  const update = {
    waiver_signed_at: new Date().toISOString(),
    waiver_pdf_url: pdfUrl,
    waiver_signed_ip: ip,
  };

  let res;
  if (studentId) {
    res = await supabase.from('profiles').update(update).eq('id', studentId);
  } else {
    res = await supabase.from('profiles').update(update).eq('waiver_signwell_doc_id', documentId);
  }
  if (res.error) {
    log.error({ err: res.error, documentId, studentId }, 'Failed to mark waiver signed');
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  log.info({ documentId, studentId }, 'Waiver marked signed');
  return NextResponse.json({ received: true });
}
