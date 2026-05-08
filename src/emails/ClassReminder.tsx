import { Html, Head, Body, Container, Heading, Text, Hr, Section, Button } from '@react-email/components';

interface Props {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  hoursUntil: number;
  googleCalUrl?: string;
  icsUrl?: string;
}

export function ClassReminder({
  studentName,
  classTitle,
  classDate,
  classTime,
  hoursUntil,
  googleCalUrl,
  icsUrl,
}: Props) {
  const headline =
    hoursUntil <= 3
      ? `See you in a couple hours, ${studentName}`
      : `Class tomorrow, ${studentName}`;

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '22px', color: '#1a1a1a' }}>{headline}</Heading>
          <Text style={{ color: '#1a1a1a' }}>Just a heads-up about your booking.</Text>

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
            <Text style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>{classTitle}</Text>
            <Text style={{ color: '#6b6b6b', margin: '6px 0 0' }}>
              {classDate} at {classTime}
            </Text>
            <Text style={{ color: '#6b6b6b', margin: '6px 0 0', fontSize: '13px' }}>
              Maningo Method &middot; 295 Montauk Hwy, Suite 7, Speonk, NY
            </Text>
          </Section>

          {(googleCalUrl || icsUrl) && (
            <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
              <table role="presentation" cellSpacing={0} cellPadding={0} style={{ margin: '0 auto' }}>
                <tbody>
                  <tr>
                    {googleCalUrl && (
                      <td style={{ padding: '0 6px' }}>
                        <Button
                          href={googleCalUrl}
                          style={{
                            backgroundColor: '#c9a96e',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '999px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            fontSize: '13px',
                          }}
                        >
                          Add to Google
                        </Button>
                      </td>
                    )}
                    {icsUrl && (
                      <td style={{ padding: '0 6px' }}>
                        <Button
                          href={icsUrl}
                          style={{
                            backgroundColor: '#2d2d2d',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '999px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            fontSize: '13px',
                          }}
                        >
                          Apple / Outlook
                        </Button>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </Section>
          )}

          <Text style={{ color: '#6b6b6b', fontSize: '14px' }}>
            Bring a mat and a small towel. Wear grippy socks or be barefoot. Cancel up to 12 hours
            before class start for a full credit refund.
          </Text>

          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>&mdash; Maningo Method</Text>
        </Container>
      </Body>
    </Html>
  );
}
