const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

router.use(authMiddleware);

// GET /api/classes - all classes (admin) or assigned (teacher)
router.get('/', async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    if (req.user.role === 'TEACHER') {
      const teacherId = req.user.teacherId || '';
      const { data: slots } = await supabase
        .from('TimetableSlot')
        .select('classId, class:Class(id, name, section)')
        .eq('teacherId', teacherId);
      const fromSlots = (slots || []).map((s) => s.class).filter(Boolean);
      const seen = new Set();
      const unique = fromSlots.filter((c) => c?.id && !seen.has(c.id) && (seen.add(c.id), true));
      if (unique.length > 0) return res.json({ data: unique });
      const { data: assignments, error: aErr } = await supabase
        .from('TeacherClassAssignment')
        .select('classId, class:Class(id, name, section)')
        .eq('teacherId', teacherId);
      if (aErr) return res.status(500).json({ error: aErr.message });
      const classes = (assignments || []).map((a) => a.class).filter(Boolean);
      return res.json({ data: classes });
    }
    const { data, error } = await supabase.from('Class').select('*').order('name').order('section');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/classes/:id
router.get('/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await supabase.from('Class').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Class not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/classes - admin only
router.post('/', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { name, section, level } = req.body || {};
  if (!name || !section) return res.status(400).json({ error: 'name and section required' });
  const levelVal = level === 'secondary' ? 'secondary' : 'primary';
  try {
    const id = cuid();
    const { error } = await supabase.from('Class').insert({ id, name: String(name).trim(), section: String(section).trim(), level: levelVal });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = await supabase.from('Class').select('*').eq('id', id).single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/classes/:id - admin only
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { name, section, level, classTeacherId } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (section !== undefined) updates.section = String(section).trim();
  if (level !== undefined) updates.level = level === 'secondary' ? 'secondary' : 'primary';
  if (classTeacherId !== undefined) updates.classTeacherId = classTeacherId || null;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
  try {
    const { error } = await supabase.from('Class').update(updates).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    const { data } = await supabase.from('Class').select('*').eq('id', req.params.id).single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/classes/:id - admin only
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { error } = await supabase.from('Class').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
