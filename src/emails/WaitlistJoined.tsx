import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface WaitlistJoinedProps {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  position: number;
}

export function WaitlistJoined({
  studentName,
  classTitle,
  classDate,
  classTime,
  position,
}: WaitlistJoinedProps) {
  return (
    <EmailLayout
      kicker="Waitlist joined"
      heading="You&rsquo;re on the list."
      preview={`Waitlist #${position} for ${classTitle} · ${classDate}`}
    >
      <EmailParagraph>Hi {studentName}, you&rsquo;re #{position} on the waitlist.</EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: EMAIL_BRAND.ink }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          {classDate} &middot; {classTime}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          295 Montauk Hwy, Suite 7, Speonk, NY
        </Text>
      </EmailCard>

      <EmailParagraph>
        If a spot opens up, Chelsea will promote you from the waitlist and you&rsquo;ll receive a
        confirmation email. One class credit will be used at that time.
      </EmailParagraph>

      <Text style={{ color: EMAIL_BRAND.muted, fontSize: '13px', margin: '4px 0 0' }}>
        You can leave the waitlist at any time from your dashboard.
      </Text>
    </EmailLayout>
  );
}
