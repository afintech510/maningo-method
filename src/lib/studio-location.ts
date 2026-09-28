import { fromZonedTime } from 'date-fns-tz';
import { STUDIO_TIMEZONE } from '@/lib/timezone';

// Where classes are held. Every page, email, calendar invite and schema block
// reads the address from here, so the next move is a one-file change.
//
// From October 1, 2026 classes are at U Gotta Dance in East Moriches, in the
// rear building. The venue name is kept out of branding and page headlines,
// but travels with the address everywhere the address is shown, so people
// find the right door.

/** First day of classes in East Moriches, as a UTC instant (studio midnight). */
export const MOVE_DATE = fromZonedTime('2026-10-01T00:00:00', STUDIO_TIMEZONE);

export const STUDIO_VENUE = 'U Gotta Dance';
export const STUDIO_STREET = '533 Montauk Highway';
export const STUDIO_STREET_SHORT = '533 Montauk Hwy';
export const STUDIO_TOWN = 'East Moriches';
export const STUDIO_STATE = 'NY';
export const STUDIO_ZIP = '11940';

/** "533 Montauk Highway, East Moriches, NY 11940" */
export const STUDIO_ADDRESS = `${STUDIO_STREET}, ${STUDIO_TOWN}, ${STUDIO_STATE} ${STUDIO_ZIP}`;
/** "533 Montauk Hwy, East Moriches" — for tight UI and email footers. */
export const STUDIO_ADDRESS_SHORT = `${STUDIO_STREET_SHORT}, ${STUDIO_TOWN}`;
/** "East Moriches, NY" */
export const STUDIO_TOWN_STATE = `${STUDIO_TOWN}, ${STUDIO_STATE}`;

export const STUDIO_ENTRANCE_NOTE = 'Classes in Rear Building';
/** "U Gotta Dance · Classes in Rear Building" — shown alongside the address. */
export const STUDIO_VENUE_LINE = `${STUDIO_VENUE} · ${STUDIO_ENTRANCE_NOTE}`;
/** Venue, entrance and full address on one line. */
export const STUDIO_LOCATION_LINE = `${STUDIO_VENUE_LINE} · ${STUDIO_ADDRESS}`;
/** Venue, entrance and short address on one line. */
export const STUDIO_LOCATION_LINE_SHORT = `${STUDIO_VENUE_LINE} · ${STUDIO_ADDRESS_SHORT}`;

// Geocoded from OpenStreetMap for 533 Montauk Hwy, East Moriches NY 11940.
export const STUDIO_GEO = { latitude: 40.8033, longitude: -72.7648 };

const MAPS_QUERY = encodeURIComponent(STUDIO_ADDRESS);
export const STUDIO_MAPS_URL = `https://maps.google.com/?q=${MAPS_QUERY}`;
export const STUDIO_MAPS_EMBED_URL = `https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`;

// ─── Per-class address across the move ────────────────────────────────────
// Marketing pages show the new studio straight away (the move banner explains
// the date), but anything tied to one specific class — booking and reminder
// emails, calendar invites, class cards — must send people to the room that
// class is actually in. Classes before MOVE_DATE are still at the previous
// studio. Safe to delete this block, and PREVIOUS_*, once October 2026 has
// passed.

const PREVIOUS_ADDRESS = '295 Montauk Highway, Suite 7, Speonk, NY 11972';
const PREVIOUS_ADDRESS_SHORT = '295 Montauk Hwy, Speonk';

function isAtNewStudio(startsAt: string | Date): boolean {
  return new Date(startsAt).getTime() >= MOVE_DATE.getTime();
}

/** Full location (venue, entrance, address) for the class starting at `startsAt`. */
export function classAddress(startsAt: string | Date): string {
  return isAtNewStudio(startsAt) ? STUDIO_LOCATION_LINE : PREVIOUS_ADDRESS;
}

/** Short location (venue, entrance, address) for the class starting at `startsAt`. */
export function classAddressShort(startsAt: string | Date): string {
  return isAtNewStudio(startsAt) ? STUDIO_LOCATION_LINE_SHORT : PREVIOUS_ADDRESS_SHORT;
}

/** Calendar-invite location for the class starting at `startsAt`. */
export function classCalendarLocation(startsAt: string | Date): string {
  return `Maningo Method · ${classAddress(startsAt)}`;
}
