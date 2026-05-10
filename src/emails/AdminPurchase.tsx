import { Text } from '@react-email/components';
import { EmailLayout, EmailCard, EmailButton, EmailParagraph, EMAIL_BRAND, EMAIL_SITE } from './components/EmailLayout';

export type AdminPurchaseChannel = 'card' | 'cash' | 'venmo' | 'gift';

interface Props {
  buyerName: string;
  buyerEmail: string;
  packLabel: string;
  credits: number;
  amount: string;
  channel: AdminPurchaseChannel;
  /** Optional gift code if the purchase was a gift. */
  giftCode?: string;
  /** Optional gift recipient details for gifted purchases. */
  recipientName?: string | null;
  recipientEmail?: string | null;
  reference?: string;
}

const CHANNEL_LABEL: Record<AdminPurchaseChannel, string> = {
  card: 'Card (Stripe)',
  cash: 'Cash',
  venmo: 'Venmo',
  gift: 'Gift card',
};

export function AdminPurchase({
  buyerName,
  buyerEmail,
  packLabel,
  credits,
  amount,
  channel,
  giftCode,
  recipientName,
  recipientEmail,
  reference,
}: Props) {
  return (
    <EmailLayout
      kicker="New sale"
      heading={`${amount} just landed.`}
      preview={`${packLabel} · ${buyerName} · ${CHANNEL_LABEL[channel]}`}
    >
      <EmailParagraph>
        A {CHANNEL_LABEL[channel].toLowerCase()} purchase just completed on Maningo Method.
      </EmailParagraph>

      <EmailCard tone="gold">
        <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700 }}>
          {amount}
        </Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '14px' }}>
          {packLabel} &middot; {credits} credit{credits === 1 ? '' : 's'}
        </Text>
      </EmailCard>

      <EmailCard>
        <Text style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{buyerName}</Text>
        <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>{buyerEmail}</Text>

        <div style={{ borderTop: `1px solid ${EMAIL_BRAND.border}`, margin: '12px 0' }} />
        <Text style={{ margin: 0, color: EMAIL_BRAND.muted, fontSize: '13px' }}>
          <strong style={{ color: EMAIL_BRAND.ink }}>Method:</strong> {CHANNEL_LABEL[channel]}
        </Text>
        {giftCode && (
          <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
            <strong style={{ color: EMAIL_BRAND.ink }}>Gift code:</strong>{' '}
            <span style={{ fontFamily: 'Georgia, serif', color: EMAIL_BRAND.gold }}>{giftCode}</span>
          </Text>
        )}
        {recipientName && (
          <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '13px' }}>
            <strong style={{ color: EMAIL_BRAND.ink }}>Recipient:</strong> {recipientName}
            {recipientEmail ? ` <${recipientEmail}>` : ''}
          </Text>
        )}
        {reference && (
          <Text style={{ margin: '4px 0 0', color: EMAIL_BRAND.muted, fontSize: '11px' }}>
            Ref: {reference}
          </Text>
        )}
      </EmailCard>

      <div style={{ textAlign: 'center' as const, margin: '20px 0 6px' }}>
        <EmailButton href={`${EMAIL_SITE}/admin/sales`}>Open sales dashboard</EmailButton>
      </div>
    </EmailLayout>
  );
}
