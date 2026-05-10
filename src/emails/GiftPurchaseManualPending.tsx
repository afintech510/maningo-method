import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  purchaserName: string;
  recipientName: string | null;
  packLabel: string;
  amountDisplay: string;
  code: string;
  redemptionUrl: string;
  paymentMethod: 'cash' | 'venmo';
  venmoHandle: string;
  deliveryMode: 'email' | 'share';
}

export function GiftPurchaseManualPending({
  purchaserName,
  recipientName,
  packLabel,
  amountDisplay,
  code,
  redemptionUrl,
  paymentMethod,
  venmoHandle,
  deliveryMode,
}: Props) {
  return (
    <EmailLayout
      kicker="Gift code · payment pending"
      heading="One more step to activate."
      preview={`${packLabel} · ${amountDisplay}`}
    >
      <EmailParagraph>
        Hi {purchaserName}, your code is reserved{recipientName ? ` for ${recipientName}` : ''}. It activates as
        soon as Chelsea confirms your payment.
      </EmailParagraph>

      <EmailCard tone="amber">
        <Text style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#9a3412' }}>
          How to pay
        </Text>
        {paymentMethod === 'venmo' ? (
          <Text style={{ margin: '6px 0 0', color: '#7c2d12', fontSize: '14px', lineHeight: 1.6 }}>
            Send <strong>{amountDisplay}</strong> to <strong>{venmoHandle}</strong> on Venmo. In the
            note, include your name and the word &ldquo;gift.&rdquo;
          </Text>
        ) : (
          <Text style={{ margin: '6px 0 0', color: '#7c2d12', fontSize: '14px', lineHeight: 1.6 }}>
            Bring <strong>{amountDisplay}</strong> in cash to the studio (295 Montauk Hwy, Speonk).
            Hand it to Chelsea and the code activates immediately.
          </Text>
        )}
      </EmailCard>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700 }}>
          {packLabel}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          {amountDisplay}
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
        <Text style={{ margin: '8px 0 0', fontSize: '12px', color: EMAIL_BRAND.muted, textAlign: 'center' as const }}>
          Status: <strong>pending payment</strong>
        </Text>
      </EmailCard>

      {deliveryMode === 'email' && recipientName ? (
        <EmailParagraph>
          Once payment clears we&rsquo;ll email the code directly to {recipientName}.
        </EmailParagraph>
      ) : (
        <>
          <EmailParagraph>After your payment is confirmed the recipient redeems at:</EmailParagraph>
          <Text style={{ color: EMAIL_BRAND.gold, fontSize: '14px', wordBreak: 'break-all' as const, margin: '0 0 8px' }}>
            {redemptionUrl}
          </Text>
        </>
      )}
    </EmailLayout>
  );
}
