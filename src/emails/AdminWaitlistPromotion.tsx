import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EMAIL_BRAND, EMAIL_SITE, EmailParagraph } from './components/EmailLayout';

interface Props {
  promotedMemberName: string;
  promotedMemberEmail: string;
  classTitle: string;
  classDate: string;
  classTime: string;
}

export function AdminWaitlistPromotion({
  promotedMemberName,
  promotedMemberEmail,
  classTitle,
  classDate,
  classTime,
}: Props) {
  return (
    <EmailLayout
      kicker="Waitlist promotion"
      heading="A spot was filled."
      preview={`${promotedMemberName} auto-promoted into ${classTitle}`}
    >
      <EmailParagraph>
        Someone on the waitlist was automatically booked in after a cancellation.
      </EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700 }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          {classDate} at {classTime}
        </Text>
      </EmailCard>

      <EmailCard>
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700 }}>
          {promotedMemberName}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{promotedMemberEmail}</Text>
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '20px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/admin/classes`}>View classes</EmailButton>
      </div>
    </EmailLayout>
  );
}
