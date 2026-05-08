import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface Props {
  referrerName: string;
  friendName: string | null;
  newBalance: number;
}

export function ReferralRewardEarned({ referrerName, friendName, newBalance }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>You earned a free class</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {referrerName}, {friendName || 'one of your referrals'} just bought a class pack &mdash;
            you&rsquo;ve earned <strong>+1 class credit</strong> on us. Thank you for spreading the word.
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold' }}>Your new balance: {newBalance} {newBalance === 1 ? 'credit' : 'credits'}</Text>
          <Text style={{ color: '#6b6b6b' }}>
            Pop over to your dashboard to book a class.
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>&mdash; Maningo Method</Text>
        </Container>
      </Body>
    </Html>
  );
}
