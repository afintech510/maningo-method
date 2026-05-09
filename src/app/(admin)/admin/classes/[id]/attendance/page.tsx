import { notFound } from 'next/navigation';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';
import { AutoPrint } from './auto-print';

export default async function AttendanceSheetPage({ params }: { params: { id: string } }) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

  const { data: classData } = await supabase
    .from('classes')
    .select('id, title, starts_at, duration_minutes, max_capacity')
    .eq('id', params.id)
    .single();

  if (!classData) notFound();

  const { data: enrollments } = await supabase
    .from('bookings')
    .select('id, payment_type, profiles(full_name, email, phone)')
    .eq('class_id', params.id)
    .in('status', ['pending', 'confirmed'])
    .order('created_at', { ascending: true });

  const rows = (enrollments || []).map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (e as any).profiles;
    return {
      booking_id: e.id,
      name: profile?.full_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      payment_type: e.payment_type,
    };
  });

  const dateLine = `${formatStudioDate(classData.starts_at, 'EEEE, MMMM d, yyyy')} · ${formatStudioTime(classData.starts_at)} · ${classData.duration_minutes} min`;

  return (
    <div className="bg-white text-black min-h-screen p-6 sm:p-10 print:p-0">
      <AutoPrint />

      <header className="mb-6 pb-4 border-b-2 border-black flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-600 mb-1">Attendance Sheet</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{classData.title}</h1>
          <p className="text-sm sm:text-base text-gray-700 mt-1">{dateLine}</p>
          <p className="text-sm text-gray-700">
            {rows.length} of {classData.max_capacity} booked
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Maningo Method</p>
          <p className="text-xs text-gray-600">295 Montauk Hwy, Speonk</p>
        </div>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2 px-2 w-8">#</th>
            <th className="text-left py-2 px-2">Name</th>
            <th className="text-left py-2 px-2 hidden sm:table-cell">Phone</th>
            <th className="text-left py-2 px-2 w-24">Type</th>
            <th className="text-left py-2 px-2 w-32">Signature</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.booking_id} className="border-b border-gray-300">
              <td className="py-3 px-2 align-top">{i + 1}</td>
              <td className="py-3 px-2 align-top">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-gray-600">{r.email}</div>
              </td>
              <td className="py-3 px-2 align-top hidden sm:table-cell">{r.phone}</td>
              <td className="py-3 px-2 align-top capitalize">{r.payment_type.replace('_', ' ')}</td>
              <td className="py-3 px-2 align-top">&nbsp;</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, classData.max_capacity - rows.length) }).map((_, i) => (
            <tr key={`blank-${i}`} className="border-b border-gray-300">
              <td className="py-3 px-2 text-gray-400">{rows.length + i + 1}</td>
              <td className="py-3 px-2">&nbsp;</td>
              <td className="py-3 px-2 hidden sm:table-cell">&nbsp;</td>
              <td className="py-3 px-2">&nbsp;</td>
              <td className="py-3 px-2">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-8 text-xs text-gray-600 print:hidden">
        Tip: this page auto-opens the print dialog. Adjust scaling and margins in your browser&rsquo;s print
        settings if rows clip.
      </footer>
    </div>
  );
}
