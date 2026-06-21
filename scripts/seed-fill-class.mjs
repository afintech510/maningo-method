// Fill a class to capacity with dummy members for waitlist testing.
//
// Usage:
//   node scripts/seed-fill-class.mjs --class <id|title-substring>
//   node scripts/seed-fill-class.mjs --next                     # picks the next upcoming scheduled class
//   node scripts/seed-fill-class.mjs --class "Mat Pilates" --count 5
//   node scripts/seed-fill-class.mjs --undo                     # remove ALL dummy accounts
//   node scripts/seed-fill-class.mjs --undo --class <id>        # remove dummies from one class
//   node scripts/seed-fill-class.mjs --dry-run --next           # preview without touching anything
//
// Dummy emails use the pattern dummy+<slug>-<n>@maningo-seed.invalid
// (.invalid TLD guarantees no real delivery). Cleanup (--undo) deletes
// auth users matching that pattern; FK cascades remove profiles + bookings.
//
// Env: reads LOCAL_ENV_FILE (default /opt/maningo-method/.env) for
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ── env ────────────────────────────────────────────────────────────
const envPath = process.env.LOCAL_ENV_FILE || '/opt/maningo-method/.env';
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const DUMMY_DOMAIN = 'maningo-seed.invalid';

// ── CLI args ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name) {
  return args.includes(`--${name}`);
}
function opt(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const classArg = opt('class');
const useNext = flag('next');
const countArg = opt('count');
const undo = flag('undo') || flag('cleanup');
const dryRun = flag('dry-run');

if (!classArg && !useNext && !undo) {
  console.error('Usage: node scripts/seed-fill-class.mjs --class <id|title> | --next [--count N] [--undo] [--dry-run]');
  process.exit(1);
}

// ── helpers ────────────────────────────────────────────────────────
async function resolveClass() {
  if (useNext) {
    const { data, error } = await sb
      .from('classes')
      .select('id, title, max_capacity, starts_at')
      .eq('status', 'scheduled')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .single();
    if (error || !data) {
      console.error('No upcoming scheduled class found.');
      process.exit(1);
    }
    return data;
  }

  // Try UUID first
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(classArg)) {
    const { data, error } = await sb
      .from('classes')
      .select('id, title, max_capacity, starts_at')
      .eq('id', classArg)
      .single();
    if (error || !data) {
      console.error(`Class ${classArg} not found.`);
      process.exit(1);
    }
    return data;
  }

  // Title substring match — pick the next upcoming one
  const { data, error } = await sb
    .from('classes')
    .select('id, title, max_capacity, starts_at')
    .eq('status', 'scheduled')
    .gt('starts_at', new Date().toISOString())
    .ilike('title', `%${classArg}%`)
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) {
    console.error(`No upcoming class matching "${classArg}".`);
    process.exit(1);
  }
  return data;
}

async function getBookedCount(classId) {
  const { count } = await sb
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .in('status', ['pending', 'confirmed']);
  return count ?? 0;
}

async function findAdminId() {
  const { data } = await sb
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'superadmin'])
    .limit(1)
    .single();
  if (!data) {
    console.error('No admin/superadmin profile found.');
    process.exit(1);
  }
  return data.id;
}

function classSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20);
}

function dummyEmail(slug, n) {
  return `dummy+${slug}-${n}@${DUMMY_DOMAIN}`;
}

// ── undo ───────────────────────────────────────────────────────────
async function doUndo() {
  console.log('Looking for dummy auth users…');
  const { data: listResp, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error('Failed to list users:', error.message);
    process.exit(1);
  }

  let dummies = listResp.users.filter((u) => (u.email || '').endsWith(`@${DUMMY_DOMAIN}`));

  // Optionally scope to a single class by matching the slug in the email
  if (classArg || useNext) {
    const cls = await resolveClass();
    const slug = classSlug(cls.title);
    dummies = dummies.filter((u) => (u.email || '').includes(`dummy+${slug}-`));
    console.log(`Scoped to class "${cls.title}" (slug: ${slug})`);
  }

  console.log(`Found ${dummies.length} dummy user(s).`);
  if (dummies.length === 0) return;

  if (dryRun) {
    dummies.forEach((u) => console.log(`  [dry-run] would delete: ${u.email} (${u.id})`));
    return;
  }

  let deleted = 0;
  for (const u of dummies) {
    const { error: delErr } = await sb.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.error(`  ✗ ${u.email}: ${delErr.message}`);
    } else {
      console.log(`  ✓ deleted ${u.email}`);
      deleted++;
    }
  }
  console.log(`\nDeleted ${deleted} dummy user(s). Cascaded profiles + bookings removed.`);
}

