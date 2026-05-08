// Single source of truth for the 3% service fee applied to Stripe-routed
// purchases. Off-platform payments (Cash / Zelle / Venmo) do not incur this
// fee and call sites must not invoke withServiceFee for them.

export const SERVICE_FEE_BPS = 300; // basis points = 3%

export function computeServiceFeeCents(baseCents: number): number {
  if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
  return Math.round((baseCents * SERVICE_FEE_BPS) / 10000);
}

export function withServiceFee(baseCents: number): {
  base_cents: number;
  fee_cents: number;
  total_cents: number;
} {
  const fee = computeServiceFeeCents(baseCents);
  return { base_cents: baseCents, fee_cents: fee, total_cents: baseCents + fee };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
