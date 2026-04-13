import { Card } from '@/components/ui/Card';
import { SpotsIndicator } from '@/components/schedule/SpotsIndicator';
import { BookingButton } from '@/components/booking/BookingButton';
import { formatStudioTime } from '@/lib/timezone';

interface ClassCardProps {
  classData: {
    id: string;
    title: string;
    description?: string;
    starts_at: string;
    duration_minutes: number;
    max_capacity: number;
    spots_remaining: number;
  };
  isAuthenticated: boolean;
  hasCredits: boolean;
  bookedClassIds: string[];
}

export function ClassCard({
  classData,
  isAuthenticated,
  hasCredits,
  bookedClassIds,
}: ClassCardProps) {
  const isBooked = bookedClassIds.includes(classData.id);
  const isFull = classData.spots_remaining <= 0;

  return (
    <Card>
      <div className="flex justify-between items-start mb-1">
        <span className="text-lg font-semibold">
          {formatStudioTime(classData.starts_at)}
        </span>
        <SpotsIndicator
          remaining={classData.spots_remaining}
          total={classData.max_capacity}
        />
      </div>
      <p className="font-medium mb-0.5">{classData.title}</p>
      <p className="text-sm text-muted-foreground mb-4">
        {classData.duration_minutes} min
      </p>
      <BookingButton
        classId={classData.id}
        isFull={isFull}
        isBooked={isBooked}
        isAuthenticated={isAuthenticated}
        hasCredits={hasCredits}
      />
    </Card>
  );
}
