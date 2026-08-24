import { Card } from '@/components/ui/Card';
import { CapacityBadge } from '@/components/ui/CapacityBadge';
import { BookingButton } from '@/components/booking/BookingButton';
import { formatStudioTime, formatStudioDate } from '@/lib/timezone';

interface ClassCardProps {
  classData: {
    id: string;
    title: string;
    description?: string;
    starts_at: string;
    duration_minutes: number;
    max_capacity: number;
    is_free?: boolean;
    spots_remaining: number;
    bookable?: boolean;
    bookable_from?: string;
  };
  isAuthenticated: boolean;
  hasCredits: boolean;
  credits?: number;
  /** Booking id when the current user has booked this class. */
  bookingId?: string;
  /** Active waitlist entry for this class, if any. */
  waitlistEntry?: { id: string; position: number };
  /** Path to return to after login — defaults to the schedule page. */
  returnTo?: string;
}

export function ClassCard({
  classData,
  isAuthenticated,
  hasCredits,
  credits,
  bookingId,
  waitlistEntry,
  returnTo,
}: ClassCardProps) {
  const isBooked = !!bookingId;
  const isFull = classData.spots_remaining <= 0;
  const isFree = !!classData.is_free;

  return (
    <Card>
      <div className="flex justify-between items-start mb-1">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b6b6b] font-medium">
            {formatStudioDate(classData.starts_at, 'EEE, MMM d')}
          </p>
          <span className="text-lg font-semibold">
            {formatStudioTime(classData.starts_at)}
          </span>
        </div>
        <CapacityBadge
          bookedCount={classData.max_capacity - classData.spots_remaining}
          capacity={classData.max_capacity}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-0.5">
        <p className="font-medium">{classData.title}</p>
        {isFree && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#c9a96e] bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-full px-2 py-0.5">
            Free · suggested $20 donation
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        {classData.duration_minutes} min
      </p>
      <div className="flex items-start gap-2 mb-4 text-xs text-muted-foreground">
        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {isFree ? (
          <span>{classData.description || 'Location details to follow'}</span>
        ) : (
          <span>
            <span className="font-medium text-foreground">Maningo Method</span>
            <br />295 Montauk Hwy, Suite 7, Speonk, NY
          </span>
        )}
      </div>
      <BookingButton
        classId={classData.id}
        isFull={isFull}
        isBooked={isBooked}
        isAuthenticated={isAuthenticated}
        hasCredits={hasCredits}
        isFree={isFree}
        location={classData.description}
        credits={credits}
        bookingId={bookingId}
        classTitle={classData.title}
        classStartsAt={classData.starts_at}
        classDurationMinutes={classData.duration_minutes}
        classSpotsRemaining={classData.spots_remaining}
        bookable={classData.bookable}
        bookableFrom={classData.bookable_from}
        waitlistEntry={waitlistEntry}
        returnTo={returnTo}
      />
    </Card>
  );
}
