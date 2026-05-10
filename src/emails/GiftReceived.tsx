import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  recipientName: string;
  senderName: string;
  senderMessage: string | null;
  packLabel: string;
  code: string;
  redemptionUrl: string;
}

export function GiftReceived({ recipientName, senderName, senderMessage, packLabel, code, redemptionUrl }: Props) {
  return (
    <EmailLayout
      kicker={`From ${senderName}`}
      heading={`A gift for you, ${recipientName}.`}
      preview={`${senderName} sent you a Maningo Method gift`}
    >
      <EmailParagraph>
        {senderName} sent you a Maningo Method gift — {packLabel.toLowerCase()}.
      </EmailParagraph>

      {senderMessage && (
        <div
          style={{
            borderLeft: `3px solid ${EMAIL_BRAND.gold}`,
            padding: '10px 16px',
            margin: '14px 0',
            backgroundColor: EMAIL_BRAND.cream,
          }}
        >
          <Text style={{ margin: 0, color: EMAIL_BRAND.graphite, fontStyle: 'italic' as const, fontSize: '15px', lineHeight: 1.6 }}>
            &ldquo;{senderMessage}&rdquo;
          </Text>
          <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '12px' }}>
            — {senderName}
          </Text>
        </div>
      )}

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700 }}>
          {packLabel}
        </Text>
      </EmailCard>

      <EmailCard>
        <Text style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.22em', color: EMAIL_BRAND.muted, textAlign: 'center' as const }}>
          Your gift code
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

      <div style={{ textAlign: 'center' as const, margin: '20px 0 8px' }}>
        <EmailButton href={redemptionUrl}>Redeem your gift</EmailButton>
      </div>

      <Text style={{ color: EMAIL_BRAND.muted, fontSize: '13px', margin: '12px 0 0' }}>
        Or visit{' '}
        <span style={{ color: EMAIL_BRAND.gold }}>{redemptionUrl}</span> and enter your code. You&rsquo;ll
        create a free account (or log in) and credits land instantly.
      </Text>
    </EmailLayout>
  );
}
