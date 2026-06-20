import fs from 'fs';
import path from 'path';

// Credentials come from the environment — never hardcode them here.
//   node --env-file=.env scripts/run-migrations.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const migrations = [
  '001_create_profiles.sql',
  '002_create_classes.sql',
  '003_create_bookings.sql',
  '004_create_subscriptions.sql',
  '005_create_processed_events.sql',
  '006_rls_policies.sql',
];

async function runSQL(sql) {
  // Use the Supabase pg-meta SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

async function run() {
  for (const file of migrations) {
    const filePath = path.join('supabase', 'migrations', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`\n=== Running ${file} ===`);
    try {
      const result = await runSQL(sql);
      console.log(`✓ ${file} applied successfully`);
    } catch (err) {
      console.error(`✗ ${file} failed: ${err.message}`);
    }
  }
  console.log('\nDone.');
}

run().catch(console.error);
