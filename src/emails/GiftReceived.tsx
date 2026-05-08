import { Html, Head, Body, Container, Heading, Text, Hr, Section, Button } from '@react-email/components';

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
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>You got a gift, {recipientName}</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            {senderName} just sent you a Maningo Method gift &mdash; {packLabel.toLowerCase()}.
          </Text>
          {senderMessage && (
            <Section style={{ backgroundColor: '#ffffff', borderLeft: '3px solid #c9a96e', padding: '12px 16px', margin: '16px 0' }}>
              <Text style={{ color: '#2d2d2d', fontStyle: 'italic' as const, margin: 0 }}>&ldquo;{senderMessage}&rdquo;</Text>
              <Text style={{ color: '#6b6b6b', fontSize: '12px', margin: '6px 0 0' }}>&mdash; {senderName}</Text>
            </Section>
          )}
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold' }}>{packLabel}</Text>
          <Section style={{ backgroundColor: '#ffffff', border: '1px solid #e5e2dc', padding: '20px', borderRadius: '12px', textAlign: 'center' as const, margin: '20px 0' }}>
            <Text style={{ fontSize: '12px', color: '#6b6b6b', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Your Gift Code</Text>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#c9a96e', letterSpacing: '2px', margin: '0' }}>{code}</Text>
          </Section>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={redemptionUrl} style={{ backgroundColor: '#c9a96e', color: '#ffffff', padding: '12px 24px', borderRadius: '999px', fontWeight: 'bold', textDecoration: 'none' }}>Redeem Your Gift</Button>
          </Section>
          <Text style={{ color: '#6b6b6b', fontSize: '14px' }}>
            Or visit <span style={{ color: '#c9a96e' }}>{redemptionUrl}</span> and enter your code. You&rsquo;ll need to create a free account or log in.
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>&mdash; Maningo Method</Text>
        </Container>
      </Body>
    </Html>
  );
}
