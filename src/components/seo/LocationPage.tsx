import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import type { Location } from '@/lib/locations';
import { LOCATION_LIST } from '@/lib/locations';

const CANONICAL_BASE = 'https://www.maningomethod.com';
const STUDIO_ADDRESS = '295 Montauk Highway, Suite 7, Speonk, NY 11972';
const MAPS_QUERY = '295+Montauk+Highway+Suite+7+Speonk+NY+11972';

/** Build the Next.js metadata for a town page. Used by each route file. */
export function locationMetadata(loc: Location): Metadata {
  const title = `Pilates Classes near ${loc.town}, NY | Maningo Method`;
  const description = `Mat & Sculpt Pilates for ${loc.town}, NY — small all-levels group classes (max 20) at Maningo Method in Speonk, about ${loc.driveMinutes} minutes from ${loc.town}. Book online.`;
  const path = `/pilates-in-${loc.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${CANONICAL_BASE}${path}`,
      siteName: 'Maningo Method',
      type: 'website',
      images: [
        {
          url: '/group-class-maningo.jpg',
          width: 1200,
          height: 630,
          alt: `Maningo Method Pilates class — serving ${loc.town}, NY`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/group-class-maningo.jpg'],
    },
  };
}

function LocationSchema({ loc }: { loc: Location }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Mat & Sculpt Pilates classes',
    name: `Pilates Classes near ${loc.town}, NY`,
    description: loc.intro,
    url: `${CANONICAL_BASE}/pilates-in-${loc.slug}`,
    areaServed: { '@type': 'City', name: `${loc.town}, NY` },
    provider: {
      '@type': ['LocalBusiness', 'SportsActivityLocation'],
      name: 'Maningo Method',
      telephone: '+1-631-252-5227',
      url: CANONICAL_BASE,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '295 Montauk Highway, Suite 7',
        addressLocality: 'Speonk',
        addressRegion: 'NY',
        postalCode: '11972',
        addressCountry: 'US',
      },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LocationPage({ location: loc }: { location: Location }) {
  const others = LOCATION_LIST.filter((l) => l.slug !== loc.slug);

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <LocationSchema loc={loc} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/95 backdrop-blur-sm border-b border-[#e5e2dc]">
        <div className="relative flex items-center justify-center px-5 py-3 min-h-[64px] max-w-6xl mx-auto">
          <Link href="/" aria-label="Maningo Method home" className="block">
            <Image
              src="/maningo-method_logo_600.png"
              alt="Maningo Method"
              width={600}
              height={180}
              priority
              className="h-10 sm:h-12 w-auto"
            />
          </Link>
          <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center h-9 px-4 sm:px-5 rounded-full bg-[#2d2d2d] text-white text-xs sm:text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Book Class
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16">
        <div className="max-w-3xl mx-auto px-5 pt-12 pb-10 sm:pt-16 sm:pb-14 text-center">
          <span className="inline-block bg-[#1a1a1a]/20 text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-4">
            Serving {loc.town}, NY
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-[1.1] mb-5">
            Pilates Classes near <span className="text-[#c9a96e]">{loc.town}, NY</span>
          </h1>
          <p className="text-[#4b4b4b] text-lg leading-relaxed mb-8">{loc.intro}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c9a96e] text-white text-base font-medium hover:bg-[#b8955d] transition-colors"
            >
              View Schedule
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-[#e5e2dc] bg-white text-[#2d2d2d] text-base font-medium hover:border-[#c9a96e] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Getting here */}
      <section className="px-5 py-14 sm:py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-center">
            Getting here from {loc.town}
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#faf9f6] border border-[#e5e2dc] px-4 py-2 text-sm text-[#2d2d2d]">
              <span className="text-[#c9a96e] font-semibold">~{loc.driveMinutes} min</span> drive
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#faf9f6] border border-[#e5e2dc] px-4 py-2 text-sm text-[#2d2d2d]">
              <span className="text-[#c9a96e] font-semibold">~{loc.distanceMi} mi</span> away
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#faf9f6] border border-[#e5e2dc] px-4 py-2 text-sm text-[#2d2d2d]">
              Free parking at the door
            </span>
          </div>
          <p className="text-[#4b4b4b] leading-relaxed max-w-2xl mx-auto text-center mb-3">
            {loc.directions}
          </p>
          <p className="text-[#4b4b4b] leading-relaxed max-w-2xl mx-auto text-center mb-8">
            {loc.localAngle}
          </p>
          <div className="flex justify-center mb-8">
            <a
              href={`https://maps.google.com/?q=${MAPS_QUERY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Get directions &rarr;
            </a>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#e5e2dc] bg-white">
            <iframe
              src={`https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`}
              width="100%"
              height="320"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Maningo Method Pilates Studio — ${STUDIO_ADDRESS}`}
            />
          </div>
          <p className="text-xs text-[#6b6b6b] mt-4 text-center">{STUDIO_ADDRESS}</p>
        </div>
      </section>

      {/* Classes & pricing */}
      <section className="px-5 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Classes &amp; pricing</h2>
          <p className="text-[#6b6b6b] mb-10 max-w-md mx-auto">
            Mat &amp; Sculpt, all levels, max 20 students. No contracts — buy a pack and book at your pace.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            {[
              { label: 'Drop-In', price: '$25', note: 'Try a class' },
              { label: '5-Pack', price: '$112', note: 'Save 10%' },
              { label: '10-Pack', price: '$200', note: 'Save 20%' },
            ].map((tier) => (
              <div
                key={tier.label}
                className="rounded-2xl border border-[#e5e2dc] bg-white p-5 text-center"
              >
                <p className="text-sm font-semibold text-[#2d2d2d]">{tier.label}</p>
                <p className="text-2xl font-bold text-[#c9a96e] my-1">{tier.price}</p>
                <p className="text-xs text-[#6b6b6b]">{tier.note}</p>
              </div>
            ))}
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c9a96e] text-white text-base font-medium hover:bg-[#b8955d] transition-colors"
          >
            Create an account to book
          </Link>
        </div>
      </section>

      {/* Local FAQ */}
      <section className="px-5 py-14 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            {loc.town} Pilates FAQ
          </h2>
          <div className="space-y-4">
            {loc.faq.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-5"
              >
                <h3 className="font-semibold text-[#2d2d2d] mb-2">{item.q}</h3>
                <p className="text-sm text-[#4b4b4b] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sibling towns + footer */}
      <footer className="bg-[#2d2d2d] text-white px-5 py-12">
        <div className="max-w-5xl mx-auto">
          {others.length > 0 && (
            <div className="mb-10 text-center">
              <p className="font-semibold text-sm mb-4 text-white/80">Also serving the area</p>
              <div className="flex flex-wrap justify-center gap-3">
                {others.map((o) => (
                  <Link
                    key={o.slug}
                    href={`/pilates-in-${o.slug}`}
                    className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:text-white hover:border-[#c9a96e] transition-colors"
                  >
                    Pilates near {o.town}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-white/10 pt-8 grid sm:grid-cols-3 gap-8">
            <div>
              <p className="font-serif font-bold text-lg mb-3">Maningo Method</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Mat &amp; Sculpt Pilates in Speonk, NY — serving {loc.town} and the surrounding Hamptons area.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Quick Links</p>
              <div className="flex flex-col gap-2 text-sm text-white/60">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <Link href="/schedule" className="hover:text-white transition-colors">Schedule</Link>
                <Link href="/register" className="hover:text-white transition-colors">Get Started</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Studio</p>
              <p className="text-sm text-white/60">295 Montauk Highway, Suite 7</p>
              <p className="text-sm text-white/60">Speonk, NY 11972</p>
              <a href="tel:+16312525227" className="text-sm text-white/80 hover:text-white mt-2 block">
                (631) 252-5227
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
