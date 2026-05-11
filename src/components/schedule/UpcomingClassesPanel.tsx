'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatStudioTime, STUDIO_TIMEZONE } from '@/lib/timezone';

interface ClassItem {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  spots_remaining: number;
  max_capacity: number;
}

interface UpcomingClassesPanelProps {
  /** Section heading shown above the panel. */
  title?: string;
  /** Section subhead. */
  subtitle?: string;
  /** How many days ahead to fetch (default 180 = ~6 months, covers full schedule). */
  horizonDays?: number;
  /** Initial collapsed state. Users can toggle visibility. */
  defaultOpen?: boolean;
  /** Show a "View full schedule" CTA below the panel. */
  showFooterCta?: boolean;
  /** Booked class IDs from the current user (optional — to render Booked pills). */
  bookedClassIds?: string[];
  /** When set, clicking a class card calls this; otherwise links to /schedule. */
  onClassClick?: (cls: ClassItem) => void;
}

export function UpcomingClassesPanel({
  title = 'Upcoming Classes',
  subtitle,
  horizonDays = 180,
  defaultOpen = true,
  showFooterCta = true,
  bookedClassIds = [],
  onClassClick,
}: UpcomingClassesPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const horizonEnd = addDays(now, horizonDays);
    horizonEnd.setHours(23, 59, 59, 999);

    fetch(`/api/classes?from=${now.toISOString()}&to=${horizonEnd.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        const upcoming = (data.classes || []).filter(
          (c: ClassItem) => new Date(c.starts_at) >= now
        );
        setClasses(upcoming);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [horizonDays]);

  // Group by studio-local day so non-ET visitors don't see classes shuffled into
  // the wrong bucket (e.g. an 8 AM ET class showing up under the previous day).
  const days = useMemo(() => {
    const grouped: Record<string, ClassItem[]> = {};
    classes.forEach((c) => {
      const zoned = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      const day = format(zoned, 'yyyy-MM-dd');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(c);
    });
    return Object.keys(grouped)
      .sort()
      .map((day) => [day, grouped[day]] as [string, ClassItem[]]);
  }, [classes]);

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#e5e2dc]">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
          {subtitle && <p className="text-xs text-[#6b6b6b] mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Hide upcoming classes' : 'Show upcoming classes'}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#6b6b6b] hover:bg-[#faf9f6] transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </header>

      {open && (
        <div className="p-4 sm:p-6">
          {loading ? (
            <SkeletonGrid />
          ) : days.length === 0 ? (
            <p className="text-sm text-[#6b6b6b] text-center py-6">
              No upcoming classes scheduled. Check back soon.
            </p>
          ) : (
            <DaySwiper days={days} bookedClassIds={bookedClassIds} onClassClick={onClassClick} />
          )}

          {showFooterCta && (
            <div className="mt-4 pt-4 border-t border-[#e5e2dc] text-center">
              <Link
                href="/schedule"
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                View full schedule &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 bg-[#f0eee8] rounded animate-pulse" />
          <div className="h-16 bg-[#f0eee8] rounded-xl animate-pulse" />
          <div className="h-16 bg-[#f0eee8] rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface DaySwiperProps {
  days: [string, ClassItem[]][];
  bookedClassIds: string[];
  onClassClick?: (cls: ClassItem) => void;
}

/**
 * Two-column swipable view: shows 2 days at a time, snap-scrolls
 * horizontally, with arrow buttons + dot indicators for the current pair.
 */
function DaySwiper({ days, bookedClassIds, onClassClick }: DaySwiperProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalPages = Math.ceil(days.length / 2);

  // Keep activeIndex in sync with scroll position (swipe gesture)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const child = el.children[0] as HTMLElement | undefined;
      if (!child) return;
      const colWidth = child.clientWidth;
      // Each "page" = 2 columns
      const pageWidth = colWidth * 2 + 12; // 12 = gap-3
      const next = Math.round(el.scrollLeft / pageWidth);
      setActiveIndex(next);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToPage(pageIdx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[0] as HTMLElement | undefined;
    if (!child) return;
    const colWidth = child.clientWidth;
    const pageWidth = colWidth * 2 + 12;
    el.scrollTo({ left: pageIdx * pageWidth, behavior: 'smooth' });
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        className="grid grid-flow-col auto-cols-[calc(50%-6px)] gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-1 px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map(([day, items], idx) => (
          <DayColumn
            key={day}
            day={day}
            items={items}
            bookedClassIds={bookedClassIds}
            onClassClick={onClassClick}
            // Snap each pair (idx 0/1, 2/3, ...) at the start of the row
            snapAlign={idx % 2 === 0 ? 'start' : 'none'}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={() => scrollToPage(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            aria-label="Previous days"
            className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-full border border-[#e5e2dc] text-[#6b6b6b] disabled:opacity-30 hover:border-[#c9a96e] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                  i === activeIndex ? 'bg-[#c9a96e]' : 'bg-[#e5e2dc]'
                }`}
                aria-hidden
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollToPage(Math.min(totalPages - 1, activeIndex + 1))}
            disabled={activeIndex >= totalPages - 1}
            aria-label="More days"
            className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-full border border-[#e5e2dc] text-[#6b6b6b] disabled:opacity-30 hover:border-[#c9a96e] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function DayColumn({
  day,
  items,
  bookedClassIds,
  onClassClick,
  snapAlign,
}: {
  day: string;
  items: ClassItem[];
  bookedClassIds: string[];
  onClassClick?: (cls: ClassItem) => void;
  snapAlign: 'start' | 'none';
}) {
  // `day` is already a studio-local YYYY-MM-DD string; formatting it would
  // re-zone (and shift back a few hours on UTC midnight). Render directly.
  const [yy, mm, dd] = day.split('-').map(Number);
  const headerLabel = format(new Date(yy, (mm || 1) - 1, dd || 1), 'EEE MMM d');
  return (
    <div className={`min-w-0 ${snapAlign === 'start' ? 'snap-start' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6b6b] mb-2">
        {headerLabel}
      </p>
      <div className="space-y-2">
        {items.map((cls) => {
          const isBooked = bookedClassIds.includes(cls.id);
          const isFull = cls.spots_remaining <= 0;
          const Body = (
            <>
              <p className="text-xs font-semibold text-[#6b6b6b] mb-0.5">
                {formatStudioTime(cls.starts_at)}
              </p>
              <p className="font-medium text-sm leading-tight truncate">{cls.title}</p>
              <p className="text-[11px] text-[#6b6b6b] mt-1">
                {isBooked ? (
                  <span className="text-emerald-600 font-medium">Booked</span>
                ) : isFull ? (
                  <span>Full</span>
                ) : (
                  <span className={cls.spots_remaining <= 3 ? 'text-amber-600' : 'text-emerald-600'}>
                    {cls.spots_remaining} {cls.spots_remaining === 1 ? 'spot' : 'spots'}
                  </span>
                )}
                <span> &middot; {cls.duration_minutes}m</span>
              </p>
            </>
          );
          const className =
            'block w-full text-left rounded-xl border border-[#e5e2dc] bg-[#faf9f6] hover:border-[#c9a96e] hover:bg-white transition-colors p-3 min-h-[88px]';
          if (onClassClick) {
            return (
              <button key={cls.id} type="button" onClick={() => onClassClick(cls)} className={className}>
                {Body}
              </button>
            );
          }
          return (
            <Link key={cls.id} href={`/schedule?date=${day}`} className={className}>
              {Body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
