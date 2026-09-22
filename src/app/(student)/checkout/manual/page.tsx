import { ManualCheckoutClient } from './client';
import { isPackSellable } from '@/lib/purchases';
import { PurchasesClosedNotice } from '@/components/marketing/PurchasesClosedNotice';

export default async function ManualCheckoutPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // The cash path mints credits the moment it's submitted, so it's gated per
  // pack like the card path. Gated here because members reach this URL direct.
  const raw = searchParams.pack;
  const pack = (Array.isArray(raw) ? raw[0] : raw) ?? '5pack';

  if (!(await isPackSellable(pack))) {
    return <PurchasesClosedNotice variant="page" />;
  }

  return <ManualCheckoutClient />;
}
