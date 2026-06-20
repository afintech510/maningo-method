import { createClient } from '@supabase/supabase-js';

// Credentials come from the environment — never hardcode them here.
//   node --env-file=.env scripts/seed-classes.mjs
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Get admin user ID
const { data: admin } = await supabase
  .from('profiles')
  .select('id')
  .eq('role', 'admin')
  .single();

if (!admin) {
  console.error('No admin user found');
  process.exit(1);
}

console.log(`Admin ID: ${admin.id}`);

// Weekly schedule template (Eastern Time)
// Two back-to-back sessions per day
const weeklySchedule = [
  // Monday
  { day: 1, time: '09:00', title: 'Mat Pilates', duration: 55, capacity: 12, desc: 'Full-body mat work focusing on core strength, flexibility, and controlled movement. All levels welcome.' },
  { day: 1, time: '10:00', title: 'Reformer Flow', duration: 55, capacity: 8, desc: 'Dynamic reformer class emphasizing fluid transitions, spring resistance, and muscle lengthening.' },
  // Tuesday
  { day: 2, time: '09:00', title: 'Pilates Sculpt', duration: 55, capacity: 12, desc: 'Mat-based class with light weights and props for added resistance. Great for toning and endurance.' },
  { day: 2, time: '10:00', title: 'Reformer Basics', duration: 55, capacity: 8, desc: 'Learn reformer fundamentals with careful attention to form. Perfect for beginners or those refining technique.' },
  // Wednesday
  { day: 3, time: '09:00', title: 'Power Pilates', duration: 55, capacity: 12, desc: 'Higher intensity mat class with challenging sequences. Intermediate to advanced recommended.' },
  { day: 3, time: '10:00', title: 'Reformer Flow', duration: 55, capacity: 8, desc: 'Dynamic reformer class emphasizing fluid transitions, spring resistance, and muscle lengthening.' },
  // Thursday
  { day: 4, time: '09:00', title: 'Mat Pilates', duration: 55, capacity: 12, desc: 'Full-body mat work focusing on core strength, flexibility, and controlled movement. All levels welcome.' },
  { day: 4, time: '10:00', title: 'Stretch & Restore', duration: 55, capacity: 10, desc: 'Gentle stretching and restorative movement. Ideal for recovery days or easing into a Pilates practice.' },
  // Friday
  { day: 5, time: '09:00', title: 'Pilates Sculpt', duration: 55, capacity: 12, desc: 'Mat-based class with light weights and props for added resistance. Great for toning and endurance.' },
  { day: 5, time: '10:00', title: 'Reformer Flow', duration: 55, capacity: 8, desc: 'Dynamic reformer class emphasizing fluid transitions, spring resistance, and muscle lengthening.' },
  // Saturday
  { day: 6, time: '09:30', title: 'Weekend Mat Pilates', duration: 60, capacity: 14, desc: 'Start your weekend with an energizing full-body mat class. All levels, slightly longer format.' },
  { day: 6, time: '10:45', title: 'Reformer Burn', duration: 55, capacity: 8, desc: 'Weekend reformer challenge — upbeat tempo, full-body burn. Intermediate level.' },
];

// Generate classes for 4 weeks starting from tomorrow
const classes = [];
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

for (let week = 0; week < 4; week++) {
  for (const slot of weeklySchedule) {
    // Find the next occurrence of this day of week
    const classDate = new Date(tomorrow);
    // Move to the correct day of week
    const currentDay = tomorrow.getDay(); // 0=Sun
    let daysUntil = slot.day - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    classDate.setDate(tomorrow.getDate() + daysUntil + (week * 7));

    // Set time (Eastern Time — UTC-4 in summer)
    const [hours, minutes] = slot.time.split(':').map(Number);
    // Store as Eastern time by adding 4 hours for UTC offset (EDT)
    classDate.setUTCHours(hours + 4, minutes, 0, 0);

    classes.push({
      title: slot.title,
      description: slot.desc,
      starts_at: classDate.toISOString(),
      duration_minutes: slot.duration,
      max_capacity: slot.capacity,
      status: 'scheduled',
      created_by: admin.id,
    });
  }
}

console.log(`Inserting ${classes.length} classes...`);

// Insert in batches
const batchSize = 20;
for (let i = 0; i < classes.length; i += batchSize) {
  const batch = classes.slice(i, i + batchSize);
  const { error } = await supabase.from('classes').insert(batch);
  if (error) {
    console.error(`Batch ${i / batchSize + 1} failed:`, error.message);
  } else {
    console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} classes inserted`);
  }
}

// Summary
const { count } = await supabase
  .from('classes')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'scheduled');

console.log(`\nDone! ${count} total scheduled classes in database.`);

// Show first few
const { data: sample } = await supabase
  .from('classes')
  .select('title, starts_at, duration_minutes, max_capacity')
  .eq('status', 'scheduled')
  .order('starts_at')
  .limit(6);

console.log('\nNext 6 classes:');
sample.forEach(c => {
  const d = new Date(c.starts_at);
  console.log(`  ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} — ${c.title} (${c.duration_minutes} min, ${c.max_capacity} spots)`);
});
