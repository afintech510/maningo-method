// Read at module-load so server and client agree per-build.
// NEXT_PUBLIC_STRIPE_ENABLED=false hides every card-checkout surface;
// users see only Cash/Venmo flows. Default: enabled.

/** Parsed independently so tests can exercise it without re-importing the module. */
export function parseStripeEnabled(raw: string | undefined): boolean {
  return (raw ?? 'true').toLowerCase() !== 'false';
}

export const STRIPE_ENABLED = parseStripeEnabled(process.env.NEXT_PUBLIC_STRIPE_ENABLED);
