import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  // Service-role client — the route is already auth-gated, and RLS
  // (or its surrounding profile-join behaviour) was returning empty
  // enrollment lists for some sessions even when the booking count
  // pulled from the same table was non-zero.
  const supabase = createAdminClient();

  const { data: classData } = await supabase
    .from('classes')
    .select('id, title, starts_at, duration_minutes, max_capacity')
    .eq('id', params.id)
    .single();

  if (!classData) {
    return NextResponse.json(
      { error: { code: 'CLASS_NOT_FOUND', message: "This class couldn't be found." } },
      { status: 404 }
    );
  }

  // Disambiguate the profiles join — bookings has two FKs into profiles
  // (student_id and added_by_admin), so PostgREST refuses an unqualified
  // `profiles(…)` and returns null silently.
  const { data: enrollments } = await supabase
    .from('bookings')
    .select('id, payment_type, status, created_at, profiles!bookings_student_id_fkey(full_name, email, phone)')
    .eq('class_id', params.id)
    .in('status', ['pending', 'confirmed'])
    .order('created_at', { ascending: true });

  const result = (enrollments || []).map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (e as any).profiles;
    return {
      booking_id: e.id,
      student_name: profile?.full_name || '',
      student_email: profile?.email || '',
      student_phone: profile?.phone || null,
      payment_type: e.payment_type,
      status: e.status,
      booked_at: e.created_at,
    };
  });

  return NextResponse.json({
    class_id: classData.id,
    class_title: classData.title,
    starts_at: classData.starts_at,
    duration_minutes: classData.duration_minutes,
    max_capacity: classData.max_capacity,
    enrollments: result,
  });
}
