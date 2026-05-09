// One-shot: wipe revenue tables for fresh launch.
// Run: node scripts/clear-revenue.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.production');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.production');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function wipe(table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01');
  if (error) {
    if (/Could not find the table/i.test(error.message)) {
      console.log(`- ${table}: not present in this DB, skipping`);
      return;
    }
    console.error(`✗ ${table}:`, error.message);
    process.exit(1);
  }
  console.log(`✓ ${table}: deleted ${count ?? '?'} row(s)`);
}

await wipe('credit_purchases');
await wipe('manual_payments');
await wipe('gift_packs');

console.log('\nDone. Sales totals on /admin/sales now read $0.');
