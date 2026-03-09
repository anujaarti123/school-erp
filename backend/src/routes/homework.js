const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

router.use(authMiddleware);

// GET /api/homework - all (admin), by class (teacher), by student (parent)
router.get('/', async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    let query = supabase
      .from('Homework')
      .select('*, class:Class(name, section)')
      .order('createdAt', { ascending: false });
    if (req.user.role === 'TEACHER') {
      const { data: assignments } = await supabase
        .from('TeacherClassAssignment')
        .select('classId')
        .eq('teacherId', req.user.teacherId || '');
      const classIds = (assignments || []).map((a) => a.classId).filter(Boolean);
      if (classIds.length === 0) return res.json({ data: [] });
      query = query.in('classId', classIds);
    }
    if (req.user.role === 'PARENT') {
      const { data: links } = await supabase.from('StudentParent').select('studentId').eq('parentId', req.user.parentId || '');
      const studentIds = (links || []).map((l) => l.studentId);
      if (studentIds.length === 0) return res.json({ data: [] });
      const { data: students } = await supabase.from('Student').select('classId').in('id', studentIds);
      const classIds = [...new Set((students || []).map((s) => s.classId))];
      if (classIds.length === 0) return res.json({ data: [] });
      query = query.in('classId', classIds);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/homework/:id
router.get('/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await supabase
      .from('Homework')
      .select('*, class:Class(name, section)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Homework not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/homework - teacher only
router.post('/', requireRole('TEACHER'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { title, description, dueDate, attachmentUrl, classId } = req.body || {};
  if (!title || !classId) return res.status(400).json({ error: 'title and classId required' });
  try {
    const { data: assignments } = await supabase
      .from('TeacherClassAssignment')
      .select('classId')
      .eq('teacherId', req.user.teacherId || '')
      .eq('classId', classId);
    if (!assignments?.length) return res.status(403).json({ error: 'You are not assigned to this class' });
    const id = cuid();
    const row = {
      id,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      attachmentUrl: attachmentUrl || null,
      classId,
    };
    const { error } = await supabase.from('Homework').insert(row);
    if (error) return res.status(500).json({ error: error.message });
    const { data } = await supabase.from('Homework').select('*, class:Class(name, section)').eq('id', id).single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/homework/:id - teacher only
router.put('/:id', requireRole('TEACHER'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { title, description, dueDate, attachmentUrl } = req.body || {};
  const updates = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
  if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl || null;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
  try {
    const { data: hw } = await supabase.from('Homework').select('classId').eq('id', req.params.id).single();
    if (!hw) return res.status(404).json({ error: 'Homework not found' });
    const { data: assignments } = await supabase
      .from('TeacherClassAssignment')
      .select('classId')
      .eq('teacherId', req.user.teacherId || '')
      .eq('classId', hw.classId);
    if (!assignments?.length) return res.status(403).json({ error: 'You cannot edit this homework' });
    const { error } = await supabase.from('Homework').update(updates).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    const { data } = await supabase.from('Homework').select('*, class:Class(name, section)').eq('id', req.params.id).single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/homework/:id - teacher only
router.delete('/:id', requireRole('TEACHER'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: hw } = await supabase.from('Homework').select('classId').eq('id', req.params.id).single();
    if (!hw) return res.status(404).json({ error: 'Homework not found' });
    const { data: assignments } = await supabase
      .from('TeacherClassAssignment')
      .select('classId')
      .eq('teacherId', req.user.teacherId || '')
      .eq('classId', hw.classId);
    if (!assignments?.length) return res.status(403).json({ error: 'You cannot delete this homework' });
    const { error } = await supabase.from('Homework').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
