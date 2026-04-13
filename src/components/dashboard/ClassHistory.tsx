import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatStudioDateTime } from '@/lib/timezone';

interface HistoryBooking {
  id: string;
  class_title: string;
  class_starts_at: string;
  status: string;
}

export function ClassHistory({ bookings }: { bookings: HistoryBooking[] }) {
  if (bookings.length === 0) {
    return <EmptyState title="No class history yet" description="Book a class and your history will appear here." />;
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <Card key={b.id}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{b.class_title}</p>
              <p className="text-xs text-muted-foreground">
                {formatStudioDateTime(b.class_starts_at)}
              </p>
            </div>
            <Badge variant={b.status === 'cancelled' ? 'error' : 'success'}>
              {b.status === 'cancelled' ? 'Cancelled' : 'Attended'}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
