const SW_BASE = 'https://www.signwell.com/api/v1';

function getKey(): string {
  const key = process.env.SIGNWELL_API_KEY;
  if (!key) throw new Error('SIGNWELL_API_KEY not configured');
  return key;
}

function getTemplateId(): string {
  const id = process.env.SIGNWELL_WAIVER_TEMPLATE_ID;
  if (!id) throw new Error('SIGNWELL_WAIVER_TEMPLATE_ID not configured');
  return id;
}

type SignWellRecipient = {
  id: string;
  placeholder_name: string;
  name: string;
  email: string;
};

export type CreateDocumentResult = {
  documentId: string;
  embeddedSigningUrl: string;
};

export async function createWaiverDocument(args: {
  fullName: string;
  email: string;
  studentId: string;
  redirectUrl: string;
}): Promise<CreateDocumentResult> {
  const recipients: SignWellRecipient[] = [
    {
      id: 'signer',
      placeholder_name: 'Participant',
      name: args.fullName,
      email: args.email,
    },
  ];

  const body = {
    test_mode: false,
    template_id: getTemplateId(),
    embedded_signing: true,
    embedded_signing_notifications: true,
    redirect_url: args.redirectUrl,
    recipients,
    metadata: { student_id: args.studentId },
    name: `Waiver - ${args.fullName}`,
    subject: 'Please sign your Maningo Method liability waiver',
    message: 'Please review and sign before your first class.',
  };

  const res = await fetch(`${SW_BASE}/document_templates/documents`, {
    method: 'POST',
    headers: {
      'X-Api-Key': getKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SignWell create document failed: ${res.status} ${text.slice(0, 500)}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const docId = data.id;
  const url = data.recipients?.[0]?.embedded_signing_url || data.embedded_signing_url || data.recipients?.[0]?.signing_url;
  if (!docId || !url) {
    throw new Error(`SignWell response missing document id or signing url: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { documentId: docId, embeddedSigningUrl: url };
}

export async function getDocumentPdfUrl(documentId: string): Promise<string | null> {
  const res = await fetch(`${SW_BASE}/documents/${documentId}/completed_pdf`, {
    headers: { 'X-Api-Key': getKey() },
  });
  if (!res.ok) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return data.file_url || data.url || null;
}

export function verifySignWellWebhook(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret) return true; // not configured; accept (we'll match doc ID)
  if (!signature) return false;
  // SignWell uses HMAC-SHA256 of raw body with secret
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
