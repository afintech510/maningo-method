import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  studentName: string;
  classTitle: string;
  classDate: string;
  classTime: string;
}

export function ClassCancellation({ studentName, classTitle, classDate, classTime }: Props) {
  return (
    <EmailLayout kicker="Class cancelled" heading="We had to cancel this one." preview={`${classTitle} · ${classDate}`}>
      <EmailParagraph>
        Hi {studentName} — apologies, the class below was cancelled by the studio. Your credit is back
        on your account, no action needed.
      </EmailParagraph>

      <EmailCard>
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700 }}>
          {classTitle}
        </Text>
        <Text style={{ margin: '6px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          {classDate} at {classTime}
        </Text>
      </EmailCard>

      <EmailParagraph>
        Take a look at the schedule for another time that fits — I&rsquo;d love to see you on the mat.
      </EmailParagraph>
    </EmailLayout>
  );
}
