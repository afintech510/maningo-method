import { LocationPage, locationMetadata } from '@/components/seo/LocationPage';
import { LOCATIONS } from '@/lib/locations';

const location = LOCATIONS['east-quogue'];

export const metadata = locationMetadata(location);

export default function Page() {
  return <LocationPage location={location} />;
}
