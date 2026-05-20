// JSON-LD LocalBusiness markup for the Speonk studio. Placed in the
// document <head> via the root layout so Google + Bing + Apple Maps
// can ingest the structured data on every page.
//
// TODO when available, drop into this file:
//   - Google Place ID (used by the review email link)
//   - Instagram / GBP / Yelp public URLs for `sameAs`
//   - Photo CDN URLs for `image` if we want richer rich-result imagery

const STUDIO_PHONE = '+1-631-252-5227';
const STUDIO_EMAIL = 'chelsea@maningomethod.com';
const STUDIO_ADDRESS = {
  street: '295 Montauk Highway, Suite 7',
  city: 'Speonk',
  state: 'NY',
  zip: '11972',
};
// Approximate coordinates of 295 Montauk Hwy, Speonk NY 11972.
const STUDIO_GEO = { latitude: 40.8262, longitude: -72.6817 };

export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'SportsActivityLocation'],
    name: 'Maningo Method',
    description:
      'Mat & Sculpt Pilates studio in Speonk, NY — serving Westhampton, East Quogue, Remsenburg, and the surrounding Hamptons area. Small classes, max 20 students, all levels welcome.',
    url: 'https://www.maningomethod.com',
    telephone: STUDIO_PHONE,
    email: STUDIO_EMAIL,
    image: 'https://www.maningomethod.com/group-class-maningo.jpg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: STUDIO_ADDRESS.street,
      addressLocality: STUDIO_ADDRESS.city,
      addressRegion: STUDIO_ADDRESS.state,
      postalCode: STUDIO_ADDRESS.zip,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: STUDIO_GEO.latitude,
      longitude: STUDIO_GEO.longitude,
    },
    areaServed: [
      { '@type': 'City', name: 'Speonk, NY' },
      { '@type': 'City', name: 'Westhampton, NY' },
      { '@type': 'City', name: 'East Quogue, NY' },
      { '@type': 'City', name: 'Remsenburg, NY' },
      { '@type': 'City', name: 'Eastport, NY' },
    ],
    // Representative weekly cadence; ground truth is /schedule. Update via
    // the admin Marketing tab if the standing schedule changes.
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday'],
        opens: '07:00',
        closes: '10:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '07:00',
        closes: '12:00',
      },
    ],
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Credit Card',
    hasMap: 'https://maps.google.com/?q=295+Montauk+Highway+Suite+7+Speonk+NY+11972',
    potentialAction: {
      '@type': 'ReserveAction',
      target: 'https://www.maningomethod.com/schedule',
      name: 'Book a class',
    },
    makesOffer: [
      {
        '@type': 'Offer',
        name: 'Mat & Sculpt Pilates Class (drop-in)',
        price: '25',
        priceCurrency: 'USD',
        url: 'https://www.maningomethod.com/schedule',
      },
      {
        '@type': 'Offer',
        name: '5-Class Pack',
        price: '112',
        priceCurrency: 'USD',
        url: 'https://www.maningomethod.com/dashboard',
      },
      {
        '@type': 'Offer',
        name: '10-Class Pack',
        price: '200',
        priceCurrency: 'USD',
        url: 'https://www.maningomethod.com/dashboard',
      },
    ],
    sameAs: [
      // TODO drop Instagram / GBP / Yelp public URLs in here when handy.
      // 'https://www.instagram.com/maningomethod',
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