// ── seed ───────────────────────────────────────────────────────────
async function doSeed() {
  const cls = await resolveClass();
  const booked = await getBookedCount(cls.id);
  const capacity = cls.max_capacity ?? 0;
  const toAdd = countArg ? parseInt(countArg, 10) : Math.max(0, capacity - booked);

  console.log(`Class: "${cls.title}" (${cls.id})`);
  console.log(`  starts_at:    ${cls.starts_at}`);
  console.log(`  capacity:     ${capacity}`);
  console.log(`  booked now:   ${booked}`);
  console.log(`  will add:     ${toAdd}`);

  if (toAdd <= 0) {
    console.log('\nNothing to add — class is already at (or over) capacity.');
    return;
  }

  if (dryRun) {
    const slug = classSlug(cls.title);
    for (let i = 1; i <= toAdd; i++) {
      console.log(`  [dry-run] would create: ${dummyEmail(slug, i)} → confirmed booking`);
    }
    console.log(`\n[dry-run] Would fill to ${booked + toAdd}/${capacity}.`);
    return;
  }

  const adminId = await findAdminId();
  const slug = classSlug(cls.title);
  let created = 0;

  for (let i = 1; i <= toAdd; i++) {
    const email = dummyEmail(slug, i);
    const fullName = `Dummy Member ${i}`;

    // Create auth user
    const { data: userData, error: createErr } = await sb.auth.admin.createUser({
      email,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) {
      // If user already exists, look them up instead
      if (createErr.message?.includes('already been registered')) {
        console.log(`  ⟳ ${email} already exists, reusing`);
        const { data: listResp } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const existing = listResp?.users?.find((u) => u.email === email);
        if (!existing) {
          console.error(`  ✗ could not find existing user ${email}`);
          continue;
        }

        // Check if already booked
        const { data: existingBooking } = await sb
          .from('bookings')
          .select('id')
          .eq('class_id', cls.id)
          .eq('student_id', existing.id)
          .in('status', ['pending', 'confirmed'])
          .maybeSingle();
        if (existingBooking) {
          console.log(`    already booked for this class, skipping`);
          created++;
          continue;
        }

        // Insert booking for existing user
        const { error: bookErr } = await sb.from('bookings').insert({
          class_id: cls.id,
          student_id: existing.id,
          status: 'confirmed',
          payment_type: 'comp',
          added_by_admin: adminId,
        });
        if (bookErr) {
          console.error(`  ✗ booking for ${email}: ${bookErr.message}`);
        } else {
          console.log(`  ✓ ${email} → booking created`);
          created++;
        }
        continue;
      }
      console.error(`  ✗ create ${email}: ${createErr.message}`);
      continue;
    }

    const userId = userData.user.id;

    // Small delay to be gentle on the Auth API
    if (i > 1) await new Promise((r) => setTimeout(r, 200));

    // Wait briefly for the profile trigger to fire, then insert booking
    await new Promise((r) => setTimeout(r, 300));

    const { error: bookErr } = await sb.from('bookings').insert({
      class_id: cls.id,
      student_id: userId,
      status: 'confirmed',
      payment_type: 'comp',
      added_by_admin: adminId,
    });
    if (bookErr) {
      console.error(`  ✗ booking for ${email}: ${bookErr.message}`);
    } else {
      console.log(`  ✓ ${email} (${userId}) → booking created`);
      created++;
    }
  }

  const finalCount = booked + created;
  console.log(`\n${finalCount}/${capacity} — class is now ${finalCount >= capacity ? 'FULL, "Waitlist Open" should display' : `${capacity - finalCount} spots remain`}.`);
}

// ── main ───────────────────────────────────────────────────────────
if (undo) {
  await doUndo();
} else {
  await doSeed();
}
