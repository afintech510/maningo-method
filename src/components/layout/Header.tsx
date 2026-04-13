import Link from 'next/link';
import { getAuth } from '@/lib/auth';

export async function Header() {
  const auth = await getAuth();
  const isLoggedIn = !!auth;

  return (
    <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-white">
      <Link href="/" className="text-xl font-serif font-bold tracking-tight">
        Maningo Method
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/schedule" className="text-muted-foreground hover:text-foreground transition-colors">
          Schedule
        </Link>
        <Link href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
          Private Class
        </Link>
        {isLoggedIn ? (
          <>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              My Classes
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
