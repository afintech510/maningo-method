import { EmailLayout, EmailButton, EmailParagraph } from './components/EmailLayout';

interface Props {
  firstName: string;
  reviewUrl: string;
  bookingUrl: string;
}

export function ReviewRequestEmail({ firstName, reviewUrl, bookingUrl }: Props) {
  return (
    <EmailLayout
      kicker="Thank you"
      heading="Thanks for your first class."
      preview={`Hi ${firstName} — would you share a quick review?`}
    >
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>
        We&rsquo;re so glad you came in. If you have a minute, a quick Google review helps other people
        in the community find us &mdash; it means the world to a new studio.
      </EmailParagraph>

      <EmailButton href={reviewUrl}>Leave a Google review &rarr;</EmailButton>

      <EmailParagraph>
        And whenever you&rsquo;re ready to come back, the schedule&rsquo;s here:
      </EmailParagraph>

      <EmailButton href={bookingUrl} tone="dark">Book your next class</EmailButton>

      <EmailParagraph>
        See you on the mat,<br />Chelsea
      </EmailParagraph>
    </EmailLayout>
  );
}
