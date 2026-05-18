import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { RentLedger } from '@/components/admin/RentLedger';

export default async function AdminStudioPage() {
  const auth = await getAuth();
  if (!auth) redirect('/login');
  if (auth.user.role !== 'admin' && auth.user.role !== 'superadmin') redirect('/dashboard');
  const isSuperadmin = auth.user.role === 'superadmin';

  return <RentLedger isSuperadmin={isSuperadmin} />;
}
