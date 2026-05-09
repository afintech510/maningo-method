import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface ClassAnnouncementProps {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  subject: string;
  message: string;
}

export function ClassAnnouncement({
  studentName,
  classTitle,
  classDate,
  classTime,
  subject,
  message,
}: ClassAnnouncementProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#faf9f6' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '22px', color: '#1a1a1a', marginBottom: '8px' }}>
            {subject}
          </Heading>
          <Text style={{ color: '#1a1a1a', marginTop: 0 }}>
            Hi {studentName},
          </Text>
          <Text
            style={{
              color: '#1a1a1a',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          >
            {message}
          </Text>
          <Hr style={{ borderColor: '#e5e2dc', marginTop: '24px' }} />
          <Text style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '12px' }}>
            About this class:
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: '16px', marginTop: 0, color: '#1a1a1a' }}>
            {classTitle}
          </Text>
          <Text style={{ color: '#6b6b6b', marginTop: 0 }}>
            {classDate} at {classTime}
          </Text>
          <Text style={{ fontSize: '13px', color: '#6b6b6b', marginTop: '24px' }}>
            — Chelsea, Maningo Method
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
