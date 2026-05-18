// Variable resolution for the admin bulk-email feature. Mustache-lite:
// `{{key}}` is replaced with the per-member context value; unknown keys
// resolve to an empty string so a typo doesn't crash the send. Newlines
// in the template body are preserved verbatim and rendered with
// whiteSpace: 'pre-wrap' in the React Email component.

export interface MemberContext {
  first_name: string;
  full_name: string;
  email: string;
  credits: number;
  gift_balance_dollars: string;
  last_attended_date: string | null;
  weeks_since_last_attended: number | null;
  schedule_url: string;
  waiver_url: string;
  packs_url: string;
  redeem_url: string;
  studio_name: string;
  studio_address: string;
}

export function renderTemplate(template: string, ctx: MemberContext): string {
  return template.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_, key: string) => {
    const value = (ctx as unknown as Record<string, unknown>)[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

export function buildMemberContext(args: {
  first_name: string;
  full_name: string;
  email: string;
  credits: number;
  gift_balance_cents: number;
  last_attended_at: string | null;
  site_url: string;
}): MemberContext {
  const { first_name, full_name, email, credits, gift_balance_cents, last_attended_at, site_url } = args;

  let last_attended_date: string | null = null;
  let weeks_since_last_attended: number | null = null;
  if (last_attended_at) {
    const d = new Date(last_attended_at);
    if (!isNaN(d.getTime())) {
      last_attended_date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const diffMs = Date.now() - d.getTime();
      weeks_since_last_attended = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
    }
  }

  return {
    first_name,
    full_name,
    email,
    credits,
    gift_balance_dollars: `$${(gift_balance_cents / 100).toFixed(2)}`,
    last_attended_date,
    weeks_since_last_attended,
    schedule_url: `${site_url}/schedule`,
    waiver_url: `${site_url}/waiver/sign`,
    packs_url: `${site_url}/dashboard`,
    redeem_url: `${site_url}/redeem`,
    studio_name: 'Maningo Method',
    studio_address: '295 Montauk Hwy, Suite 7, Speonk, NY',
  };
}

export const TEMPLATE_VARIABLES: ReadonlyArray<{ key: keyof MemberContext; description: string }> = [
  { key: 'first_name', description: 'Member first name' },
  { key: 'full_name', description: 'Member full name' },
  { key: 'credits', description: 'Current credit balance' },
  { key: 'gift_balance_dollars', description: 'Gift balance, e.g. $25.00' },
  { key: 'last_attended_date', description: 'e.g. "Apr 7, 2026" or empty' },
  { key: 'weeks_since_last_attended', description: 'Whole weeks since last class' },
  { key: 'schedule_url', description: 'Link to public schedule' },
  { key: 'waiver_url', description: 'Link to sign the waiver' },
  { key: 'packs_url', description: 'Link to dashboard / buy packs' },
  { key: 'redeem_url', description: 'Link to redeem a gift code' },
];
