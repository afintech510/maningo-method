import Link from 'next/link';
import {
  PURCHASES_CLOSED_MESSAGE,
  STUDIO_EMAIL,
  STUDIO_PHONE,
  STUDIO_PHONE_HREF,
} from '@/lib/purchases';

/**
 * Shown wherever a purchase action used to be while selling is switched off.
 * No client hooks, so it renders in server and client trees alike.
 *
 * `variant="inline"` is the compact form for slotting into a card or under a
 * pricing grid; `variant="page"` is the standalone form for /checkout/* and
 * /gift/new, which members can still reach from old links and bookmarks.
 */
export function PurchasesClosedNotice({
  variant = 'inline',
  className = '',
}: {
  variant?: 'inline' | 'page';
  className?: string;
}) {
  const contact = (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <a href={STUDIO_PHONE_HREF} className="text-[#c9a96e] font-medium hover:underline">
        {STUDIO_PHONE}
      </a>
      <span aria-hidden className="text-[#e5e2dc]">
        &middot;
      </span>
      <a href={`mailto:${STUDIO_EMAIL}`} className="text-[#c9a96e] font-medium hover:underline">
        {STUDIO_EMAIL}
      </a>
    </span>
  );

  if (variant === 'page') {
    return (
      <div className={`max-w-lg mx-auto px-5 py-16 text-center ${className}`}>
        <h1 className="text-2xl font-bold mb-3">{PURCHASES_CLOSED_MESSAGE}</h1>
        <p className="text-sm text-[#6b6b6b] mb-6">{contact}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] transition-colors"
          >
            Back to dashboard
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center h-11 px-6 rounded-full border border-[#e5e2dc] bg-white text-[#2d2d2d] text-sm font-medium hover:border-[#c9a96e] transition-colors"
          >
            View schedule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-4 sm:p-5 text-center ${className}`}
    >
      <p className="font-semibold text-sm sm:text-base">{PURCHASES_CLOSED_MESSAGE}</p>
      <p className="text-xs sm:text-sm text-[#6b6b6b] mt-1.5">{contact}</p>
    </div>
  );
}
