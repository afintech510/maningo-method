import { Text, Section } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  hoursUntil: number;
  googleCalUrl?: string;
  icsUrl?: string;
}

export function ClassReminder({ studentName, classTitle, classDate, classTime, hoursUntil, googleCalUrl, icsUrl }: Props) {
  const soon = hoursUntil <= 3;
  return (
    <EmailLayout
      kicker={soon ? 'See you soon' : 'Class tomorrow'}
      heading={soon ? `Heading to class, ${studentName}?` : `${studentName}, class tomorrow.`}
      preview={`${classTitle} · ${classDate} at ${classTime}`}
    >
      <EmailParagraph>Just a heads-up about your booking.</EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700 }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          {classDate} &middot; {classTime}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          295 Montauk Hwy, Suite 7, Speonk, NY
        </Text>
      </EmailCard>

      {(googleCalUrl || icsUrl) && (
        <Section style={{ textAlign: 'center' as const, margin: '14px 0 4px' }}>
          {googleCalUrl && <EmailButton href={googleCalUrl}>Google Calendar</EmailButton>}
          {icsUrl && <EmailButton href={icsUrl} tone="dark">Apple / Outlook</EmailButton>}
        </Section>
      )}

      <EmailParagraph>
        Bring a mat and a small towel. Grippy socks or barefoot are both perfect. Cancel up to 12 hours
        before for a full credit refund.
      </EmailParagraph>
    </EmailLayout>
  );
}
