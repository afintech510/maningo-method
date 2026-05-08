'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Input } from '@/components/ui/Input';
import { formatCents } from '@/lib/pricing';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  credits: number;
  lifetime_spend_cents: number;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<Student | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/students');
    const data = await res.json();
    setStudents(data.students || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = search
    ? students.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.email?.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Members</h1>
        <Skeleton variant="card" />
        <Skeleton variant="card" className="mt-3" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Members</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Tap a member to adjust their credit balance. Every change is logged.
      </p>

      <div className="mb-4">
        <Input
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No members found" />
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => (
            <Card key={student.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{student.full_name || '(no name)'}</p>
                  <p className="text-sm text-muted-foreground break-all">{student.email}</p>
                  {student.phone && (
                    <a href={`tel:${student.phone}`} className="text-sm text-[#c9a96e] hover:underline">
                      {student.phone}
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs text-muted-foreground">Credits</p>
                  <p className="text-2xl font-bold leading-none">{student.credits}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime: <span className="font-medium text-[#2d2d2d]">{formatCents(student.lifetime_spend_cents)}</span>
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(student)} className="w-full sm:w-auto">
                  Adjust credits
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {adjustTarget && (
        <AdjustModal
          student={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSaved={async () => {
            setAdjustTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AdjustModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const deltaNum = parseInt(delta, 10);
    if (!Number.isInteger(deltaNum) || deltaNum === 0) {
      setError('Delta must be a non-zero integer (e.g. +5 or -1).');
      return;
    }
    if (reason.trim().length < 3) {
      setError('A short reason is required.');
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/admin/students/${student.id}/credits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: deltaNum, reason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not adjust credits.');
      setSubmitting(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#e5e2dc] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Adjust credits for</p>
            <p className="font-semibold">{student.full_name}</p>
            <p className="text-xs text-muted-foreground">Current: {student.credits} credit{student.credits === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="min-w-[44px] min-h-[44px] text-2xl text-[#6b6b6b]">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Change by</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDelta('-1')} className="min-h-[44px] px-3 rounded-lg border border-[#e5e2dc] text-sm hover:border-[#c9a96e]">−1</button>
              <button type="button" onClick={() => setDelta('1')} className="min-h-[44px] px-3 rounded-lg border border-[#e5e2dc] text-sm hover:border-[#c9a96e]">+1</button>
              <button type="button" onClick={() => setDelta('5')} className="min-h-[44px] px-3 rounded-lg border border-[#e5e2dc] text-sm hover:border-[#c9a96e]">+5</button>
              <button type="button" onClick={() => setDelta('10')} className="min-h-[44px] px-3 rounded-lg border border-[#e5e2dc] text-sm hover:border-[#c9a96e]">+10</button>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="±N"
                className="flex-1 min-w-[80px] h-12 px-3 rounded-lg border border-[#e5e2dc] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">New balance: {student.credits + (parseInt(delta, 10) || 0)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={280}
              rows={3}
              placeholder="e.g. Cash payment 5/7 for 5-pack"
              className="w-full px-3 py-2 rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent resize-none"
            />
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Save adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
