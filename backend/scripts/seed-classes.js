/**
 * Seed classes: Play A, Play B, 1A, 1B ... 12A, 12B
 * Run: node scripts/seed-classes.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

const GRADES = ['LKG', 'UKG', 'Play', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTIONS = ['A', 'B'];
const SECONDARY_GRADES = new Set(['6', '7', '8', '9', '10', '11', '12']);

async function run() {
  const { data: existing } = await supabase.from('Class').select('id').limit(1);
  if (existing?.length) {
    const { count } = await supabase.from('Class').select('*', { count: 'exact', head: true });
    if (count >= 30) {
      console.log('Classes already seeded (LKG, UKG, Play–12, A & B)');
      process.exit(0);
    }
  }

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      const name = grade;
      const { data: dup } = await supabase.from('Class').select('id').eq('name', name).eq('section', section).limit(1);
      if (dup?.length) continue;
      const level = SECONDARY_GRADES.has(grade) ? 'secondary' : 'primary';
      const id = cuid();
      const { error } = await supabase.from('Class').insert({ id, name, section, level });
      if (error) {
        console.error('Error inserting', name, section, error.message);
      } else {
        console.log('Created:', name + section);
      }
    }
  }
  console.log('Done. Classes: LKG, UKG, Play A/B through 12 A/B');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
