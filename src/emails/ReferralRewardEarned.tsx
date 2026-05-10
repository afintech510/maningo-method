import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND, EMAIL_SITE } from './components/EmailLayout';

interface Props {
  referrerName: string;
  friendName: string | null;
  newBalance: number;
}

export function ReferralRewardEarned({ referrerName, friendName, newBalance }: Props) {
  return (
    <EmailLayout
      kicker="Referral reward"
      heading="You earned a free class."
      preview={`+1 credit · new balance ${newBalance}`}
    >
      <EmailParagraph>
        Hi {referrerName}, {friendName || 'one of your referrals'} just bought a class pack —
        you&rsquo;ve earned <strong>+1 class credit</strong> on us. Thank you for spreading the word.
      </EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, color: EMAIL_BRAND.muted, fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.18em' }}>
          Your balance
        </Text>
        <Text style={{ margin: '4px 0 0', fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 700 }}>
          {newBalance} credit{newBalance === 1 ? '' : 's'}
        </Text>
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '18px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/schedule`}>Book a class</EmailButton>
      </div>
    </EmailLayout>
  );
}
