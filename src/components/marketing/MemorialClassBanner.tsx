'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { fromZonedTime } from 'date-fns-tz';

// The banner auto-hides once the memorial class has passed. The cutoff is the
// end of Sept 11, 2026 in the studio's timezone (i.e. midnight entering Sept 12
// studio-local), converted to a UTC instant so it hides at the right moment
// regardless of the visitor's timezone. The year is hardcoded so it can't
// reappear in future years — edit here if the event ever repeats.
const HIDE_AFTER = fromZonedTime('2026-09-12T00:00:00', STUDIO_TIMEZONE);

export function MemorialClassBanner() {
  // Render nothing on the server / first paint, then decide on the client so
  // there's no hydration mismatch from reading the clock during render.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(Date.now() < HIDE_AFTER.getTime());
  }, []);

  if (!visible) return null;

  return (
    <Card className="border-[#c9a96e]/30 bg-[#c9a96e]/5">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c9a96e] mb-1.5">
        In Memoriam · Sept 11
      </p>
      <h2 className="text-xl sm:text-2xl font-bold leading-snug">
        Join us for a{' '}
        <span className="text-[#c9a96e]">free 9/11 memorial class</span> on the gazebo lawn in Westhampton
      </h2>
      <p className="text-sm text-[#6b6b6b] mt-2 leading-relaxed">
        Thursday, September 11 · 7:30 AM. Free for members &mdash; suggested $20 cash donation,
        100% to the Tunnel to Towers Foundation.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Link
          href="/schedule"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          Reserve your spot &rarr;
        </Link>
        <a
          href="https://t2t.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-11 px-2 text-sm font-medium text-[#c9a96e] hover:underline"
        >
          About Tunnel to Towers
        </a>
      </div>
    </Card>
  );
}
