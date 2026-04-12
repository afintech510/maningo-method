import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  let profile = null;
  let profileError = null;
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
    profileError = error;
  }

  return NextResponse.json({
    cookies: allCookies.map(c => ({ name: c.name, length: c.value.length })),
    user: user ? { id: user.id, email: user.email } : null,
    authError: authError?.message || null,
    profile,
    profileError: profileError?.message || null,
  });
}
