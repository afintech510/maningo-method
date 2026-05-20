import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  firstName: string;
  discountCode: string;
  reviewUrl: string;
  bookingUrl: string;
}

export function ReviewRequestEmail({ firstName, discountCode, reviewUrl, bookingUrl }: Props) {
  return (
    <EmailLayout
      kicker="Thank you"
      heading="Thanks for your first class."
      preview={`Here&rsquo;s 15% off your next booking, ${firstName}.`}
    >
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>
        We&rsquo;re so glad you came in. If you have a minute, a quick Google review helps other people
        in the community find us &mdash; it means the world to a new studio.
      </EmailParagraph>

      <EmailButton href={reviewUrl}>Leave a Google review &rarr;</EmailButton>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', color: EMAIL_BRAND.muted }}>
          Thank-you code
        </Text>
        <Text style={{ margin: '4px 0 0', fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, color: EMAIL_BRAND.ink, letterSpacing: '0.05em' }}>
          {discountCode}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          15% off a credit pack or drop-in. Single use &middot; valid 30 days.
        </Text>
      </EmailCard>

      <EmailButton href={bookingUrl} tone="dark">Book your next class</EmailButton>

      <EmailParagraph>
        See you on the mat,<br />Chelsea
      </EmailParagraph>
    </EmailLayout>
  );
}
