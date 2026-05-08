import { Html, Head, Body, Container, Heading, Text, Hr, Section } from '@react-email/components';

interface Props {
  purchaserName: string;
  recipientName: string | null;
  packLabel: string;
  amountDisplay: string;
  code: string;
  redemptionUrl: string;
  deliveryMode: 'email' | 'share';
}

export function GiftPurchaseConfirmation({
  purchaserName,
  recipientName,
  packLabel,
  amountDisplay,
  code,
  redemptionUrl,
  deliveryMode,
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>Your gift is ready</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {purchaserName}, thanks for gifting Maningo Method
            {recipientName ? ` to ${recipientName}` : ''}.
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold', fontSize: '18px' }}>{packLabel} &mdash; {amountDisplay}</Text>
          <Section style={{ backgroundColor: '#ffffff', border: '1px solid #e5e2dc', padding: '20px', borderRadius: '12px', textAlign: 'center' as const, margin: '20px 0' }}>
            <Text style={{ fontSize: '12px', color: '#6b6b6b', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Gift Code</Text>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#c9a96e', letterSpacing: '2px', margin: '0' }}>{code}</Text>
          </Section>
          {deliveryMode === 'email' && recipientName ? (
            <Text style={{ color: '#6b6b6b' }}>
              We sent the code directly to {recipientName} so they can redeem it. Keep this email for your records.
            </Text>
          ) : (
            <>
              <Text style={{ color: '#6b6b6b' }}>
                Share this code with the recipient however you like &mdash; text, card, in person. They can redeem it at:
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
