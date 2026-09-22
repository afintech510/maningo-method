import { ManualCheckoutClient } from './client';
import { arePurchasesEnabled } from '@/lib/purchases';
import { PurchasesClosedNotice } from '@/components/marketing/PurchasesClosedNotice';

export default async function ManualCheckoutPage() {
  // The cash path mints credits the moment it's submitted, so it closes with
  // everything else. Gated here because members still reach this URL directly.
  if (!(await arePurchasesEnabled())) {
    return <PurchasesClosedNotice variant="page" />;
  }

  return <ManualCheckoutClient />;
}
