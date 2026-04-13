import Link from 'next/link';
import { getAuth } from '@/lib/auth';

export async function Header() {
  const auth = await getAuth();
  const isLoggedIn = !!auth;

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-white">
      <Link href="/" className="text-xl font-serif font-bold tracking-tight">
        Maningo Method
      </Link>
      <nav className="hidden lg:flex items-center gap-6 text-sm">
        <Link href="/schedule" className="text-muted-foreground hover:text-foreground transition-colors">
          Schedule
        </Link>
        <Link href="/#contact" className="text-muted-foreground hover:text-foreground transition-colors">
          Private Class
        </Link>
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] transition-colors"
            >
              Members
            </Link>
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Book Class
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
