import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    });
  }
  return stripeInstance;
}

export async function getOrCreateStripeCustomer(
  studentId: string,
  email: string
): Promise<string> {
  const supabase = createAdminClient();
  const stripe = getStripe();

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', studentId)
    .single();

  // Reuse the stored customer only if it still exists in the *current* Stripe
  // mode. After the test→live cutover, profiles can carry a test-mode `cus_`
  // id that live Stripe rejects with "No such customer". Verify and self-heal
  // by minting a fresh customer when the stored one is missing or deleted.
  if (profile?.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(profile.stripe_customer_id);
      // A live customer has no `deleted` flag; a DeletedCustomer has deleted=true.
      if (!('deleted' in existing)) {
        return existing.id;
      }
    } catch (err) {
      // resource_missing = stale id from another Stripe mode. Any other error
      // (network, auth) should bubble up rather than silently recreate.
      const code = (err as { code?: string })?.code;
      if (code !== 'resource_missing') {
        throw err;
      }
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { student_id: studentId },
  });

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', studentId);

  return customer.id;
}
