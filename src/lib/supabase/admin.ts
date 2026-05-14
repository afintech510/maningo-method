import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Next.js App Router patches the global fetch to memoize responses by
      // URL + body in its data cache. Without opting out, Supabase reads from
      // admin pages (revenue totals, pending counts, etc.) can serve a
      // previous request's payload — so a fresh purchase doesn't show up
      // until something invalidates the cache. Admin reads should always be
      // live; force every query through cache:'no-store'.
      global: {
        fetch: (input, init) =>
          fetch(input as RequestInfo, { ...init, cache: 'no-store' }),
      },
    }
  );
}
