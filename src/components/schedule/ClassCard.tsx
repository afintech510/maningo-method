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
  credits?: number;
  /** Booking id when the current user has booked this class. */
  bookingId?: string;
}

export function ClassCard({
  classData,
  isAuthenticated,
  hasCredits,
  credits,
  bookingId,
}: ClassCardProps) {
  const isBooked = !!bookingId;
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
      <p className="text-sm text-muted-foreground mb-2">
        {classData.duration_minutes} min
      </p>
      <div className="flex items-start gap-2 mb-4 text-xs text-muted-foreground">
        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>
          <span className="font-medium text-foreground">Maningo Method</span>
          <br />295 Montauk Hwy, Suite 7, Speonk, NY
        </span>
      </div>
      <BookingButton
        classId={classData.id}
        isFull={isFull}
        isBooked={isBooked}
        isAuthenticated={isAuthenticated}
        hasCredits={hasCredits}
        credits={credits}
        bookingId={bookingId}
        classTitle={classData.title}
        classStartsAt={classData.starts_at}
        classDurationMinutes={classData.duration_minutes}
        classSpotsRemaining={classData.spots_remaining}
      />
    </Card>
  );
}
