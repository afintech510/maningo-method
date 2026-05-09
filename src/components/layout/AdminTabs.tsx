'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/sales', label: 'Sales' },
  { href: '/admin/classes', label: 'Classes' },
  { href: '/admin/members', label: 'Members' },
];

export function AdminTabs() {
  const pathname = usePathname() || '';
  return (
    <nav className="border-b border-[#e5e2dc] bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active =
              pathname === t.href ||
              pathname.startsWith(`${t.href}/`) ||
              // /admin/schedule + /admin/manual-payments live under their parent tabs
              (t.href === '/admin/classes' && pathname.startsWith('/admin/schedule')) ||
              (t.href === '/admin/sales' && pathname.startsWith('/admin/manual-payments')) ||
              (t.href === '/admin/members' && pathname.startsWith('/admin/students'));
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`inline-flex items-center justify-center min-h-[44px] px-4 sm:px-5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    active
                      ? 'border-[#c9a96e] text-[#1a1a1a]'
                      : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]'
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
