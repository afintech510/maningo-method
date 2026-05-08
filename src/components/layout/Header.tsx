import Link from 'next/link';
import Image from 'next/image';
import { getAuth } from '@/lib/auth';
import { BackButton } from '@/components/layout/BackButton';

export async function Header() {
  const auth = await getAuth();
  const isLoggedIn = !!auth;
  const isAdmin = auth?.user?.role === 'admin';
  const homeHref = isAdmin ? '/admin' : isLoggedIn ? '/dashboard' : '/';

  return (
    <header className="border-b border-border bg-white">
      <div className="relative flex items-center justify-center px-5 py-3 min-h-[64px]">
        <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2">
          <BackButton />
        </div>
        <Link href={homeHref} aria-label="Maningo Method home" className="block">
          <Image
            src="/maningo-method_logo_600.png"
            alt="Maningo Method"
            width={600}
            height={180}
            priority
            className="h-10 sm:h-12 w-auto"
          />
        </Link>
        <nav className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3 text-sm">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center h-9 px-3 sm:px-4 rounded-full bg-[#2d2d2d] text-white text-xs sm:text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Admin
            </Link>
          )}
          {!isLoggedIn && (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center h-9 px-3 sm:px-4 rounded-full bg-[#c9a96e] text-white text-xs sm:text-sm font-medium hover:bg-[#b8955d] transition-colors"
              >
                Members
              </Link>
              <Link
                href="/schedule"
                className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                Book
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
