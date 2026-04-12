import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();

  if (!auth) {
    redirect('/login');
  }

  if (auth.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white px-4 py-3">
        <h2 className="text-lg font-serif font-bold">Admin Panel</h2>
      </header>
      <main className="pb-16 lg:pb-0">{children}</main>
    </div>
  );
}
