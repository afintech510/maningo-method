import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND, EMAIL_SITE } from './components/EmailLayout';

interface Props {
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  packLabel: string;
  amount: string;
  method: 'cash' | 'zelle' | 'venmo';
  paymentId: string;
}

const METHOD_LABEL: Record<Props['method'], string> = {
  cash: 'Cash (at first class)',
  zelle: 'Zelle',
  venmo: 'Venmo (direct)',
};

export function ManualPaymentSubmitted({ studentName, studentEmail, studentPhone, packLabel, amount, method, paymentId }: Props) {
  return (
    <EmailLayout
      kicker="Manual payment pending"
      heading="Heads up — payment request."
      preview={`${studentName} · ${amount} · ${METHOD_LABEL[method]}`}
    >
      <EmailParagraph>
        A student just submitted a {METHOD_LABEL[method]} payment request. Look out for the transfer (or
        cash at the studio), then mark it paid in admin to apply credits.
      </EmailParagraph>

      <EmailCard>
        <Text style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>{studentName}</Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{studentEmail}</Text>
        {studentPhone && (
          <Text style={{ margin: '2px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{studentPhone}</Text>
        )}
        <div style={{ borderTop: `1px solid ${EMAIL_BRAND.border}`, margin: '14px 0' }} />
        <Text style={{ margin: 0 }}>
          <strong>{packLabel}</strong> &middot; {amount}
        </Text>
        <Text style={{ color: EMAIL_BRAND.muted, margin: '4px 0 0', fontSize: '13px' }}>
          Method: {METHOD_LABEL[method]}
        </Text>
        <Text style={{ color: EMAIL_BRAND.muted, margin: '2px 0 0', fontSize: '11px' }}>
          Ref: {paymentId}
        </Text>
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '20px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/admin/manual-payments`}>Mark paid in admin</EmailButton>
      </div>
    </EmailLayout>
  );
}
