import { fromZonedTime } from 'date-fns-tz';
import { STUDIO_TIMEZONE } from '@/lib/timezone';

// Classes Chelsea teaches with a partner, at the partner's location. They are
// deliberately not rows in `classes`: the partner takes the bookings and the
// payment, and class credits can't be used. The schedule shows them on their
// day with a link out to the partner's booking page, and the homepage banner
// reads the same details. Past events can be deleted from this list.

export interface PartnerEvent {
  id: string;
  title: string;
  /** Studio-local calendar day, "yyyy-MM-dd" — matches the schedule's day keys. */
  day: string;
  /** Start as a UTC instant. */
  startsAt: Date;
  durationMinutes: number;
  partner: string;
  address: string;
  /** One line on price, cap and what to bring. */
  details: string;
  bookingUrl: string;
  mapsUrl: string;
}

function mapsUrl(partner: string, address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${partner}, ${address}`)}`;
}

const OUTCAST_ADDRESS = '333 Main St, Center Moriches, NY 11934';

export const OUTCAST_COLLAB: PartnerEvent = {
  id: 'outcast-2026-11-29',
  title: 'Maningo Method Pilates × Outcast Fitness',
  day: '2026-11-29',
  startsAt: fromZonedTime('2026-11-29T09:30:00', STUDIO_TIMEZONE),
  durationMinutes: 60,
  partner: 'Outcast Fitness',
  address: OUTCAST_ADDRESS,
  details: '$30 · 21 spots · bring your own mat',
  bookingUrl:
    'https://go.mindbodyonline.com/book/app/classes/5756561?date=2026-11-29&mbo_src=links-shortcuts',
  mapsUrl: mapsUrl('Outcast Fitness', OUTCAST_ADDRESS),
};

export const PARTNER_EVENTS: PartnerEvent[] = [OUTCAST_COLLAB];
