import { Text } from '@react-email/components';
import { EmailLayout, EmailButton, EmailParagraph, EMAIL_BRAND } from './components/EmailLayout';

interface Props {
  firstName: string;
  resetUrl: string;
}

export function PasswordReset({ firstName, resetUrl }: Props) {
  return (
    <EmailLayout
      kicker="Password reset"
      heading="Reset your Maningo Method password."
      preview={`Tap the link to set a new password.`}
    >
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>
        You (or someone with admin access) asked to reset your password. Tap the button below to
        choose a new one. The link is good for one hour.
      </EmailParagraph>

      <EmailButton href={resetUrl}>Set a new password &rarr;</EmailButton>

      <Text style={{ color: EMAIL_BRAND.muted, fontSize: '13px', margin: '12px 0 0' }}>
        If the button doesn&rsquo;t work, paste this URL into your browser:
      </Text>
      <Text style={{ color: EMAIL_BRAND.ink, fontSize: '12px', wordBreak: 'break-all', margin: '4px 0 0' }}>
        {resetUrl}
      </Text>

      <EmailParagraph>
        Didn&rsquo;t ask for this? You can ignore the email &mdash; your current password is
        unchanged. If you keep getting these unexpectedly, reply and we&rsquo;ll help.
      </EmailParagraph>
    </EmailLayout>
  );
}
