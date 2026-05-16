import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { formatCents } from '@/lib/pricing';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const WEEKDAY_RATE_CENTS = 4000; // $40 / hour
const WEEKEND_RATE_CENTS = 7500; // $75 / hour

export default async function AdminStudioPage() {
  const supabase = createAdminClient();

  // Every scheduled class consumes studio time. Cancelled rows don't bill.
  const { data: classes } = await supabase
    .from('classes')
    .select('starts_at, duration_minutes, status')
    .eq('status', 'scheduled');

  type MonthRow = {
    key: string; // 'YYYY-MM'
    label: string; // 'May 2026'
    weekdayHours: number;
    weekendHours: number;
    classCount: number;
  };

  const monthMap = new Map<string, MonthRow>();
  (classes || []).forEach((c) => {
    const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
    const key = format(z, 'yyyy-MM');
    const label = format(z, 'MMMM yyyy');
    const dow = z.getDay(); // 0 Sun, 6 Sat
    const isWeekend = dow === 0 || dow === 6;
    const hours = (c.duration_minutes || 0) / 60;
    if (!monthMap.has(key)) {
      monthMap.set(key, { key, label, weekdayHours: 0, weekendHours: 0, classCount: 0 });
    }
    const row = monthMap.get(key)!;
    if (isWeekend) row.weekendHours += hours;
    else row.weekdayHours += hours;
    row.classCount += 1;
  });

  // Newest month first
  const months = Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));

  const totals = months.reduce(
    (acc, m) => {
      acc.weekdayHours += m.weekdayHours;
      acc.weekendHours += m.weekendHours;
      acc.classCount += m.classCount;
      return acc;
    },
    { weekdayHours: 0, weekendHours: 0, classCount: 0 }
  );

  const now = new Date();
  const currentKey = format(toZonedTime(now, STUDIO_TIMEZONE), 'yyyy-MM');
  const currentMonth = monthMap.get(currentKey);

  const rentCents = (weekdayHours: number, weekendHours: number) =>
    Math.round(weekdayHours * WEEKDAY_RATE_CENTS + weekendHours * WEEKEND_RATE_CENTS);

  const lifetimeRent = rentCents(totals.weekdayHours, totals.weekendHours);
  const monthRent = currentMonth
    ? rentCents(currentMonth.weekdayHours, currentMonth.weekendHours)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Studio</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Host Hampton rent</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monthly tally of studio hours from scheduled classes.{' '}
          <strong className="text-foreground">Weekday {formatCents(WEEKDAY_RATE_CENTS)}/hr</strong>{' '}
          &middot;{' '}
          <strong className="text-foreground">Weekend {formatCents(WEEKEND_RATE_CENTS)}/hr</strong>.
          Cancelled classes do not bill.
        </p>
      </div>

      {/* Stat grid */}
      <section className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Owed this month" value={formatCents(monthRent)} accent />
          <Stat label="Hours this month" value={formatHours((currentMonth?.weekdayHours || 0) + (currentMonth?.weekendHours || 0))} />
          <Stat label="Owed (all time)" value={formatCents(lifetimeRent)} />
          <Stat label="Total scheduled classes" value={String(totals.classCount)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">
          Monthly breakdown
        </h2>
        {months.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No scheduled classes yet. Add classes from{' '}
              <a href="/admin/schedule" className="text-[#c9a96e] hover:underline">/admin/schedule</a>{' '}
              and the rent rolls in here.
            </p>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#faf9f6] text-[11px] uppercase tracking-wider text-[#6b6b6b]">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Month</th>
                    <th className="text-right font-medium px-4 py-3">Classes</th>
                    <th className="text-right font-medium px-4 py-3">Weekday hrs</th>
                    <th className="text-right font-medium px-4 py-3">Weekend hrs</th>
                    <th className="text-right font-medium px-4 py-3">Weekday $</th>
                    <th className="text-right font-medium px-4 py-3">Weekend $</th>
                    <th className="text-right font-medium px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => {
                    const wkRent = Math.round(m.weekdayHours * WEEKDAY_RATE_CENTS);
                    const weRent = Math.round(m.weekendHours * WEEKEND_RATE_CENTS);
                    const total = wkRent + weRent;
                    const isCurrent = m.key === currentKey;
                    return (
                      <tr
                        key={m.key}
                        className={`border-t border-[#e5e2dc] ${
                          isCurrent ? 'bg-[#c9a96e]/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">
                          {m.label}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-[#c9a96e] font-semibold">
                              MTD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{m.classCount}</td>
                        <td className="px-4 py-3 text-right">{formatHours(m.weekdayHours)}</td>
                        <td className="px-4 py-3 text-right">{formatHours(m.weekendHours)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCents(wkRent)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCents(weRent)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCents(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#faf9f6] text-sm">
                  <tr className="border-t-2 border-[#e5e2dc]">
                    <td className="px-4 py-3 font-semibold">All time</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{totals.classCount}</td>
                    <td className="px-4 py-3 text-right">{formatHours(totals.weekdayHours)}</td>
                    <td className="px-4 py-3 text-right">{formatHours(totals.weekendHours)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatCents(Math.round(totals.weekdayHours * WEEKDAY_RATE_CENTS))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatCents(Math.round(totals.weekendHours * WEEKEND_RATE_CENTS))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatCents(lifetimeRent)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {months.map((m) => {
                const wkRent = Math.round(m.weekdayHours * WEEKDAY_RATE_CENTS);
                const weRent = Math.round(m.weekendHours * WEEKEND_RATE_CENTS);
                const total = wkRent + weRent;
                const isCurrent = m.key === currentKey;
                return (
                  <Card key={m.key} className={isCurrent ? 'border-[#c9a96e]' : ''}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold">{m.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.classCount} class{m.classCount === 1 ? '' : 'es'}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-[#c9a96e] font-semibold">
                              · month to date
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-lg font-bold whitespace-nowrap">{formatCents(total)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-[#e5e2dc] pt-2">
                      <div>
                        <p className="uppercase tracking-wider text-[10px]">Weekday</p>
                        <p>
                          {formatHours(m.weekdayHours)} &middot; {formatCents(wkRent)}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wider text-[10px]">Weekend</p>
                        <p>
                          {formatHours(m.weekendHours)} &middot; {formatCents(weRent)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? 'border-[#c9a96e]/40 bg-[#c9a96e]/5' : 'border-[#e5e2dc] bg-white'
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}

function formatHours(h: number): string {
  if (h === 0) return '0h';
  const rounded = Math.round(h * 100) / 100;
  return `${rounded}h`;
}
