'use client';

import { useState } from 'react';

export function SendTestEmailsButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [target, setTarget] = useState('chelsea@maningomethod.com');

  async function send() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setResult('Enter a valid email.');
      return;
    }
    setBusy(true);
    setResult(null);
    const res = await fetch('/api/admin/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: target }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setResult(body?.error?.message || `Failed (${res.status}).`);
      return;
    }
    const data = await res.json();
    setResult(`Sent ${data.sent}/${data.total} templates to ${data.to}.`);
  }

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
      <p className="text-sm font-semibold mb-1">Send all email templates</p>
      <p className="text-xs text-[#6b6b6b] mb-3">
        Fires every transactional template once with synthetic data so you can review the styling
        and content. Useful for QA after copy/branding changes.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-10 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm flex-1 min-w-[220px]"
          placeholder="chelsea@maningomethod.com"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Send test emails'}
        </button>
      </div>
      {result && <p className="text-xs text-[#6b6b6b] mt-2">{result}</p>}
    </div>
  );
}
