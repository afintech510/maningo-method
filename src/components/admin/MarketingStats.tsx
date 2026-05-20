import { formatStudioDate } from '@/lib/timezone';

interface RecentRow {
  id: string;
  code: string;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  is_active: boolean;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface Props {
  emailsSent: number;
  codesIssued: number;
  codesRedeemed: number;
  recent: RecentRow[];
}

export function MarketingStats({ emailsSent, codesIssued, codesRedeemed, recent }: Props) {
  const redemptionRate = codesIssued > 0 ? Math.round((codesRedeemed / codesIssued) * 100) : 0;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
          Performance
        </p>
        <h2 className="text-xl font-bold">Review-request results</h2>
        <p className="text-sm text-muted-foreground">
          Auto-fires 2&ndash;4 hours after a member&rsquo;s first confirmed class.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Emails sent" value={emailsSent} />
        <Stat label="Codes issued" value={codesIssued} />
        <Stat label="Codes redeemed" value={codesRedeemed} />
        <Stat label="Redemption rate" value={`${redemptionRate}%`} />
      </div>

      <div className="rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
        <div className="p-4 border-b border-[#e5e2dc]">
          <p className="text-sm font-semibold">Recent codes</p>
          <p className="text-xs text-muted-foreground">Most recent 20 codes issued.</p>
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No codes issued yet. The first one will land here after a member attends their first class.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f6] text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Member</th>
                  <th className="px-4 py-2 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Code</th>
                  <th className="px-4 py-2 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Issued</th>
                  <th className="px-4 py-2 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-[#f3f1ed]">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{r.profiles?.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {r.profiles?.email || ''}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-2.5 text-xs text-[#6b6b6b]">
                      {formatStudioDate(r.issued_at, 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function StatusPill({ row }: { row: RecentRow }) {
  if (row.redeemed_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-1">
        Redeemed
      </span>
    );
  }
  const expired = new Date(row.expires_at).getTime() < Date.now();
  if (expired || !row.is_active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-1">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium px-2 py-1">
      Pending
    </span>
  );
}
