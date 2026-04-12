-- Migration 005: processed_stripe_events table
-- Implements: Webhook idempotency (REV-005)

CREATE TABLE public.processed_stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS — only accessed via service_role in webhook handler
