// Read at module-load so server and client agree per-build.
// NEXT_PUBLIC_STRIPE_ENABLED=false hides every card-checkout surface;
// users see only Cash/Venmo flows. Default: enabled.
export const STRIPE_ENABLED =
  (process.env.NEXT_PUBLIC_STRIPE_ENABLED ?? 'true').toLowerCase() !== 'false';
