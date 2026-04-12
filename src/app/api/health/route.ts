import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: error ? 'error' : 'connected',
    });
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString(), db: 'error' },
      { status: 503 }
    );
  }
}
