import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface CancelledBooking {
  classTitle: string;
  classDate: string;
  classTime: string;
}

interface SubscriptionBookingsCancelledProps {
  studentName: string;
  cancelledBookings: CancelledBooking[];
}

export function SubscriptionBookingsCancelled({
  studentName,
  cancelledBookings,
}: SubscriptionBookingsCancelledProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a' }}>
            Subscription Update
          </Heading>
          <Text style={{ color: '#1a1a1a' }}>
            Hi {studentName}, your subscription has lapsed and the following upcoming bookings have been cancelled:
          </Text>
          <Hr style={{ borderColor: '#e5e2dc' }} />
          {cancelledBookings.map((booking, i) => (
            <Text key={i} style={{ color: '#6b6b6b', marginBottom: '4px' }}>
              {booking.classTitle} — {booking.classDate} at {booking.classTime}
            </Text>
          ))}
          <Hr style={{ borderColor: '#e5e2dc' }} />
          <Text style={{ color: '#1a1a1a' }}>
            Resubscribe to keep booking unlimited classes.
          </Text>
          <Text style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}>
            — Maningo Method
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
