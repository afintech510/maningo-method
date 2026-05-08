import { Html, Head, Body, Container, Heading, Text, Hr, Section } from '@react-email/components';

interface Props {
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  packLabel: string;
  amount: string;
  method: 'cash' | 'zelle' | 'venmo';
  paymentId: string;
}

const METHOD_LABEL: Record<Props['method'], string> = {
  cash: 'Cash (at first class)',
  zelle: 'Zelle',
  venmo: 'Venmo (direct)',
};

export function ManualPaymentSubmitted({
  studentName,
  studentEmail,
  studentPhone,
  packLabel,
  amount,
  method,
  paymentId,
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '22px', color: '#1a1a1a' }}>New manual payment request</Heading>
          <Text style={{ color: '#1a1a1a' }}>
            A student just submitted a {METHOD_LABEL[method]} payment request. Look out for the transfer
            (or cash at the studio), then mark it paid in admin to apply credits.
          </Text>

          <Hr style={{ borderColor: '#e5e2dc' }} />

          <Section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e2dc',
              borderRadius: '12px',
              padding: '18px',
              margin: '12px 0',
            }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>{studentName}</Text>
            <Text style={{ color: '#6b6b6b', margin: '4px 0 0', fontSize: '13px' }}>{studentEmail}</Text>
            {studentPhone && (
              <Text style={{ color: '#6b6b6b', margin: '2px 0 0', fontSize: '13px' }}>{studentPhone}</Text>
            )}

            <Hr style={{ borderColor: '#e5e2dc', margin: '14px 0' }} />

            <Text style={{ margin: 0 }}>
              <strong>{packLabel}</strong> &middot; {amount}
            </Text>
            <Text style={{ color: '#6b6b6b', margin: '4px 0 0', fontSize: '13px' }}>
              Method: {METHOD_LABEL[method]}
            </Text>
            <Text style={{ color: '#6b6b6b', margin: '2px 0 0', fontSize: '11px' }}>
              Ref: {paymentId}
            </Text>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
            <a
              href="https://www.maningomethod.com/admin/manual-payments"
              style={{
                backgroundColor: '#c9a96e',
                color: '#ffffff',
                padding: '12px 22px',
                borderRadius: '999px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Mark paid in admin
            </a>
          </Section>

          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>
            &mdash; Maningo Method
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
