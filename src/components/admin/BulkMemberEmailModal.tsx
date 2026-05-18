'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface MemberLite {
  id: string;
  full_name: string | null;
  email: string;
  credits: number | null;
  last_attended_at: string | null;
}

interface Template {
  id: string;
  slug: string | null;
  name: string;
  subject: string;
  body: string;
}

const VARIABLE_CHIPS: ReadonlyArray<{ key: string; hint: string }> = [
  { key: 'first_name', hint: 'Alex' },
  { key: 'credits', hint: '5' },
  { key: 'schedule_url', hint: '/schedule' },
  { key: 'waiver_url', hint: '/waiver/sign' },
  { key: 'packs_url', hint: '/dashboard' },
  { key: 'weeks_since_last_attended', hint: '3' },
  { key: 'last_attended_date', hint: 'Apr 7' },
];

interface BulkMemberEmailModalProps {
  members: MemberLite[]; // the selected members
  onClose: () => void;
}

export function BulkMemberEmailModal({ members, onClose }: BulkMemberEmailModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [minWeeksInactive, setMinWeeksInactive] = useState(0);
  const [minCredits, setMinCredits] = useState(0);

  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState<false | 'overwrite' | 'new'>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sent: number;
    attempted: number;
    failed: Array<{ member_id: string; reason?: string }>;
    skipped: Array<{ member_id: string; reason: string }>;
  } | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Load templates on mount.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/email-templates')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: Template[] = d?.templates || [];
        setTemplates(list);
        // Default to the first non-blank template if available.
        const first =
          list.find((t) => t.slug === 'waiver_reminder') ||
          list[0] ||
          null;
        if (first) {
          setSelectedTemplateId(first.id);
          setSubject(first.subject);
          setBody(first.body);
        }
        setLoadingTemplates(false);
      })
      .catch(() => {
        setLoadingTemplates(false);
        setError('Could not load templates.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered recipient list.
  const matched = useMemo(() => {
    const cutoffMs =
      minWeeksInactive > 0
        ? Date.now() - minWeeksInactive * 7 * 24 * 60 * 60 * 1000
        : null;
    return members.filter((m) => {
      if (minCredits > 0 && (m.credits ?? 0) < minCredits) return false;
      if (cutoffMs !== null) {
        const t = m.last_attended_at ? new Date(m.last_attended_at).getTime() : 0;
        // 0 means never-attended → counts as inactive.
        if (t === 0) return true;
        if (t > cutoffMs) return false;
      }
      return true;
    });
  }, [members, minWeeksInactive, minCredits]);

  function pickTemplate(id: string) {
    setSelectedTemplateId(id);
    setStatus(null);
    setError(null);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  function insertVariable(key: string) {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    // Restore cursor right after the inserted token on next tick.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function handleSaveOverwrite() {
    if (!selectedTemplateId) return;
    setSaving('overwrite');
    setError(null);
    setStatus(null);
    const res = await fetch(`/api/admin/email-templates/${selectedTemplateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error?.message || 'Could not save template.');
      return;
    }
    const d = await res.json();
    setTemplates((list) =>
      list.map((t) => (t.id === selectedTemplateId ? d.template : t)),
    );
    setStatus('Template saved.');
  }

  async function handleSaveAsNew() {
    const name = window.prompt('Name for the new template?', '');
    if (!name?.trim()) return;
    setSaving('new');
    setError(null);
    setStatus(null);
    const res = await fetch('/api/admin/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), subject, body }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error?.message || 'Could not create template.');
      return;
    }
    const d = await res.json();
    setTemplates((list) => [d.template, ...list]);
    setSelectedTemplateId(d.template.id);
    setStatus(`Saved as "${d.template.name}".`);
  }

  async function handleSend() {
    if (matched.length === 0) {
      setError('No recipients match the current filters.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required.');
      return;
    }
    if (
      !window.confirm(
        `Send to ${matched.length} member${matched.length === 1 ? '' : 's'}? This can't be undone.`,
      )
    ) {
      return;
    }
    setSending(true);
    setError(null);
    setStatus(null);
    const res = await fetch('/api/admin/members/bulk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_ids: matched.map((m) => m.id),
        subject,
        body,
      }),
    });
    setSending(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error?.message || 'Send failed.');
      return;
    }
    const d = await res.json();
    setResult({
      sent: d.sent || 0,
      attempted: d.attempted || matched.length,
      failed: d.failed || [],
      skipped: d.skipped || [],
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#e5e2dc] p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Bulk email</p>
            <p className="font-semibold">
              {result
                ? 'Send results'
                : `${members.length} member${members.length === 1 ? '' : 's'} selected`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] text-2xl text-[#6b6b6b]"
          >
            ×
          </button>
        </div>

        {result ? (
          <ResultPanel result={result} members={members} onClose={onClose} />
        ) : (
          <div className="space-y-4">
            {/* Template picker */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Template</span>
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => pickTemplate(e.target.value)}
                disabled={loadingTemplates}
                className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
              >
                {loadingTemplates && <option>Loading…</option>}
                {!loadingTemplates && templates.length === 0 && <option>No templates</option>}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Filter section */}
            <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-3 space-y-3">
              <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">
                Narrow recipients
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Inactive for ≥ N weeks</span>
                  <input
                    type="number"
                    min={0}
                    max={208}
                    value={minWeeksInactive}
                    onChange={(e) => setMinWeeksInactive(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="mt-1 w-full h-10 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Min credits balance</span>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={minCredits}
                    onChange={(e) => setMinCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="mt-1 w-full h-10 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-[#2d2d2d]">{matched.length}</strong> of {members.length} selected match — only these will receive the email.
              </p>
            </div>

            {/* Subject */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="e.g. Quick step before your first class"
                className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
              />
            </label>

            {/* Variable chips */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">
                Insert variable
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_CHIPS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => insertVariable(c.key)}
                    className="min-h-[32px] px-2.5 rounded-full text-[11px] font-medium border border-[#e5e2dc] bg-white text-[#1a1a1a] hover:border-[#c9a96e]"
                    title={`Example: ${c.hint}`}
                  >
                    {'{{' + c.key + '}}'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Message</span>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                maxLength={20000}
                placeholder="Write your message — newlines are preserved."
                className="mt-1 w-full rounded-lg border border-[#e5e2dc] bg-white px-3 py-2 text-sm font-mono"
              />
            </label>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
            )}
            {status && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                {status}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || matched.length === 0}
                className="flex-1 h-11 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] disabled:opacity-60"
              >
                {sending ? 'Sending…' : `Send to ${matched.length}`}
              </button>
              <button
                type="button"
                onClick={handleSaveOverwrite}
                disabled={!selectedTemplateId || saving !== false}
                className="h-11 px-4 rounded-full border border-[#e5e2dc] bg-white text-sm font-medium text-[#1a1a1a] hover:border-[#c9a96e] disabled:opacity-60"
              >
                {saving === 'overwrite' ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleSaveAsNew}
                disabled={saving !== false}
                className="h-11 px-4 rounded-full border border-[#e5e2dc] bg-white text-sm font-medium text-[#1a1a1a] hover:border-[#c9a96e] disabled:opacity-60"
              >
                {saving === 'new' ? 'Saving…' : 'Save as new'}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Members who have opted out of marketing email are filtered out by the server even
              if they match the filters above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  members,
  onClose,
}: {
  result: {
    sent: number;
    attempted: number;
    failed: Array<{ member_id: string; reason?: string }>;
    skipped: Array<{ member_id: string; reason: string }>;
  };
  members: MemberLite[];
  onClose: () => void;
}) {
  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    return m ? `${m.full_name || m.email}` : id;
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">
          Sent {result.sent} of {result.attempted}.
        </p>
        {result.skipped.length > 0 && (
          <p className="text-xs text-emerald-900/80 mt-1">
            {result.skipped.length} skipped (opted out / no email).
          </p>
        )}
      </div>
      {result.failed.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold mb-1">{result.failed.length} failed:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {result.failed.map((f) => (
              <li key={f.member_id}>
                <span className="font-medium">{nameOf(f.member_id)}</span>
                {f.reason ? ` — ${f.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.skipped.length > 0 && (
        <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-4 text-sm text-muted-foreground">
          <p className="font-semibold mb-1 text-[#1a1a1a]">{result.skipped.length} skipped:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {result.skipped.map((s) => (
              <li key={s.member_id}>
                <span className="font-medium text-[#1a1a1a]">{nameOf(s.member_id)}</span> — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="w-full h-11 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d]"
      >
        Done
      </button>
    </div>
  );
}
