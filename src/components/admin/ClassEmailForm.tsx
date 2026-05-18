'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  classId: string;
  recipientCount: number;
}

export function ClassEmailForm({ classId, recipientCount }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  async function handleSend() {
    setError(null);
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are both required.');
      return;
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
    setSubject('');
    setMessage('');
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Email this class</h3>
      <p className="text-xs text-muted-foreground">
        Sends to all {recipientCount} booked student{recipientCount === 1 ? '' : 's'}.
        Plain-text body, line breaks preserved.
      </p>

      {sentCount !== null && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          {sentCount === 0 ? 'No recipients — no one is booked yet.' : `Sent to ${sentCount} student${sentCount === 1 ? '' : 's'}.`}
        </div>
      )}

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
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <Button
        onClick={handleSend}
        loading={sending}
        disabled={recipientCount === 0 || !subject.trim() || !message.trim()}
      >
        Send to {recipientCount}
      </Button>
    </div>
  );
}
