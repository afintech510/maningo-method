import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components';
import type { ReactNode } from 'react';

interface Props {
  /** Pre-heading kicker, e.g. "Booking confirmed". */
  kicker?: string;
  /** Main heading text. */
  heading: string;
  /** Body content — sections, cards, etc. */
  children: ReactNode;
  /** Optional preview text shown in the email client's inbox list. */
  preview?: string;
}

const BRAND = {
  cream: '#faf9f6',
  ink: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#e5e2dc',
  gold: '#c9a96e',
  goldDark: '#8c7647',
  graphite: '#2d2d2d',
  white: '#ffffff',
};

const SITE = 'https://www.maningomethod.com';

/**
 * Shared chrome (header + footer + brand colors + serif accents) for every
 * transactional email. Body is whatever the template wants — usually a
 * combination of <EmailCard>, <EmailButton>, and <EmailRow>.
 */
export function EmailLayout({ kicker, heading, children, preview }: Props) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light only" />
      </Head>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: BRAND.cream,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: BRAND.ink,
        }}
      >
        {preview && (
          <div style={{ display: 'none', overflow: 'hidden', lineHeight: 1, opacity: 0, maxHeight: 0, maxWidth: 0 }}>
            {preview}
          </div>
        )}

        <Container
          style={{
            maxWidth: '600px',
            width: '100%',
            margin: '0 auto',
            padding: '0 0 32px',
          }}
        >
          {/* Header */}
          <Section
            style={{
              padding: '32px 24px 8px',
              textAlign: 'center' as const,
            }}
          >
            <Text
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '22px',
                fontWeight: 700,
                color: BRAND.ink,
                margin: 0,
                letterSpacing: '0.02em',
              }}
            >
              Maningo Method
            </Text>
            <div
              style={{
                width: '40px',
                height: '2px',
                margin: '10px auto 0',
                backgroundColor: BRAND.gold,
              }}
            />
          </Section>

          {/* Body card */}
          <Section
            style={{
              backgroundColor: BRAND.white,
              border: `1px solid ${BRAND.border}`,
              borderRadius: '16px',
              padding: '32px 28px',
              margin: '20px 16px 0',
            }}
          >
            {kicker && (
              <Text
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase' as const,
                  color: BRAND.gold,
                  margin: 0,
                }}
              >
                {kicker}
              </Text>
            )}
            <Text
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '26px',
                fontWeight: 700,
                color: BRAND.ink,
                lineHeight: 1.2,
                margin: kicker ? '8px 0 0' : 0,
              }}
            >
              {heading}
            </Text>

            <div style={{ height: '20px' }} />
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ padding: '24px 24px 0', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '12px', color: BRAND.muted, margin: 0 }}>
              <Link href={SITE} style={{ color: BRAND.muted, textDecoration: 'none' }}>
                maningomethod.com
              </Link>
              {' · '}
              <Link href="mailto:chelsea@maningomethod.com" style={{ color: BRAND.muted, textDecoration: 'none' }}>
                chelsea@maningomethod.com
              </Link>
            </Text>
            <Text style={{ fontSize: '12px', color: BRAND.muted, margin: '6px 0 0' }}>
              295 Montauk Hwy, Suite 7, Speonk, NY
            </Text>
            <Hr style={{ borderColor: BRAND.border, margin: '16px 24px 0' }} />
            <Text style={{ fontSize: '11px', color: BRAND.muted, margin: '12px 0 0' }}>
              You&rsquo;re receiving this because of activity on your Maningo Method account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Cream-tinted info card used for amount summaries, codes, etc. */
export function EmailCard({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gold' | 'amber';
}) {
  const bg = tone === 'gold' ? '#fbf6ec' : tone === 'amber' ? '#fff7ed' : BRAND.cream;
  const border = tone === 'gold' ? '#e7d4a8' : tone === 'amber' ? '#fdba74' : BRAND.border;
  return (
    <Section
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: '12px',
        padding: '18px 20px',
        margin: '12px 0',
      }}
    >
      {children}
    </Section>
  );
}

/** Big gold pill CTA. */
export function EmailButton({
  href,
  children,
  tone = 'gold',
}: {
  href: string;
  children: ReactNode;
  tone?: 'gold' | 'dark';
}) {
  const bg = tone === 'gold' ? BRAND.gold : BRAND.graphite;
  return (
    <Link
      href={href}
      style={{
        display: 'inline-block',
        backgroundColor: bg,
        color: BRAND.white,
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 600,
        padding: '12px 22px',
        borderRadius: '999px',
        margin: '4px',
      }}
    >
      {children}
    </Link>
  );
}

/** Label / value pair on a row, used inside cards. */
export function EmailKeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Text style={{ margin: '4px 0', color: BRAND.muted, fontSize: '13px' }}>
      <strong style={{ color: BRAND.ink, fontWeight: 600 }}>{label}:</strong> {value}
    </Text>
  );
}

/** Standard body paragraph. */
export function EmailParagraph({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: BRAND.ink,
        fontSize: '15px',
        lineHeight: 1.6,
        margin: '0 0 14px',
      }}
    >
      {children}
    </Text>
  );
}

export const EMAIL_BRAND = BRAND;
export const EMAIL_SITE = SITE;
