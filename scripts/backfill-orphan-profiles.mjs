// Find auth.users without a matching profiles row and create them.
// Reads VPS env from /opt/maningo-method/.env (or NPM_LOCAL_ENV pointing elsewhere).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envPath = process.env.LOCAL_ENV_FILE || '/opt/maningo-method/.env';
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log('Listing auth users…');
const { data: usersResp, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (usersErr) {
  console.error('Failed to list users:', usersErr.message);
  process.exit(1);
}
const users = usersResp.users;
console.log(`Found ${users.length} auth users`);

const { data: profiles } = await supabase.from('profiles').select('id, email');
const profileIds = new Set((profiles || []).map((p) => p.id));

const orphans = users.filter((u) => !profileIds.has(u.id));
console.log(`Orphan auth users without profiles: ${orphans.length}`);

for (const u of orphans) {
  const fullName = u.user_metadata?.full_name || '';
  const phone = u.user_metadata?.phone || null;
  const referralCode = u.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: u.id,
      full_name: fullName,
      email: u.email,
      phone,
      role: 'student',
      referral_code: referralCode,
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.error(`✗ ${u.email}: ${error.message}`);
  } else {
    console.log(`✓ ${u.email} (${u.id})`);
  }
}

// Also fix any existing profile with placeholder email for an auth user we now know
const { data: placeholders } = await supabase
  .from('profiles')
  .select('id, email')
  .like('email', 'placeholder-%@example.invalid');

for (const p of placeholders || []) {
  const realUser = users.find((u) => u.id === p.id);
  if (realUser?.email && realUser.email !== p.email) {
    const fullName = realUser.user_metadata?.full_name || '';
    const phone = realUser.user_metadata?.phone || null;
    const { error } = await supabase
      .from('profiles')
      .update({ email: realUser.email, full_name: fullName, phone })
      .eq('id', p.id);
    if (error) {
      console.error(`✗ Reconcile ${p.id}: ${error.message}`);
    } else {
      console.log(`✓ Reconciled placeholder for ${realUser.email}`);
    }
  }
}

console.log('\nDone.');
