import { HomeClient } from './home-client';
import { getPurchaseAvailability } from '@/lib/purchases';

// Thin server wrapper so the homepage can read what's currently for sale; all
// the markup lives in home-client.tsx, which needs hooks. Changes made in the
// admin show up here within getStudioSettings' 30s cache TTL — no redeploy,
// and no NEXT_PUBLIC_* rebuild.
export default async function Home() {
  const { sellablePacks, giftsEnabled } = await getPurchaseAvailability();
  return <HomeClient sellablePacks={sellablePacks} giftsEnabled={giftsEnabled} />;
}
