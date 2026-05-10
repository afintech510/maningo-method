import { EmailLayout, EmailParagraph } from './components/EmailLayout';

interface Props {
  purchaserName: string;
  recipientName: string | null;
  packLabel: string;
  redeemerName: string | null;
}

export function GiftRedeemed({ purchaserName, recipientName, packLabel, redeemerName }: Props) {
  const who = redeemerName || recipientName || 'the recipient';
  return (
    <EmailLayout
      kicker="Gift redeemed"
      heading="Your gift was used."
      preview={`${who} just redeemed your gift`}
    >
      <EmailParagraph>
        Hi {purchaserName} — {who} just redeemed their Maningo Method gift ({packLabel}). Hope they
        have a great class.
      </EmailParagraph>
      <EmailParagraph>Thanks for sharing the studio with them.</EmailParagraph>
    </EmailLayout>
  );
}
