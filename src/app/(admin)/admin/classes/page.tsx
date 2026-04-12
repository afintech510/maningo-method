'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Link href="/admin/classes/new">
          <Button size="sm">+ New Class</Button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create your first class to get started."
          ctaLabel="Create Class"
          ctaHref="/admin/classes/new"
        />
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/admin/classes/${cls.id}`}>
              <Card className="hover:border-primary transition-colors">
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
