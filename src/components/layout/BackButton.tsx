'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface BackButtonProps {
  className?: string;
  /** Where to go when there's no usable history (default: '/') */
  fallbackHref?: string;
}

/**
 * Top-nav back arrow that never lets you off maningomethod.com.
 *
 * - Hidden by default; appears only after the user has at least one
 *   previous in-app page in their session-storage trail OR the document
 *   referrer is a same-origin URL.
 * - Hidden on the homepage (no useful "back" target).
 * - On click: pops the in-app trail and pushes to that path. If the
 *   trail is empty, falls back to history.back() if the referrer is
 *   same-origin, otherwise navigates to fallbackHref.
 *
 * The trail is maintained in sessionStorage on every render so we don't
 * accidentally back-navigate to an external referrer (e.g. social).
 */
export function BackButton({ className = '', fallbackHref = '/' }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  // Maintain a same-origin trail in sessionStorage. Push the current
  // path's predecessor into the trail.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = 'mm_nav_trail';
      const raw = sessionStorage.getItem(key);
      const trail: string[] = raw ? JSON.parse(raw) : [];

      const prev = trail[trail.length - 1];
      // Only push when the path actually changed
      if (prev !== pathname) {
        // The new path becomes the head; predecessor is what "back" returns to
        trail.push(pathname);
        // Cap trail length so sessionStorage doesn't grow forever
        if (trail.length > 30) trail.splice(0, trail.length - 30);
        sessionStorage.setItem(key, JSON.stringify(trail));
      }

      const hasInAppHistory = trail.length > 1;
      const referrerIsSameOrigin =
        !!document.referrer && document.referrer.startsWith(window.location.origin);
      // Never show on home — there's nothing useful to go back to.
      const isHome = pathname === '/';
      setShow(!isHome && (hasInAppHistory || referrerIsSameOrigin));
    } catch {
      // sessionStorage disabled / private mode — degrade silently
      setShow(false);
    }
  }, [pathname]);

  function handleClick() {
    try {
      const key = 'mm_nav_trail';
      const raw = sessionStorage.getItem(key);
      const trail: string[] = raw ? JSON.parse(raw) : [];
      // Pop the current page off, target = last remaining entry
      trail.pop();
      const target = trail[trail.length - 1];
      if (target && target !== pathname) {
        trail.pop(); // also remove target so the next push re-records it
        sessionStorage.setItem(key, JSON.stringify(trail));
        router.push(target);
        return;
      }
    } catch {
      /* fall through */
    }

    // Fallback: same-origin history.back, else fallbackHref
    if (
      typeof document !== 'undefined' &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Go back"
      className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#2d2d2d] hover:bg-[#faf9f6] transition-colors ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  );
}
