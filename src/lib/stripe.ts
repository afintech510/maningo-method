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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', studentId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripe();
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
