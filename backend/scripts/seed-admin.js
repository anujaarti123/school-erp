/**
 * One-time script to create initial Admin user.
 * Run: node scripts/seed-admin.js
 * Default: admin@school.com / admin123
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const email = process.env.SEED_ADMIN_EMAIL || 'admin@school.com';
const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const name = process.env.SEED_ADMIN_NAME || 'School Admin';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

async function run() {
  // Check if User table has password column
  const { data: existing } = await supabase.from('User').select('id, password').eq('email', email).limit(1);
  if (existing?.length) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  const userId = cuid();
  const adminId = cuid();
  const { error: userErr } = await supabase.from('User').insert({
    id: userId,
    email: email.toLowerCase(),
    role: 'ADMIN',
    password: hashed,
  });
  if (userErr) {
    if (userErr.message?.includes('password')) {
      console.error('Run this in Supabase SQL Editor first:');
      console.error('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;');
      process.exit(1);
    }
    throw userErr;
  }
  const { error: adminErr } = await supabase.from('Admin').insert({
    id: adminId,
    userId,
    name,
  });
  if (adminErr) throw adminErr;
  console.log('Admin created:', email, '| Password:', password);
  console.log('Login at admin web or use POST /api/auth/login');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
