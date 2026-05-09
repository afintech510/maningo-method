'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Schedule', href: '/schedule', icon: CalendarIcon, match: ['/schedule'] },
  { label: 'My Classes', href: '/dashboard', icon: UserIcon, match: ['/dashboard'] },
  { label: 'Private', href: '/#contact', icon: StarIcon, match: ['/#contact'] },
  { label: 'Buy Credits', href: '/#pricing', icon: DollarIcon, match: ['/#pricing'] },
];

export function MobileNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border lg:hidden safe-bottom">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.some(
            (m) => pathname === m || (m !== '/#contact' && m !== '/#pricing' && pathname.startsWith(`${m}/`))
          );
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-0.5 text-xs transition-colors min-w-[44px] min-h-[44px]',
                isActive ? 'text-[#c9a96e] font-medium' : 'text-muted-foreground'
              )}
              aria-label={item.label}
            >
              <item.icon filled={isActive} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function CalendarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function UserIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DollarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
