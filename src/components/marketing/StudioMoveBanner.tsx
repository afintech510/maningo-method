'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fromZonedTime } from 'date-fns-tz';
import { Card } from '@/components/ui/Card';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import {
  STUDIO_ADDRESS,
  STUDIO_MAPS_URL,
  STUDIO_TOWN,
  STUDIO_VENUE,
} from '@/lib/studio-location';

// Move announcement. Reads "we're moving" until the first East Moriches class
// day, "we've moved" through October, then hides itself. Studio wall-clock
// converted to UTC instants, year hardcoded so it can't reappear — same
// reasoning as MemorialClassBanner.tsx.
const MOVE_DATE = fromZonedTime('2026-10-01T00:00:00', STUDIO_TIMEZONE);
const HIDE_AFTER = fromZonedTime('2026-11-01T00:00:00', STUDIO_TIMEZONE);

type Phase = 'moving' | 'moved' | 'hidden';

function movePhase(now = Date.now()): Phase {
  if (now < MOVE_DATE.getTime()) return 'moving';
  if (now < HIDE_AFTER.getTime()) return 'moved';
  return 'hidden';
}

export function StudioMoveBanner({
  variant = 'full',
  className = '',
}: {
  variant?: 'full' | 'compact';
  /** Applied to the card, so spacing disappears with it once it hides. */
  className?: string;
}) {
  // Nothing on the server / first paint, then decide on the client — reading
  // the clock during render would be a hydration mismatch.
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    setPhase(movePhase());
  }, []);

  if (phase === 'hidden') return null;

  const moving = phase === 'moving';
  const kicker = moving ? 'We’re Moving · Starting Oct 1' : 'We’ve Moved';

  return (
    <Card className={`border-[#c9a96e]/30 bg-[#c9a96e]/5 ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c9a96e] mb-1.5">
        {kicker}
      </p>
      <h2 className={`${variant === 'compact' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-bold leading-snug`}>
        {moving ? 'Starting October 1, classes will be at ' : 'Classes are now at '}
        <span className="text-[#c9a96e]">{STUDIO_VENUE}</span> in {STUDIO_TOWN}
      </h2>
      <p className="text-sm text-[#6b6b6b] mt-2 leading-relaxed">
        {STUDIO_ADDRESS}.{' '}
        {moving
          ? 'Same classes, same instructor — just a new room. Classes through September 30 stay at the current studio.'
          : 'Same classes, same instructor — just a new room. See you on the mat.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <a
          href={STUDIO_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          Get directions &rarr;
        </a>
        <Link
          href="/schedule"
          className="inline-flex items-center justify-center h-11 px-2 text-sm font-medium text-[#c9a96e] hover:underline"
        >
          View the schedule
        </Link>
      </div>
    </Card>
  );
}
