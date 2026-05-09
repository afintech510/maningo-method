'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatStudioDateTime } from '@/lib/timezone';

interface ClassItem {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
  status: string;
  booked_count: number;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/classes')
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Classes</h1>
        <Skeleton variant="card" />
        <Skeleton variant="card" className="mt-3" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Classes</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Manage classes</h1>
      </div>

      {/* Create actions */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Link
          href="/admin/schedule"
          className="rounded-2xl border-2 border-[#c9a96e] bg-[#c9a96e]/5 p-4 hover:bg-[#c9a96e]/10 transition-colors"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#c9a96e] mb-1">Create</p>
          <p className="font-semibold">Schedule classes</p>
          <p className="text-xs text-muted-foreground">Recurring weekly OR one-off &mdash; one form, batch generate.</p>
        </Link>
        <Link
          href="/admin/classes/new"
          className="rounded-2xl border border-[#e5e2dc] bg-white p-4 hover:border-[#c9a96e] transition-colors"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#6b6b6b] mb-1">Create</p>
          <p className="font-semibold">Single class (legacy form)</p>
          <p className="text-xs text-muted-foreground">Quick add a one-off class with the simple form.</p>
        </Link>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">Manage</h2>

      {classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create your first class to get started."
          ctaLabel="Schedule classes"
          ctaHref="/admin/schedule"
        />
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/admin/classes/${cls.id}`}>
              <Card className="hover:border-[#c9a96e] transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{cls.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatStudioDateTime(cls.starts_at)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {cls.booked_count}/{cls.max_capacity} booked
                    </p>
                  </div>
                  <Badge
                    variant={
                      cls.status === 'scheduled' ? 'success' :
                      cls.status === 'cancelled' ? 'error' : 'neutral'
                    }
                  >
                    {cls.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
