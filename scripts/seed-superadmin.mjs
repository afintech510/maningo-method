// One-off seed: create or upgrade adam@benchworksai.com to a superadmin profile.
// Run on the VPS (or anywhere with the prod .env loaded):
//   node scripts/seed-superadmin.mjs
//
// If the auth user doesn't exist we create one and trigger Supabase's
// recovery email so Adam sets his own password.

import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'adam@benchworksai.com';
const FULL_NAME = 'Adam Larkin';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maningomethod.com';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findAuthUserByEmail(email) {
  // listUsers paginates; for ~hundreds of users a single page is fine.
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function main() {
  let user = await findAuthUserByEmail(ADMIN_EMAIL);
  if (!user) {
    console.log(`Creating auth user ${ADMIN_EMAIL}...`);
    const { data, error } = await sb.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (error) throw error;
    user = data.user;
    // Send recovery email so Adam can set his own password.
    const { error: resetErr } = await sb.auth.resetPasswordForEmail(ADMIN_EMAIL, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    if (resetErr) {
      console.warn('Auth user created but recovery email failed:', resetErr.message);
    } else {
      console.log('Recovery email sent.');
    }
  } else {
    console.log(`Auth user exists: ${user.id}`);
  }

  // Upsert profile.
  const { error: upsertErr } = await sb
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name: FULL_NAME,
        email: ADMIN_EMAIL,
        role: 'superadmin',
      },
      { onConflict: 'id' },
    );
  if (upsertErr) throw upsertErr;

  console.log(`Profile upserted with role='superadmin'. Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
