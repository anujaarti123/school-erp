const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - Teacher or Admin (email + password)
router.post('/login', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, role, password')
      .eq('email', email.toLowerCase().trim())
      .in('role', ['TEACHER', 'ADMIN'])
      .limit(1);
    if (error) return res.status(500).json({ error: error.message });
    const user = users?.[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.password) return res.status(401).json({ error: 'Password not set. Ask admin to set your password.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const table = user.role === 'ADMIN' ? 'Admin' : 'Teacher';
    const { data: profile } = await supabase.from(table).select('id').eq('userId', user.id).single();
    const payload = { id: user.id, email: user.email, role: user.role };
    if (user.role === 'TEACHER' && profile) payload.teacherId = profile.id;
    if (user.role === 'ADMIN' && profile) payload.adminId = profile.id;
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, ...(profile && { profileId: profile.id }) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/register - Admin only (creates Teacher)
router.post('/register', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { email, password, name, role = 'TEACHER' } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name required' });
  }
  if (!['TEACHER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Role must be TEACHER or ADMIN' });
  }
  try {
    const { data: existing } = await supabase.from('User').select('id').eq('email', email.toLowerCase().trim()).limit(1);
    if (existing?.length) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    const userId = cuid();
    const { error: userErr } = await supabase.from('User').insert({
      id: userId,
      email: email.toLowerCase().trim(),
      role,
      password: hashed,
    });
    if (userErr) return res.status(500).json({ error: userErr.message });
    const table = role === 'ADMIN' ? 'Admin' : 'Teacher';
    const { error: profileErr } = await supabase.from(table).insert({
      id: cuid(),
      userId,
      name: name.trim(),
    });
    if (profileErr) return res.status(500).json({ error: profileErr.message });
    const token = jwt.sign({ id: userId, email: email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, email, role, name } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

// POST /api/auth/parent - Parent login by phone (MVP: no OTP, just lookup)
// For full OTP flow, integrate Firebase Auth later
router.post('/parent', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { phone } = req.body || {};
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit phone number required' });
  }
  try {
    const patterns = [normalized, `+91${normalized}`, `91${normalized}`, `0${normalized}`];
    let user = null;
    for (const p of patterns) {
      const { data } = await supabase.from('User').select('id, phone, role').eq('role', 'PARENT').eq('phone', p).limit(1);
      if (data?.length) {
        user = data[0];
        break;
      }
    }
    if (!user) {
      const { data: allParents } = await supabase.from('User').select('id, phone, role').eq('role', 'PARENT');
      const match = (allParents || []).find((u) => normalizePhone(u.phone || '') === normalized);
      if (match) user = match;
    }
    if (!user) return res.status(404).json({ error: 'Phone not registered. Contact school admin to add your child.' });
    const { data: parent } = await supabase.from('Parent').select('id').eq('userId', user.id).single();
    const payload = { id: user.id, phone: user.phone, role: 'PARENT' };
    if (parent) payload.parentId = parent.id;
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, phone: user.phone, role: 'PARENT', ...(parent && { parentId: parent.id }) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
