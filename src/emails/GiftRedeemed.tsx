import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface Props {
  purchaserName: string;
  recipientName: string | null;
  packLabel: string;
  redeemerName: string | null;
}

export function GiftRedeemed({ purchaserName, recipientName, packLabel, redeemerName }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>Your gift was redeemed</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {purchaserName} &mdash; {redeemerName || recipientName || 'the recipient'} just redeemed
            their Maningo Method gift ({packLabel}). Hope they have a great class!
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>&mdash; Maningo Method</Text>
        </Container>
      </Body>
    </Html>
  );
}
