// Where classes are held. Every page, email, calendar invite and schema block
// reads the address from here, so the next move is a one-file change.
//
// From October 1, 2026 classes are at U Gotta Dance in East Moriches. The venue
// name is deliberately kept out of branding and page headlines — it appears
// only where someone needs it to find the door (FAQ, calendar invite).

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

// Geocoded from OpenStreetMap for 533 Montauk Hwy, East Moriches NY 11940.
export const STUDIO_GEO = { latitude: 40.8033, longitude: -72.7648 };

const MAPS_QUERY = encodeURIComponent(STUDIO_ADDRESS);
export const STUDIO_MAPS_URL = `https://maps.google.com/?q=${MAPS_QUERY}`;
export const STUDIO_MAPS_EMBED_URL = `https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`;
