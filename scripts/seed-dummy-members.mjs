// One-off seed: create two reusable "placeholder" member accounts that
// Chelsea can add to a class to hold a spot (via Admin > Classes > roster >
// "Comp seat"). Run on the VPS (or anywhere with the prod .env loaded):
//   node scripts/seed-dummy-members.mjs
//
// Idempotent: re-running reuses the existing auth users and just re-upserts
// their profiles. No emails are sent (email_confirm is set; no password reset).
//
// These are NOT real people. Names are chosen so they read clearly on a class
// roster. Waiver is marked signed so adding them to a class doesn't trip the
// "member has NOT signed the waiver" override prompt. Credits are 0 — hold
// spots with the "Comp seat" option, which consumes nothing.

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const TOS_VERSION = '2026-05-05'; // keep in sync with src/app/api/auth/register/route.ts

const MEMBERS = [
  { full_name: 'Hold Spot 1', email: 'holdspot1@maningomethod.com', phone: '(631) 555-0001' },
  { full_name: 'Hold Spot 2', email: 'holdspot2@maningomethod.com', phone: '(631) 555-0002' },
];

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

async function seedMember({ full_name, email, phone }) {
  let user = await findAuthUserByEmail(email);
  if (!user) {
    console.log(`Creating auth user ${email}...`);
    const { data, error } = await sb.auth.admin.createUser({
      email,
      // Nobody signs in as these accounts; set a random throwaway password.
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });
    if (error) throw error;
    user = data.user;
  } else {
    console.log(`Auth user exists: ${email} (${user.id})`);
  }

  const now = new Date().toISOString();
  const referralCode = user.id.replace(/-/g, '').slice(0, 8).toUpperCase();

  const { error: upsertErr } = await sb.from('profiles').upsert(
    {
      id: user.id,
      full_name,
      email,
      phone,
      role: 'student',
      credits: 0,
      referral_code: referralCode,
      tos_accepted_at: now,
      tos_version: TOS_VERSION,
      // Mark the waiver done so the roster "Add a member" flow doesn't prompt
      // for a waiver override every time.
      waiver_acknowledged: true,
      waiver_signed_at: now,
    },
    { onConflict: 'id' },
  );
  if (upsertErr) throw upsertErr;

  console.log(`  -> profile upserted: ${full_name} <${email}>`);
}

async function main() {
  for (const m of MEMBERS) {
    await seedMember(m);
  }
  console.log('Done. Add them to a class via Admin > Classes > [class] > Roster > "Comp seat".');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
