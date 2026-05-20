'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

interface ClassRow {
  id: string;
  title: string;
  starts_at: string;
  status: string;
}

interface Props {
  classes: ClassRow[];
  /** ISO start (inclusive) and end (exclusive) of the window the parent loaded. */
  weekStart: string;
  weekEnd: string;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Studio business style: "9am", "6:30pm" — no leading zero, no minutes when :00.
function casualTime(d: Date): string {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const meridiem = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${meridiem}` : `${h12}:${String(m).padStart(2, '0')}${meridiem}`;
}

export function ScheduleExport({ classes, weekStart, weekEnd }: Props) {
  const [copied, setCopied] = useState<'google' | 'social' | null>(null);

  const lines = useMemo(() => {
    return classes
      .filter((c) => c.status === 'scheduled')
      .slice()
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .map((c) => {
        const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
        return {
          day: DAY_SHORT[z.getDay()],
          time: casualTime(z),
          title: c.title,
        };
      });
  }, [classes]);

  const googleBlock = useMemo(() => {
    if (lines.length === 0) return 'No classes scheduled this week.';
    const body = lines.map((l) => `${l.day} ${l.time} — ${l.title}`).join('\n');
    return [
      "This week's Pilates schedule:",
      '',
      body,
      '',
      'Max 20 spots per class — spots fill fast.',
      'Book your spot → maningomethod.com/schedule',
    ].join('\n');
  }, [lines]);

  const socialBlock = useMemo(() => {
    if (lines.length === 0) return 'No classes scheduled this week.';
    const body = lines.map((l) => `${l.day} ${l.time} | ${l.title}`).join('\n');
    return ['📅 This week at Maningo Method:', '', body, '', 'Link in bio to book 🧘'].join('\n');
  }, [lines]);

  async function copy(text: string, which: 'google' | 'social') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Older browsers fall back to selection
      window.prompt('Copy this manually:', text);
    }
  }

  const range = `${format(toZonedTime(new Date(weekStart), STUDIO_TIMEZONE), 'EEE MMM d')} – ${format(
    toZonedTime(new Date(new Date(weekEnd).getTime() - 1), STUDIO_TIMEZONE),
    'EEE MMM d',
  )}`;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
          Schedule export
        </p>
        <h2 className="text-xl font-bold">This week&rsquo;s schedule, ready to paste</h2>
        <p className="text-sm text-muted-foreground">
          {range} &middot; {lines.length} class{lines.length === 1 ? '' : 'es'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ExportBlock
          title="Google Business / longform"
          text={googleBlock}
          onCopy={() => copy(googleBlock, 'google')}
          copied={copied === 'google'}
        />
        <ExportBlock
          title="Instagram / SMS"
          text={socialBlock}
          onCopy={() => copy(socialBlock, 'social')}
          copied={copied === 'social'}
        />
      </div>
    </section>
  );
}

function ExportBlock({
  title,
  text,
  onCopy,
  copied,
}: {
  title: string;
  text: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">{title}</p>
        <Button size="sm" variant={copied ? 'secondary' : 'primary'} onClick={onCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[#2d2d2d] bg-[#faf9f6] border border-[#e5e2dc] rounded-lg p-3">
        {text}
      </pre>
    </div>
  );
}
