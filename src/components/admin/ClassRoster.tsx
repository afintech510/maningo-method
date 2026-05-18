'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CapacityBadge } from '@/components/ui/CapacityBadge';
import { EmptyState } from '@/components/feedback/EmptyState';

export interface Enrollment {
  booking_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  payment_type: string;
  status: string;
  booked_at: string;
}

interface StudentSearchResult {
  id: string;
  full_name: string;
  email: string;
  credits: number;
  waiver_signed_at: string | null;
}

interface Props {
  classId: string;
  capacity: number;
  enrollments: Enrollment[];
  /** Refresh enrollments + the class list after a roster mutation. */
  onChange: () => void;
}

export function ClassRoster({ classId, capacity, enrollments, onChange }: Props) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-member typeahead
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [paymentType, setPaymentType] = useState<'pack_credit' | 'comp'>('pack_credit');
  const [adding, setAdding] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enrolledIds = new Set(enrollments.map((e) => e.student_email.toLowerCase()));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/students?q=${encodeURIComponent(query.trim())}&limit=10`);
        const data = await res.json();
        setResults(data.students || []);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  async function handleAdd(student: StudentSearchResult) {
    setError(null);
    setNotice(null);
    if (!student.waiver_signed_at) {
      const ok = window.confirm(
        `${student.full_name} has NOT signed the waiver. Add them to this class anyway? (Waiver override)`,
      );
      if (!ok) return;
    }
    setAdding(student.id);
    try {
      const res = await fetch(`/api/admin/classes/${classId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, payment_type: paymentType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Could not add member.');
      } else {
        setNotice(
          paymentType === 'pack_credit'
            ? `Added ${student.full_name} (−1 credit).`
            : `Added ${student.full_name} as a comp seat.`,
        );
        setQuery('');
        setResults([]);
        onChange();
      }
    } finally {
      setAdding(null);
    }
  }

  async function handleRemove(bookingId: string, label: string) {
    if (!window.confirm(`Remove ${label} from this class?`)) return;
    setError(null);
    setNotice(null);
    setRemoving(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Could not remove member.');
      } else {
        setNotice(data?.refunded ? `Removed ${label} (credit refunded).` : `Removed ${label}.`);
        onChange();
      }
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Roster</h3>
        <CapacityBadge bookedCount={enrollments.length} capacity={capacity} />
      </div>

      {notice && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {enrollments.length === 0 ? (
        <EmptyState title="No students booked yet" />
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div
              key={e.booking_id}
              className="rounded-xl border border-[#e5e2dc] bg-white p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{e.student_name}</p>
                <p className="text-xs text-muted-foreground truncate">{e.student_email}</p>
                {e.student_phone && (
                  <a href={`tel:${e.student_phone}`} className="text-xs text-primary hover:underline">
                    {e.student_phone}
                  </a>
                )}
                <div className="mt-1">
                  <Badge variant="neutral">{e.payment_type}</Badge>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={removing === e.booking_id}
                onClick={() => handleRemove(e.booking_id, e.student_name)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add member */}
      <div className="rounded-xl border border-[#e5e2dc] bg-[#faf9f6] p-3 space-y-3">
        <p className="text-sm font-semibold">Add a member</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentType('pack_credit')}
            className={`min-h-[44px] rounded-lg border-2 px-3 text-sm font-medium transition-colors ${
              paymentType === 'pack_credit'
                ? 'border-[#c9a96e] bg-[#c9a96e]/10 text-[#2d2d2d]'
                : 'border-[#e5e2dc] bg-white text-[#6b6b6b] hover:border-[#c9a96e]/60'
            }`}
          >
            Use a credit
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('comp')}
            className={`min-h-[44px] rounded-lg border-2 px-3 text-sm font-medium transition-colors ${
              paymentType === 'comp'
                ? 'border-[#c9a96e] bg-[#c9a96e]/10 text-[#2d2d2d]'
                : 'border-[#e5e2dc] bg-white text-[#6b6b6b] hover:border-[#c9a96e]/60'
            }`}
          >
            Comp seat
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…"
          className="w-full h-11 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
        />

        {query.trim() && (
          <div className="rounded-lg border border-[#e5e2dc] bg-white max-h-60 overflow-y-auto">
            {searching && results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matches.</p>
            ) : (
              results.map((s) => {
                const already = enrolledIds.has(s.email.toLowerCase());
                const tooFew = paymentType === 'pack_credit' && (s.credits ?? 0) <= 0;
                const disable = already || adding === s.id;
                return (
                  <div
                    key={s.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 border-b last:border-b-0 border-[#e5e2dc]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      <div className="flex gap-2 mt-0.5 text-[11px] text-[#6b6b6b]">
                        <span>{s.credits ?? 0} credits</span>
                        {!s.waiver_signed_at && (
                          <span className="text-amber-700">waiver not signed</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      loading={adding === s.id}
                      disabled={disable}
                      onClick={() => handleAdd(s)}
                    >
                      {already
                        ? 'Booked'
                        : !s.waiver_signed_at
                          ? 'Add (waiver override)'
                          : tooFew
                            ? 'Add anyway'
                            : 'Add'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
