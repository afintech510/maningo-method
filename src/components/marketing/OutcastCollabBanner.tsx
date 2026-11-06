'use client';

import { useEffect, useState } from 'react';
import { fromZonedTime } from 'date-fns-tz';
import { Card } from '@/components/ui/Card';
import { STUDIO_TIMEZONE } from '@/lib/timezone';

// Collab class with Outcast Fitness at their gym, not ours. It is deliberately
// not a class in our booking system: Outcast takes the bookings and the $30,
// and class credits can't be used, so this banner only points people to them.
// Hides at the end of Nov 29, 2026 studio time — same reasoning as
// MemorialClassBanner.tsx.
const HIDE_AFTER = fromZonedTime('2026-11-30T00:00:00', STUDIO_TIMEZONE);

// Outcast's Mindbody booking page for the class.
const BOOKING_URL =
  'https://go.mindbodyonline.com/book/app/classes/5756561?date=2026-11-29&mbo_src=links-shortcuts';

const ADDRESS = '333 Main St, Center Moriches, NY 11934';
const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(`Outcast Fitness, ${ADDRESS}`)}`;

export function OutcastCollabBanner({
  className = '',
}: {
  /** Applied to the card, so spacing disappears with it once it hides. */
  className?: string;
}) {
  // Nothing on the server / first paint, then decide on the client — reading
  // the clock during render would be a hydration mismatch.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(Date.now() < HIDE_AFTER.getTime());
  }, []);

  if (!visible) return null;

  return (
    <Card className={`border-[#c9a96e]/30 bg-[#c9a96e]/5 ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c9a96e] mb-1.5">
        Collab Class · Sunday, Nov 29 · 9:30 AM
      </p>
      <h2 className="text-xl sm:text-2xl font-bold leading-snug">
        Maningo Method Pilates &times; <span className="text-[#c9a96e]">Outcast Fitness</span>
      </h2>
      <p className="text-base font-medium text-[#2d2d2d] mt-1">
        Two powerhouse workouts. One unforgettable hour.
      </p>
      <p className="text-sm text-[#6b6b6b] mt-2 leading-relaxed">
        Join Chelsea Maningo for 30 minutes of mat Pilates, followed by 30 minutes of Outcast
        Fitness Full Body Fusion with Coach Matt. Combining the core control, precision, and
        mindful movement of Pilates with the strength and conditioning of Outcast, this 60-minute
        mash-up delivers a killer full-body workout. Come ready to move, sweat, and experience the
        best of both worlds!
      </p>
      <p className="text-sm text-[#6b6b6b] mt-2 leading-relaxed">
        Sunday, November 29 · 9:30 AM at Outcast Fitness, {ADDRESS}.{' '}
        <strong className="text-[#2d2d2d]">$30 · 21 spots · bring your own mat.</strong> Booked
        through Outcast &mdash; Maningo class credits can&rsquo;t be used.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          Book with Outcast &rarr;
        </a>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-11 px-2 text-sm font-medium text-[#c9a96e] hover:underline"
        >
          Get directions
        </a>
      </div>
    </Card>
  );
}
