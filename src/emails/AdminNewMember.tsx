import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND, EMAIL_SITE } from './components/EmailLayout';

interface Props {
  memberName: string;
  memberEmail: string;
  memberPhone: string | null;
  smsMarketingConsent: boolean;
  emailMarketingConsent: boolean;
  referredByName?: string | null;
  createdAt: string;
}

export function AdminNewMember({
  memberName,
  memberEmail,
  memberPhone,
  smsMarketingConsent,
  emailMarketingConsent,
  referredByName,
  createdAt,
}: Props) {
  return (
    <EmailLayout
      kicker="New member"
      heading="Someone just joined."
      preview={`${memberName} · ${memberEmail}`}
    >
      <EmailParagraph>A new student just created an account on Maningo Method.</EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700 }}>
          {memberName}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{memberEmail}</Text>
        {memberPhone && (
          <Text style={{ margin: '2px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{memberPhone}</Text>
        )}
        <div style={{ borderTop: `1px solid ${EMAIL_BRAND.border}`, margin: '12px 0' }} />
        <Text style={{ margin: 0, color: EMAIL_BRAND.muted, fontSize: '12px' }}>
          Marketing opt-in: SMS {smsMarketingConsent ? '✓' : '—'} · Email {emailMarketingConsent ? '✓' : '—'}
        </Text>
        {referredByName && (
          <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '12px' }}>
            Referred by: {referredByName}
          </Text>
        )}
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '11px' }}>
          Joined {createdAt}
        </Text>
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '20px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/admin/students`}>View members</EmailButton>
      </div>
    </EmailLayout>
  );
}
