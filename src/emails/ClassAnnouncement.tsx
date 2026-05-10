import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  subject: string;
  message: string;
}

export function ClassAnnouncement({ studentName, classTitle, classDate, classTime, subject, message }: Props) {
  return (
    <EmailLayout kicker="Studio update" heading={subject} preview={message.slice(0, 120)}>
      <EmailParagraph>Hi {studentName},</EmailParagraph>
      <Text
        style={{
          color: EMAIL_BRAND.ink,
          fontSize: '15px',
          lineHeight: 1.7,
          margin: '0 0 18px',
          whiteSpace: 'pre-wrap' as const,
        }}
      >
        {message}
      </Text>

      <EmailCard>
        <Text style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: EMAIL_BRAND.muted }}>
          About this class
        </Text>
        <Text style={{ margin: '6px 0 0', fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: 700 }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          {classDate} at {classTime}
        </Text>
      </EmailCard>

      <Text style={{ fontSize: '13px', color: EMAIL_BRAND.muted, margin: '20px 0 0' }}>
        — Chelsea, Maningo Method
      </Text>
    </EmailLayout>
  );
}
