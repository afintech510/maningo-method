import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { AdminTabs } from '@/components/layout/AdminTabs';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();
  if (!auth) redirect('/login');
  if (auth.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#faf9f6] print:bg-white">
      <div className="print:hidden">
        <Header />
        <AdminTabs />
      </div>
      <main className="pb-12 print:pb-0">{children}</main>
    </div>
  );
}
