'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';

export interface WaitlistEntry {
  id: string;
  position: number;
  student_id: string;
  student_name: string;
  student_email: string;
  credits: number;
  created_at: string;
}

interface Props {
  waitlist: WaitlistEntry[];
  loading: boolean;
  onRefresh: () => void;
  compact?: boolean;
}

export function WaitlistPanel({ waitlist, loading, onRefresh, compact }: Props) {
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

  if (loading) return <Skeleton variant="card" />;

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-800">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-700 hover:text-red-900 text-lg leading-none">&times;</button>
        </div>
      )}

      {waitlist.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one is on the waitlist.</p>
      ) : (
        <div className="space-y-2">
          {waitlist.map((entry) => (
            <Card key={entry.id}>
              <div className={`flex items-center justify-between gap-3 ${compact ? 'py-0' : ''}`}>
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
