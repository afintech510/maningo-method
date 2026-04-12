import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'student' | 'admin';
  stripe_customer_id: string | null;
};

export type AuthResult = {
  user: UserProfile;
} | null;

export async function getAuth(): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return null;

    return { user: profile as UserProfile };
  } catch (err) {
    logger.error({ err }, 'Auth check failed');
    return null;
  }
}

export async function requireAuth(role?: 'student' | 'admin') {
  const auth = await getAuth();

  if (!auth) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Please log in to continue.' } },
      { status: 401 }
    );
  }

  if (role === 'admin' && auth.user.role !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: "You don't have access to this." } },
      { status: 403 }
    );
  }

  return auth;
}

export function isAuthError(result: NextResponse | AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}
