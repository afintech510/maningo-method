import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  purchaserName: string;
  recipientName: string | null;
  packLabel: string;
  amountDisplay: string;
  code: string;
  redemptionUrl: string;
  deliveryMode: 'email' | 'share';
  isDollarBalance?: boolean;
}

export function GiftPurchaseConfirmation({
  purchaserName,
  recipientName,
  packLabel,
  amountDisplay,
  code,
  redemptionUrl,
  deliveryMode,
  isDollarBalance,
}: Props) {
  return (
    <EmailLayout
      kicker="Gift confirmation"
      heading="Your gift is ready."
      preview={`Gift code · ${code}`}
    >
      <EmailParagraph>
        Hi {purchaserName}, thanks for gifting Maningo Method{recipientName ? ` to ${recipientName}` : ''}.
      </EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700 }}>
          {packLabel}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          {amountDisplay}
          {isDollarBalance ? ' gift balance · drains $25 at a time as the recipient books.' : ''}
        </Text>
      </EmailCard>

      <EmailCard>
        <Text style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.22em', color: EMAIL_BRAND.muted, textAlign: 'center' as const }}>
          Gift code
        </Text>
        <Text
          style={{
            margin: '8px 0 0',
            fontFamily: 'Georgia, serif',
            fontSize: '26px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: EMAIL_BRAND.gold,
            textAlign: 'center' as const,
          }}
        >
          {code}
        </Text>
      </EmailCard>

      {deliveryMode === 'email' && recipientName ? (
        <EmailParagraph>
          We sent the code straight to {recipientName} so they can redeem it. Keep this for your records.
        </EmailParagraph>
      ) : (
        <>
          <EmailParagraph>
            Share this code with the recipient however you like — text, card, in person. They redeem at:
          </EmailParagraph>
          <Text style={{ color: EMAIL_BRAND.gold, fontSize: '14px', wordBreak: 'break-all' as const, margin: '0 0 8px' }}>
            {redemptionUrl}
          </Text>
        </>
      )}
    </EmailLayout>
  );
}
