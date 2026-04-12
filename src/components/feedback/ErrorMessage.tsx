'use client';

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Please log in to continue.',
  AUTH_EXPIRED: 'Session expired. Please log in again.',
  FORBIDDEN: "You don't have access to this.",
  CLASS_NOT_FOUND: "This class couldn't be found.",
  BOOKING_NOT_FOUND: "This booking couldn't be found.",
  CLASS_FULL: 'Sorry, this class is full!',
  ALREADY_BOOKED: "You're already booked for this class.",
  CLASS_CANCELLED: 'This class has been cancelled.',
  ALREADY_SUBSCRIBED: 'You already have an active subscription.',
  NO_ACTIVE_SUBSCRIPTION: 'Subscribe to book with your membership.',
  MAX_BOOKINGS_REACHED: "You've reached the max of 5 upcoming bookings. Cancel one to book another.",
  HAS_ACTIVE_BOOKINGS: 'This class has bookings. Cancel it instead.',
  STRIPE_ERROR: 'Payment system is temporarily unavailable. Try again in a moment.',
  RATE_LIMITED: 'Too many requests. Please try again in a moment.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
};

const RETRYABLE_ERRORS = new Set(['STRIPE_ERROR', 'RATE_LIMITED', 'INTERNAL_ERROR']);

interface ErrorMessageProps {
  error: string | { code: string; message?: string };
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  const code = typeof error === 'string' ? error : error.code;
  const message = typeof error === 'string'
    ? ERROR_MESSAGES[error] || error
    : error.message || ERROR_MESSAGES[error.code] || 'Something went wrong.';

  const canRetry = RETRYABLE_ERRORS.has(code) && onRetry;

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4" role="alert">
      <p className="text-sm text-red-800">{message}</p>
      {canRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline min-h-[44px]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
