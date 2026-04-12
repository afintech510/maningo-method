import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface BookingCancellationProps {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
}

export function BookingCancellation({
  studentName,
  classTitle,
  classDate,
  classTime,
}: BookingCancellationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>
            Booking Cancelled
          </Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {studentName}, your booking has been cancelled and your spot has been released.
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ fontWeight: 'bold', fontSize: '18px' }}>{classTitle}</Text>
          <Text style={{ color: '#6b6b6b' }}>
            {classDate} at {classTime}
          </Text>
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>
            — Maningo Method
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
