'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatStudioDateTime, STUDIO_TIMEZONE } from '@/lib/timezone';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

interface Enrollment {
  booking_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  payment_type: string;
  status: string;
  booked_at: string;
}

interface WaitlistEntry {
  id: string;
  position: number;
  student_id: string;
  student_name: string;
  student_email: string;
  credits: number;
  created_at: string;
}

interface ClassData {
  class_title: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
}

export default function AdminClassDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);

  function fetchWaitlist() {
    setWaitlistLoading(true);
    fetch(`/api/admin/classes/${id}/waitlist`)
      .then((res) => res.json())
      .then((data) => {
        setWaitlist(data.waitlist || []);
        setWaitlistLoading(false);
      })
      .catch(() => setWaitlistLoading(false));
  }

  useEffect(() => {
    fetch(`/api/admin/classes/${id}/enrollments`)
      .then((res) => res.json())
      .then((data) => {
        setClassData({
          class_title: data.class_title,
          starts_at: data.starts_at,
          duration_minutes: data.duration_minutes ?? 50,
          max_capacity: data.max_capacity,
        });
        setEnrollments(data.enrollments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetchWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/admin/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    if (res.ok) {
      router.push('/admin/classes/manage');
    } else {
      setCancelling(false);
      setShowCancel(false);
    }
  }

  if (loading || !classData) {
    return (
      <div className="px-4 py-6">
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{classData.class_title}</h1>
      <p className="text-muted-foreground mb-1">
        {formatStudioDateTime(classData.starts_at)}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {classData.duration_minutes} min &middot; {enrollments.length}/{classData.max_capacity} booked
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
          Edit
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowNotify(true)}>
          Email Class
        </Button>
        <a
          href={`/admin/classes/${id}/attendance`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-[#e5e2dc] bg-white text-sm font-medium text-[#1a1a1a] hover:border-[#c9a96e] transition-colors"
        >
          Print Attendance
        </a>
        <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
          Cancel Class
        </Button>
      </div>

      <h2 className="text-lg font-semibold mb-3">
        Enrollment ({enrollments.length}/{classData.max_capacity})
      </h2>

      {enrollments.length === 0 ? (
        <EmptyState title="No students booked yet" />
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <Card key={e.booking_id}>
              <p className="font-medium">{e.student_name}</p>
              <p className="text-sm text-muted-foreground break-all">{e.student_email}</p>
              {e.student_phone && (
                <a href={`tel:${e.student_phone}`} className="text-sm text-primary hover:underline">
                  {e.student_phone}
                </a>
              )}
              <div className="mt-1">
                <Badge variant="neutral">{e.payment_type}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <WaitlistPanel
        waitlist={waitlist}
        loading={waitlistLoading}
        onRefresh={() => {
          fetchWaitlist();
          // Re-fetch enrollments too since a promote creates a booking
          fetch(`/api/admin/classes/${id}/enrollments`)
            .then((res) => res.json())
            .then((data) => {
              setEnrollments(data.enrollments || []);
            });
        }}
      />

      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Class">
        <p className="text-sm text-muted-foreground mb-4">
          This will cancel all bookings and notify students. Drop-in students will receive a refund report.
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" className="flex-1" onClick={handleCancel} loading={cancelling}>
            Cancel Class
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setShowCancel(false)}>
            Keep Class
          </Button>
        </div>
      </Modal>

      <EditClassModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        classId={String(id)}
        currentEnrolled={enrollments.length}
        initial={classData}
        onSaved={(next) => {
          setClassData(next);
          setShowEdit(false);
        }}
      />

      <NotifyClassModal
        open={showNotify}
        onClose={() => setShowNotify(false)}
        classId={String(id)}
        recipientCount={enrollments.length}
      />
    </div>
  );
}

function EditClassModal({
  open,
  onClose,
  classId,
  initial,
  currentEnrolled,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  initial: ClassData;
  currentEnrolled: number;
  onSaved: (next: ClassData) => void;
}) {
  // Convert UTC starts_at -> studio-local "YYYY-MM-DDTHH:mm" for datetime-local input
  const initialLocal = useMemo(() => {
    const z = toZonedTime(new Date(initial.starts_at), STUDIO_TIMEZONE);
    return format(z, "yyyy-MM-dd'T'HH:mm");
  }, [initial.starts_at]);

  const [title, setTitle] = useState(initial.class_title);
  const [startsAtLocal, setStartsAtLocal] = useState(initialLocal);
  const [duration, setDuration] = useState(initial.duration_minutes);
  const [capacity, setCapacity] = useState(initial.max_capacity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when modal reopens with fresh data
  useEffect(() => {
    if (open) {
      setTitle(initial.class_title);
      setStartsAtLocal(initialLocal);
      setDuration(initial.duration_minutes);
      setCapacity(initial.max_capacity);
      setError(null);
    }
  }, [open, initial, initialLocal]);

  async function handleSave() {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (duration < 10 || duration > 240) return setError('Duration must be 10–240 min.');
    if (capacity < 1 || capacity > 200) return setError('Capacity must be 1–200.');
    if (capacity < currentEnrolled) {
      return setError(`Capacity can't be below current enrollment (${currentEnrolled}).`);
    }

    // Parse datetime-local as a wall-clock studio time, then convert to UTC ISO
    let startsAtIso: string;
    try {
      const utc = fromZonedTime(startsAtLocal, STUDIO_TIMEZONE);
      if (isNaN(utc.getTime())) throw new Error('bad date');
      startsAtIso = utc.toISOString();
    } catch {
      return setError('Invalid date/time.');
    }

    setSaving(true);
    const res = await fetch(`/api/admin/classes/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        starts_at: startsAtIso,
        duration_minutes: duration,
        max_capacity: capacity,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Failed to save.');
      return;
    }

    onSaved({
      class_title: title.trim(),
      starts_at: startsAtIso,
      duration_minutes: duration,
      max_capacity: capacity,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Class">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">
            Date &amp; time (studio time, ET)
          </span>
          <input
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Duration (min)</span>
            <input
              type="number"
              min={10}
              max={240}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Max capacity</span>
            <input
              type="number"
              min={1}
              max={200}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving}>
            Save changes
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function NotifyClassModal({
  open,
  onClose,
  classId,
  recipientCount,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  recipientCount: number;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setError(null);
      setSentCount(null);
    }
  }, [open]);

  async function handleSend() {
    setError(null);
    if (!subject.trim() || !message.trim()) {
      return setError('Subject and message are both required.');
    }

    setSending(true);
    const res = await fetch(`/api/admin/classes/${classId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });
    setSending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Failed to send.');
      return;
    }
    const data = await res.json();
    setSentCount(data.sent ?? 0);
  }

  return (
    <Modal open={open} onClose={onClose} title="Email Class">
      {sentCount !== null ? (
        <div className="space-y-3">
          <p className="text-sm">
            {sentCount === 0
              ? 'No recipients — no one is booked yet.'
              : `Sent to ${sentCount} student${sentCount === 1 ? '' : 's'}.`}
          </p>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#6b6b6b]">
            Sends to all {recipientCount} booked student{recipientCount === 1 ? '' : 's'}.
            Plain-text message, line breaks preserved.
          </p>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={140}
              placeholder="Quick update on Saturday's class"
              className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              rows={6}
              placeholder="Hey! Just a heads-up that…"
              className="mt-1 w-full rounded-lg border border-[#e5e2dc] px-3 py-2 text-sm bg-white"
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSend}
              loading={sending}
              disabled={recipientCount === 0}
            >
              Send to {recipientCount}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function WaitlistPanel({
  waitlist,
  loading,
  onRefresh,
}: {
  waitlist: WaitlistEntry[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [promoting, setPromoting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePromote(entryId: string) {
    setPromoting(entryId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}/promote`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Promotion failed.');
      } else {
        onRefresh();
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setPromoting(null);
    }
  }

  async function handleRemove(entryId: string) {
    setRemoving(entryId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Remove failed.');
      } else {
        onRefresh();
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Waitlist ({waitlist.length})</h2>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-800">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-700 hover:text-red-900 text-lg leading-none">&times;</button>
        </div>
      )}

      {loading ? (
        <Skeleton variant="card" />
      ) : waitlist.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one is on the waitlist.</p>
      ) : (
        <div className="space-y-2">
          {waitlist.map((entry) => (
            <Card key={entry.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">#{entry.position}</Badge>
                    <p className="font-medium truncate">{entry.student_name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{entry.student_email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.credits} credit{entry.credits !== 1 ? 's' : ''}
                    {entry.credits < 1 && (
                      <span className="text-amber-600 font-medium"> — no credit to promote</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePromote(entry.id)}
                    loading={promoting === entry.id}
                    disabled={entry.credits < 1 || !!promoting || !!removing}
                  >
                    Promote
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemove(entry.id)}
                    loading={removing === entry.id}
                    disabled={!!promoting || !!removing}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
