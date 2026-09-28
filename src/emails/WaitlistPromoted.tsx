import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface WaitlistPromotedProps {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  /** Where this class is held — callers pass classAddress(starts_at). */
  studioAddress?: string;
}

export function WaitlistPromoted({
  studentName,
  classTitle,
  classDate,
  classTime,
  studioAddress = '533 Montauk Hwy, East Moriches, NY',
}: WaitlistPromotedProps) {
  return (
    <EmailLayout
      kicker="You&rsquo;re in"
      heading="A spot opened up!"
      preview={`You're booked: ${classTitle} · ${classDate} at ${classTime}`}
    >
      <EmailParagraph>
        Great news, {studentName}! A spot opened up and you&rsquo;ve been booked in.
      </EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: EMAIL_BRAND.ink }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          {classDate} &middot; {classTime}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          {studioAddress}
        </Text>
      </EmailCard>

      <EmailParagraph>
        One class credit has been deducted from your balance. Bring a mat and a small towel.
        Cancel up to 12 hours before class for a full credit refund.
      </EmailParagraph>
    </EmailLayout>
  );
}
