import Link from 'next/link';

export function Header() {
  return (
    <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-white">
      <Link href="/" className="text-xl font-serif font-bold tracking-tight">
        Maningo Method
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/schedule" className="text-muted-foreground hover:text-foreground transition-colors">
          Schedule
        </Link>
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          My Classes
        </Link>
        <Link href="/subscription" className="text-muted-foreground hover:text-foreground transition-colors">
          Subscribe
        </Link>
        <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
          Account
        </Link>
      </nav>
    </header>
  );
}
