import { Html, Head, Body, Container, Heading, Text, Hr, Section } from '@react-email/components';

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
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>Gift code created — payment pending</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {purchaserName}, here&rsquo;s your Maningo Method gift code
            {recipientName ? ` for ${recipientName}` : ''}. The code activates as soon as Chelsea
            confirms your payment.
          </Text>

          <Section
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fdba74',
              padding: '16px',
              borderRadius: '12px',
              margin: '20px 0',
            }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: '14px', margin: 0, color: '#9a3412' }}>
              How to pay
            </Text>
            {paymentMethod === 'venmo' ? (
              <Text style={{ color: '#7c2d12', margin: '6px 0 0', fontSize: '14px' }}>
                Send <strong>{amountDisplay}</strong> to <strong>{venmoHandle}</strong> on Venmo. In
                the note, include your name and the word &ldquo;gift.&rdquo;
              </Text>
            ) : (
              <Text style={{ color: '#7c2d12', margin: '6px 0 0', fontSize: '14px' }}>
                Bring <strong>{amountDisplay}</strong> in cash to the studio (295 Montauk Hwy,
                Speonk). Hand it to Chelsea and the code activates immediately.
              </Text>
            )}
          </Section>

          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold', fontSize: '18px' }}>
            {packLabel} &mdash; {amountDisplay}
          </Text>
          <Section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e2dc',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center' as const,
              margin: '20px 0',
            }}
          >
            <Text
              style={{
                fontSize: '12px',
                color: '#6b6b6b',
                margin: '0 0 8px',
                textTransform: 'uppercase' as const,
                letterSpacing: '2px',
              }}
            >
              Gift Code
            </Text>
            <Text
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#c9a96e',
                letterSpacing: '2px',
                margin: '0',
              }}
            >
              {code}
            </Text>
            <Text style={{ fontSize: '12px', color: '#6b6b6b', margin: '8px 0 0' }}>
              Status: <strong>pending payment</strong>
            </Text>
          </Section>

          {deliveryMode === 'email' && recipientName ? (
            <Text style={{ color: '#6b6b6b' }}>
              Once payment clears, we&rsquo;ll email the code directly to {recipientName}.
            </Text>
          ) : (
            <>
              <Text style={{ color: '#6b6b6b' }}>
                After your payment is confirmed the recipient can redeem at:
              </Text>
              <Text style={{ color: '#c9a96e', wordBreak: 'break-all' as const }}>{redemptionUrl}</Text>
            </>
          )}

          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>&mdash; Maningo Method</Text>
        </Container>
      </Body>
    </Html>
  );
}
