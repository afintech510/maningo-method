import { HomeClient } from './home-client';
import { arePurchasesEnabled } from '@/lib/purchases';

// Thin server wrapper so the homepage can read the purchasing switch; all the
// markup lives in home-client.tsx, which needs hooks. Flipping the switch in
// the admin shows up here within getStudioSettings' 30s cache TTL — no
// redeploy, and no NEXT_PUBLIC_* rebuild.
export default async function Home() {
  return <HomeClient purchasesEnabled={await arePurchasesEnabled()} />;
}
