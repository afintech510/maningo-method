import { Section, Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface BookingConfirmationProps {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  duration: number;
  /** Number of credits remaining after this booking. Optional — only shown if provided. */
  creditsRemaining?: number;
  /** Public Google Calendar add URL. */
  googleCalUrl?: string;
  /** Public ICS download URL (Apple / Outlook). */
  icsUrl?: string;
}

export function BookingConfirmation({
  studentName,
  classTitle,
  classDate,
  classTime,
  duration,
  creditsRemaining,
  googleCalUrl,
  icsUrl,
}: BookingConfirmationProps) {
  return (
    <EmailLayout
      kicker="Booking confirmed"
      heading="You&rsquo;re on the mat."
      preview={`${classTitle} · ${classDate} at ${classTime}`}
    >
      <EmailParagraph>Hi {studentName}, your spot is locked in.</EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: EMAIL_BRAND.ink }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          {classDate} &middot; {classTime} &middot; {duration} min
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          295 Montauk Hwy, Suite 7, Speonk, NY
        </Text>
      </EmailCard>

      {(googleCalUrl || icsUrl) && (
        <Section style={{ textAlign: 'center' as const, margin: '16px 0 4px' }}>
          <Text style={{ fontSize: '12px', color: EMAIL_BRAND.muted, margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>
            Add to your calendar
          </Text>
          {googleCalUrl && <EmailButton href={googleCalUrl}>Google Calendar</EmailButton>}
          {icsUrl && <EmailButton href={icsUrl} tone="dark">Apple / Outlook</EmailButton>}
        </Section>
      )}

      <EmailParagraph>
        Bring a mat and a small towel. Grippy socks or barefoot are both perfect. Cancel up to 12 hours
        before class for a full credit refund.
      </EmailParagraph>

      {typeof creditsRemaining === 'number' && (
        <Text style={{ color: EMAIL_BRAND.muted, fontSize: '13px', margin: '4px 0 0' }}>
          Credits remaining: <strong style={{ color: EMAIL_BRAND.ink }}>{creditsRemaining}</strong>
        </Text>
      )}
    </EmailLayout>
  );
}
