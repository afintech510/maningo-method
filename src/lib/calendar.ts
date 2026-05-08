// Calendar export helpers — Google Calendar URL + ICS file generation.

interface CalendarEvent {
  id: string;            // unique id (booking id)
  title: string;         // class title
  startsAt: string | Date;
  durationMinutes: number;
  location?: string;
  description?: string;
}

const STUDIO_LOCATION = 'Maningo Method · Host Hampton, 295 Montauk Highway, Suite 7, Speonk, NY 11972';
const STUDIO_DESCRIPTION = 'Maningo Method Pilates class. See dashboard at https://www.maningomethod.com/dashboard';

function toGoogleDateUtc(d: Date): string {
  // Format: 20260512T140000Z
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toGoogleDateUtc(start)}/${toGoogleDateUtc(end)}`,
    details: event.description || STUDIO_DESCRIPTION,
    location: event.location || STUDIO_LOCATION,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const dtstamp = toGoogleDateUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Maningo Method//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@maningomethod.com`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toGoogleDateUtc(start)}`,
    `DTEND:${toGoogleDateUtc(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description || STUDIO_DESCRIPTION)}`,
    `LOCATION:${escapeIcs(event.location || STUDIO_LOCATION)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Maningo Method class in 1 hour',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

/** ICS download URL hosted by our own /api/calendar/[bookingId].ics route. */
export function icsUrl(bookingId: string): string {
  return `/api/calendar/${encodeURIComponent(bookingId)}.ics`;
}
