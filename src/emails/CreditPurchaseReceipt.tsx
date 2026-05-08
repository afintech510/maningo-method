import { Html, Head, Body, Container, Heading, Text, Hr, Section } from '@react-email/components';

interface Props {
  studentName: string;
  packLabel: string;
  creditsAdded: number;
  amountPaid: string;     // formatted, e.g. "$115.36"
  serviceFee?: string;    // formatted, e.g. "$3.36" (optional)
  newBalance: number;
}

export function CreditPurchaseReceipt({
  studentName,
  packLabel,
  creditsAdded,
  amountPaid,
  serviceFee,
  newBalance,
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>Thanks for your purchase</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {studentName}, your credits are ready to book.
          </Text>

          <Hr style={{ borderColor: '#e5e2dc' }} />

          <Section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e2dc',
              borderRadius: '12px',
              padding: '20px',
              margin: '12px 0',
            }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>{packLabel}</Text>
            <Text style={{ color: '#6b6b6b', margin: '6px 0 0' }}>
              +{creditsAdded} class credit{creditsAdded === 1 ? '' : 's'} added
            </Text>

            <Hr style={{ borderColor: '#e5e2dc', margin: '14px 0' }} />

            {serviceFee && (
              <Text style={{ color: '#6b6b6b', margin: 0, fontSize: '13px' }}>
                Includes 3% service fee: {serviceFee}
              </Text>
            )}
            <Text style={{ fontWeight: 'bold', margin: '4px 0 0' }}>
              Total paid: {amountPaid}
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: '#faf9f6',
              border: '1px solid #e5e2dc',
              borderRadius: '12px',
              padding: '14px 18px',
              margin: '12px 0',
            }}
          >
            <Text style={{ margin: 0, color: '#6b6b6b', fontSize: '13px' }}>Credit balance</Text>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', margin: '2px 0 0' }}>
              {newBalance} credit{newBalance === 1 ? '' : 's'}
            </Text>
          </Section>

          <Text style={{ color: '#6b6b6b', fontSize: '14px' }}>
            Credits never expire. Book a class anytime from your{' '}
            <a href="https://www.maningomethod.com/dashboard" style={{ color: '#c9a96e' }}>
              dashboard
            </a>
            .
          </Text>

          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>
            &mdash; Maningo Method
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
