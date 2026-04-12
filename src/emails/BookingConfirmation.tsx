import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface BookingConfirmationProps {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  duration: number;
}

export function BookingConfirmation({
  studentName,
  classTitle,
  classDate,
  classTime,
  duration,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>
            You&apos;re Booked!
          </Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {studentName}, your spot is confirmed.
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold', fontSize: '18px' }}>{classTitle}</Text>
          <Text style={{ color: '#6b6b6b' }}>
            {classDate} at {classTime} ({duration} min)
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold' }}>Studio Location</Text>
          <Text style={{ color: '#6b6b6b' }}>
            295 Montauk Highway, Suite 7, Speonk, NY 11972
          </Text>
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>
            — Maningo Method
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
