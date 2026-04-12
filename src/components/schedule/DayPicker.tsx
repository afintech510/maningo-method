'use client';

import { cn } from '@/lib/utils';
import { format, addDays, isSameDay } from 'date-fns';
import { useState } from 'react';

interface DayPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function DayPicker({ selectedDate, onSelectDate }: DayPickerProps) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const startDay = addDays(today, weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDay, i));

  const monthLabel = format(days[0], 'MMMM yyyy');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous week"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Next week"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isPast && onSelectDate(day)}
              disabled={isPast}
              className={cn(
                'flex flex-col items-center justify-center h-16 rounded-xl text-sm transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isPast
                    ? 'opacity-30 cursor-not-allowed'
                    : 'bg-white border border-border hover:bg-muted',
                isToday && !isSelected && 'border-accent border-2'
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {format(day, 'EEE')}
              </span>
              <span className="text-lg font-bold leading-tight">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
