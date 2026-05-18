import { describe, it, expect } from 'vitest';
import { renderTemplate, buildMemberContext } from '@/lib/member-email';

const baseCtx = buildMemberContext({
  first_name: 'Alex',
  full_name: 'Alex Tester',
  email: 'alex@example.com',
  credits: 5,
  gift_balance_cents: 1250,
  last_attended_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  site_url: 'https://example.com',
});

describe('renderTemplate', () => {
  it('substitutes a single variable', () => {
    expect(renderTemplate('Hi {{first_name}}!', baseCtx)).toBe('Hi Alex!');
  });

  it('substitutes multiple variables in one pass', () => {
    expect(
      renderTemplate('{{first_name}} has {{credits}} credit(s).', baseCtx)
    ).toBe('Alex has 5 credit(s).');
  });

  it('preserves newlines', () => {
    expect(renderTemplate('Line 1\n\nLine 2 {{first_name}}', baseCtx)).toBe(
      'Line 1\n\nLine 2 Alex'
    );
  });

  it('renders unknown keys as empty string (no crash)', () => {
    expect(renderTemplate('Greetings {{not_a_key}} from us', baseCtx)).toBe(
      'Greetings  from us'
    );
  });

  it('tolerates whitespace inside the braces', () => {
    expect(renderTemplate('Hello {{ first_name }}.', baseCtx)).toBe('Hello Alex.');
  });

  it('renders weeks_since_last_attended for a 3-week-old visit', () => {
    expect(
      renderTemplate("It's been {{weeks_since_last_attended}} weeks.", baseCtx)
    ).toBe("It's been 3 weeks.");
  });

  it('renders gift_balance_dollars as formatted USD', () => {
    expect(renderTemplate('Balance: {{gift_balance_dollars}}', baseCtx)).toBe(
      'Balance: $12.50'
    );
  });

  it('substitutes URL variables to the configured site_url', () => {
    expect(renderTemplate('Sign here: {{waiver_url}}', baseCtx)).toBe(
      'Sign here: https://example.com/waiver/sign'
    );
  });
});

describe('buildMemberContext', () => {
  it('handles a never-attended member', () => {
    const ctx = buildMemberContext({
      first_name: 'New',
      full_name: 'New Member',
      email: 'new@example.com',
      credits: 0,
      gift_balance_cents: 0,
      last_attended_at: null,
      site_url: 'https://example.com',
    });
    expect(ctx.last_attended_date).toBeNull();
    expect(ctx.weeks_since_last_attended).toBeNull();
    // Unknown variable renders to empty string in templates.
    expect(renderTemplate('{{weeks_since_last_attended}} weeks', ctx)).toBe(' weeks');
  });
});
