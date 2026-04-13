'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatStudioTime, formatStudioDate } from '@/lib/timezone';
import { addDays, format, startOfWeek } from 'date-fns';

interface ClassItem {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  spots_remaining: number;
  max_capacity: number;
}

export function WeeklySchedule() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);

    fetch(`/api/classes?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton variant="card" />;

  // Group by day
  const grouped: Record<string, ClassItem[]> = {};
  classes.forEach((cls) => {
    const day = format(new Date(cls.starts_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(cls);
  });

  const days = Object.keys(grouped).sort();

  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled this week.</p>;
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day}>
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            {formatStudioDate(day, 'EEEE, MMM d')}
          </p>
          <div className="space-y-2">
            {grouped[day].map((cls) => (
              <Card key={cls.id} className="py-3 px-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{cls.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatStudioTime(cls.starts_at)} &middot; {cls.duration_minutes} min
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${cls.spots_remaining <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                    {cls.spots_remaining} spots
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
