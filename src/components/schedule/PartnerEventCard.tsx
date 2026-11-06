import { Card } from '@/components/ui/Card';
import { formatStudioTime, formatStudioDate } from '@/lib/timezone';
import type { PartnerEvent } from '@/lib/partner-events';

/**
 * Schedule card for a class booked through a partner (see partner-events.ts).
 * Laid out like ClassCard, but the button leaves the site for the partner's
 * booking page instead of spending a credit.
 */
export function PartnerEventCard({ event }: { event: PartnerEvent }) {
  return (
    <Card className="border-[#c9a96e]/40">
      <div className="mb-1">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b6b6b] font-medium">
          {formatStudioDate(event.startsAt, 'EEE, MMM d')}
        </p>
        <span className="text-lg font-semibold">
          {formatStudioTime(event.startsAt)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-0.5">
        <p className="font-medium">{event.title}</p>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#c9a96e] bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-full px-2 py-0.5">
          Collab · booked through {event.partner}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        {event.durationMinutes} min · {event.details}
      </p>
      <div className="flex items-start gap-2 mb-2 text-xs text-muted-foreground">
        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
          <span className="font-medium text-foreground">{event.partner}</span>
          <br />{event.address}
        </a>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Class credits can&rsquo;t be used &mdash; booking and payment are through {event.partner}.
      </p>
      <a
        href={event.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center min-h-[44px] rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
      >
        Book with {event.partner} &rarr;
      </a>
    </Card>
  );
}
