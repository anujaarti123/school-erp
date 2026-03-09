/**
 * Send push notifications for upcoming classes.
 * Run every 5-10 min via cron: node scripts/send-upcoming-class-notifications.js
 *
 * Requires: DeviceToken table, Firebase Admin (optional - set FIREBASE_SERVICE_ACCOUNT in .env)
 * Default: P1=09:00, P2=09:45, ... (45 min each). Notify 5 min before.
 */
require('dotenv').config();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const firebasePath = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let firebaseAdmin = null;
if (firebasePath) {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = require(path.resolve(process.cwd(), firebasePath));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    firebaseAdmin = admin;
  } catch (e) {
    console.warn('Firebase init failed (install: npm install firebase-admin):', e.message);
  }
}

// Period start times (HH:MM) - customize per school
const PERIOD_STARTS = ['09:00', '09:45', '10:30', '11:15', '12:00', '12:45', '13:30', '14:15'];
const NOTIFY_MINUTES_BEFORE = 5;

function parseTime(hhmm) {
  const [h, m] = (hhmm || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getNowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function getDayOfWeek() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

async function run() {
  const now = getNowMinutes();
  const dayOfWeek = getDayOfWeek();
  if (dayOfWeek === 7) {
    console.log('Sunday - no classes');
    return;
  }
  const targetMin = now + NOTIFY_MINUTES_BEFORE;
  const { data: slots } = await supabase
    .from('TimetableSlot')
    .select('id, teacherId, subject, dayOfWeek, periodNumber, class:Class(name, section)')
    .eq('dayOfWeek', dayOfWeek);
  if (!slots?.length) return;
  const toNotify = [];
  for (const s of slots) {
    const startMin = parseTime(PERIOD_STARTS[s.periodNumber - 1]);
    if (targetMin >= startMin - 2 && targetMin <= startMin + 2) {
      toNotify.push(s);
    }
  }
  if (toNotify.length === 0) return;
  const teacherIds = [...new Set(toNotify.map((s) => s.teacherId))];
  const { data: teachers } = await supabase.from('Teacher').select('id, userId').in('id', teacherIds);
  if (!teachers?.length) return;
  const userIds = teachers.map((t) => t.userId);
  const { data: tokens } = await supabase.from('DeviceToken').select('userId, token').in('userId', userIds);
  if (!tokens?.length) {
    console.log('No device tokens registered');
    return;
  }
  const teacherIdToUserId = Object.fromEntries(teachers.map((t) => [t.id, t.userId]));
  const userIdToTokens = {};
  for (const t of tokens) {
    if (!userIdToTokens[t.userId]) userIdToTokens[t.userId] = [];
    userIdToTokens[t.userId].push(t.token);
  }
  let sent = 0;
  for (const slot of toNotify) {
    const userId = teacherIdToUserId[slot.teacherId];
    const deviceTokens = userIdToTokens[userId] || [];
    const className = slot.class ? `${slot.class.name}-${slot.class.section}` : 'Class';
    const msg = { title: 'Upcoming Class', body: `${slot.subject} - ${className} in ${NOTIFY_MINUTES_BEFORE} minutes` };
    for (const token of deviceTokens) {
      try {
        if (firebaseAdmin) {
          await firebaseAdmin.messaging().send({
            token,
            notification: msg,
            data: { type: 'upcoming_class', slotId: slot.id },
          });
        } else {
          console.log('Would send:', msg, 'to', token.slice(0, 20) + '...');
        }
        sent++;
      } catch (e) {
        console.error('Send failed:', e.message);
      }
    }
  }
  console.log(`Sent ${sent} upcoming class notification(s)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
