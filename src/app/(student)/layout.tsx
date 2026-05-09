import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
