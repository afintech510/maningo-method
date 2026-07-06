import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EMAIL_BRAND, EMAIL_SITE, EmailParagraph } from './components/EmailLayout';

interface Props {
  memberName: string;
  memberEmail: string;
  classTitle: string;
  classDate: string;
  classTime: string;
}

export function AdminBookingCancellation({
  memberName,
  memberEmail,
  classTitle,
  classDate,
  classTime,
}: Props) {
  return (
    <EmailLayout
      kicker="Cancellation"
      heading="A member cancelled."
      preview={`${memberName} cancelled ${classTitle} on ${classDate}`}
    >
      <EmailParagraph>A member just cancelled their booking.</EmailParagraph>

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
          {memberName}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{memberEmail}</Text>
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '20px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/admin/classes`}>View classes</EmailButton>
      </div>
    </EmailLayout>
  );
}
