import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();

  if (!auth) {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">{children}</main>
      <MobileNav />
    </>
  );
}
