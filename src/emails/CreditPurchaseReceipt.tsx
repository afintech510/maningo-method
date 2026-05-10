import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND, EMAIL_SITE } from './components/EmailLayout';

interface Props {
  studentName: string;
  packLabel: string;
  creditsAdded: number;
  amountPaid: string;
  serviceFee?: string;
  newBalance: number;
}

export function CreditPurchaseReceipt({ studentName, packLabel, creditsAdded, amountPaid, serviceFee, newBalance }: Props) {
  return (
    <EmailLayout kicker="Receipt" heading="Credits added." preview={`${packLabel} · ${amountPaid}`}>
      <EmailParagraph>Hi {studentName}, your credits are ready to book.</EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700 }}>
          {packLabel}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          +{creditsAdded} class credit{creditsAdded === 1 ? '' : 's'} added
        </Text>
        <div style={{ borderTop: `1px solid ${EMAIL_BRAND.border}`, margin: '14px 0' }} />
        {serviceFee && (
          <Text style={{ margin: 0, color: EMAIL_BRAND.muted, fontSize: '13px' }}>
            Includes 3% service fee: {serviceFee}
          </Text>
        )}
        <Text style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '15px' }}>
          Total paid: {amountPaid}
        </Text>
      </EmailCard>

      <EmailCard>
        <Text style={{ margin: 0, color: EMAIL_BRAND.muted, fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.18em' }}>
          Credit balance
        </Text>
        <Text style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0', fontFamily: 'Georgia, serif' }}>
          {newBalance} credit{newBalance === 1 ? '' : 's'}
        </Text>
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '20px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/schedule`}>Book a class</EmailButton>
      </div>

      <Text style={{ color: EMAIL_BRAND.muted, fontSize: '13px', margin: '14px 0 0' }}>
        Credits never expire. See you soon.
      </Text>
    </EmailLayout>
  );
}
