'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from './DayPicker';
import { ClassCard } from './ClassCard';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { format } from 'date-fns';

interface ClassData {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
  spots_remaining: number;
}

interface ClassScheduleProps {
  isAuthenticated: boolean;
  hasCredits: boolean;
  bookedClassIds: string[];
}

export function ClassSchedule({
  isAuthenticated,
  hasCredits,
  bookedClassIds,
}: ClassScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDate);
    to.setHours(23, 59, 59, 999);

    fetch(`/api/classes?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  return (
    <div>
      <DayPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </>
        ) : classes.length === 0 ? (
          <EmptyState
            title={`No classes on ${format(selectedDate, 'EEEE')}`}
            description="Check another day!"
          />
        ) : (
          classes.map((cls) => (
            <ClassCard
              key={cls.id}
              classData={cls}
              isAuthenticated={isAuthenticated}
              hasCredits={hasCredits}
              bookedClassIds={bookedClassIds}
            />
          ))
        )}
      </div>
    </div>
  );
}
