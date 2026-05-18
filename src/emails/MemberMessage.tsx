import { Text, Hr } from '@react-email/components';
import { EmailLayout, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  /** Pre-resolved subject (variables already substituted). Used only for preview text. */
  subject: string;
  /** Pre-resolved body (variables already substituted, newlines preserved). */
  body: string;
}

export function MemberMessage({ subject, body }: Props) {
  return (
    <EmailLayout kicker="From Chelsea" heading={subject || 'A note from the studio'} preview={subject}>
      <Text
        style={{
          color: EMAIL_BRAND.ink,
          fontSize: '15px',
          lineHeight: 1.7,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {body}
      </Text>
      <Hr style={{ borderColor: EMAIL_BRAND.border, margin: '24px 0 12px' }} />
      <Text style={{ fontSize: '12px', color: EMAIL_BRAND.muted, margin: 0 }}>
        You&rsquo;re receiving this because you have an account at Maningo Method. Just reply to
        chat with Chelsea.
      </Text>
    </EmailLayout>
  );
}
