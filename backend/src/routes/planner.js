const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education', 'Art', 'Music', 'Sanskrit', 'Other'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIMARY_PERIODS = 6;
const SECONDARY_PERIODS = 8;

function getPeriodCount(level) {
  return (level === 'secondary' ? SECONDARY_PERIODS : PRIMARY_PERIODS);
}

router.use(authMiddleware);

// GET /api/planner/template - download planner import template (admin)
router.get('/template', requireRole('ADMIN'), (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Class', 'Day', 'Period', 'Subject', 'Teacher Email'],
    ['5A', 'Mon', '1', 'Mathematics', 'rahul@school.com'],
    ['5A', 'Mon', '2', 'Science', 'priya@school.com'],
    ['6B', 'Tue', '1', 'English', 'rahul@school.com'],
    ['6B', 'Wed', '3', 'Mathematics', 'rahul@school.com'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=planner-import-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET /api/planner/config - periods per level, days
router.get('/config', (req, res) => {
  res.json({
    subjects: SUBJECTS,
    days: DAYS,
    dayOfWeekMap: { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' },
    primaryPeriods: PRIMARY_PERIODS,
    secondaryPeriods: SECONDARY_PERIODS,
  });
});

// GET /api/planner/my-timetable - teacher's weekly slots
router.get('/my-timetable', async (req, res) => {
  if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Teachers only' });
  if (!supabase) return res.json({ data: [] });
  const teacherId = req.user.teacherId;
  if (!teacherId) return res.json({ data: [] });
  try {
    const { data, error } = await supabase
      .from('TimetableSlot')
      .select('*, class:Class(id, name, section)')
      .eq('teacherId', teacherId)
      .order('dayOfWeek')
      .order('periodNumber');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/planner/my-classes - teacher's distinct (class, subject) from timetable
router.get('/my-classes', async (req, res) => {
  if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Teachers only' });
  if (!supabase) return res.json({ data: [] });
  const teacherId = req.user.teacherId;
  if (!teacherId) return res.json({ data: [] });
  try {
    const { data: slots, error } = await supabase
      .from('TimetableSlot')
      .select('classId, subject, class:Class(id, name, section)')
      .eq('teacherId', teacherId);
    if (error) return res.status(500).json({ error: error.message });
    const seen = new Set();
    const list = (slots || [])
      .filter((s) => s.classId && !seen.has(`${s.classId}-${s.subject}`))
      .map((s) => {
        seen.add(`${s.classId}-${s.subject}`);
        return { classId: s.classId, subject: s.subject, class: s.class };
      });
    res.json({ data: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/planner/class/:classId - full timetable for a class
router.get('/class/:classId', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { data: slots, error } = await supabase
      .from('TimetableSlot')
      .select('*, teacher:Teacher(name)')
      .eq('classId', req.params.classId)
      .order('dayOfWeek')
      .order('periodNumber');
    if (error) return res.status(500).json({ error: error.message });
    const { data: cls } = await supabase.from('Class').select('id, name, section, level').eq('id', req.params.classId).single();
    res.json({ class: cls, slots: slots || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/planner/teacher/:teacherId - full timetable for a teacher (admin)
router.get('/teacher/:teacherId', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: slots, error } = await supabase
      .from('TimetableSlot')
      .select('*, class:Class(id, name, section)')
      .eq('teacherId', req.params.teacherId)
      .order('dayOfWeek')
      .order('periodNumber');
    if (error) return res.status(500).json({ error: error.message });
    const { data: teacher } = await supabase.from('Teacher').select('id, name').eq('id', req.params.teacherId).single();
    res.json({ teacher, slots: slots || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/planner/slots - list slots (admin, filter by classId or teacherId)
router.get('/slots', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  const { classId, teacherId } = req.query || {};
  try {
    let query = supabase.from('TimetableSlot').select('*, class:Class(id, name, section, level), teacher:Teacher(name)');
    if (classId) query = query.eq('classId', classId);
    if (teacherId) query = query.eq('teacherId', teacherId);
    const { data, error } = await query.order('classId').order('dayOfWeek').order('periodNumber');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/planner/slots - create slot (admin)
router.post('/slots', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { classId, subject, teacherId, dayOfWeek, periodNumber } = req.body || {};
  if (!classId || !subject || !teacherId || dayOfWeek == null || periodNumber == null) {
    return res.status(400).json({ error: 'classId, subject, teacherId, dayOfWeek, periodNumber required' });
  }
  const day = parseInt(dayOfWeek, 10);
  const period = parseInt(periodNumber, 10);
  if (day < 1 || day > 6) return res.status(400).json({ error: 'dayOfWeek must be 1-6 (Mon-Sat)' });
  try {
    const { data: cls } = await supabase.from('Class').select('level').eq('id', classId).single();
    const maxPeriod = getPeriodCount(cls?.level);
    if (period < 1 || period > maxPeriod) return res.status(400).json({ error: `periodNumber must be 1-${maxPeriod} for this class` });
    const id = cuid();
    const { error } = await supabase.from('TimetableSlot').insert({
      id,
      classId,
      subject: String(subject).trim(),
      teacherId,
      dayOfWeek: day,
      periodNumber: period,
    });
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Slot already exists for this class, day and period' });
      return res.status(500).json({ error: error.message });
    }
    const { data } = await supabase.from('TimetableSlot').select('*, class:Class(id, name, section), teacher:Teacher(name)').eq('id', id).single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/planner/slots/:id - update slot (admin)
router.put('/slots/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { classId, subject, teacherId, dayOfWeek, periodNumber } = req.body || {};
  try {
    const { data: existing } = await supabase.from('TimetableSlot').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Slot not found' });
    const updates = {};
    if (classId !== undefined) updates.classId = classId;
    if (subject !== undefined) updates.subject = String(subject).trim();
    if (teacherId !== undefined) updates.teacherId = teacherId;
    if (dayOfWeek !== undefined) {
      const day = parseInt(dayOfWeek, 10);
      if (day < 1 || day > 6) return res.status(400).json({ error: 'dayOfWeek must be 1-6' });
      updates.dayOfWeek = day;
    }
    if (periodNumber !== undefined) {
      const cid = updates.classId || existing.classId;
      const { data: cls } = await supabase.from('Class').select('level').eq('id', cid).single();
      const maxPeriod = getPeriodCount(cls?.level);
      const period = parseInt(periodNumber, 10);
      if (period < 1 || period > maxPeriod) return res.status(400).json({ error: `periodNumber must be 1-${maxPeriod}` });
      updates.periodNumber = period;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const { error } = await supabase.from('TimetableSlot').update(updates).eq('id', req.params.id);
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Slot already exists for this class, day and period' });
      return res.status(500).json({ error: error.message });
    }
    const { data } = await supabase.from('TimetableSlot').select('*, class:Class(id, name, section), teacher:Teacher(name)').eq('id', req.params.id).single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/planner/slots/:id - delete slot (admin)
router.delete('/slots/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { error } = await supabase.from('TimetableSlot').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/planner/bulk-upload - import timetable from Excel (admin)
router.post('/bulk-upload', requireRole('ADMIN'), upload.single('file'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const replaceExisting = req.body?.replace === 'true';
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows.length || rows.length < 2) return res.status(400).json({ error: 'Excel must have header row and at least one data row' });
    const headers = rows[0].map((h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
    const col = (name) => headers.findIndex((h) => h.includes(name));
    const idx = {
      class: Math.max(col('class'), 0),
      day: Math.max(col('day'), 1),
      period: Math.max(col('period'), 2),
      subject: Math.max(col('subject'), 3),
      teacher: Math.max(col('teacher'), col('email'), 4),
    };
    if (replaceExisting) {
      await supabase.from('TimetableSlot').delete().neq('id', '');
    }
    const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const results = { added: 0, skipped: 0, errors: [] };
    const { data: allClasses } = await supabase.from('Class').select('id, name, section');
    const { data: allUsers } = await supabase.from('User').select('id, email').eq('role', 'TEACHER');
    const { data: allTeachers } = await supabase.from('Teacher').select('id, userId');
    const emailToTeacherId = new Map();
    for (const t of allTeachers || []) {
      const u = (allUsers || []).find((x) => x.id === t.userId);
      if (u?.email) emailToTeacherId.set(u.email.toLowerCase().trim(), t.id);
    }
    const classKey = (name, section) => `${String(name || '').trim()}-${String(section || '').trim()}`;
    const classMap = new Map((allClasses || []).map((c) => [classKey(c.name, c.section), c.id]));
    const classMapAlt = new Map((allClasses || []).map((c) => [`${c.name}${c.section}`, c.id]));
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const get = (i) => (i >= 0 && row[i] != null ? String(row[i]).trim() : '');
      const classVal = get(idx.class);
      const dayVal = get(idx.day);
      const periodVal = get(idx.period);
      const subjectVal = get(idx.subject);
      const teacherEmail = get(idx.teacher);
      if (!classVal || !dayVal || !subjectVal || !teacherEmail) {
        results.errors.push({ row: r + 1, msg: 'Missing class, day, subject or teacher email' });
        results.skipped++;
        continue;
      }
      const dayNum = dayMap[dayVal.toLowerCase().slice(0, 3)];
      if (!dayNum) {
        results.errors.push({ row: r + 1, msg: `Invalid day: ${dayVal}. Use Mon, Tue, Wed, Thu, Fri, Sat` });
        results.skipped++;
        continue;
      }
      const periodNum = parseInt(periodVal, 10);
      if (isNaN(periodNum) || periodNum < 1 || periodNum > 8) {
        results.errors.push({ row: r + 1, msg: `Invalid period: ${periodVal}. Use 1-8` });
        results.skipped++;
        continue;
      }
      const teacherId = emailToTeacherId.get(teacherEmail.toLowerCase());
      if (!teacherId) {
        results.errors.push({ row: r + 1, msg: `Teacher not found: ${teacherEmail}` });
        results.skipped++;
        continue;
      }
      let classId = null;
      const parts = classVal.replace(/\s/g, '').match(/^(\d+)([A-Za-z])$/);
      if (parts) {
        classId = classMap.get(`${parts[1]}-${parts[2].toUpperCase()}`) || classMapAlt.get(`${parts[1]}${parts[2].toUpperCase()}`);
      }
      if (!classId) {
        const dash = classVal.indexOf('-');
        if (dash >= 0) {
          const n = classVal.slice(0, dash).trim();
          const s = classVal.slice(dash + 1).trim();
          classId = classMap.get(`${n}-${s}`) || classMapAlt.get(`${n}${s}`);
        }
      }
      if (!classId) {
        results.errors.push({ row: r + 1, msg: `Class not found: ${classVal}` });
        results.skipped++;
        continue;
      }
      const { data: cls } = await supabase.from('Class').select('level').eq('id', classId).single();
      const maxPeriod = getPeriodCount(cls?.level);
      if (periodNum > maxPeriod) {
        results.errors.push({ row: r + 1, msg: `Period ${periodNum} exceeds max (${maxPeriod}) for this class` });
        results.skipped++;
        continue;
      }
      const { data: existing } = await supabase.from('TimetableSlot').select('id').eq('classId', classId).eq('dayOfWeek', dayNum).eq('periodNumber', periodNum).limit(1);
      if (existing?.length && !replaceExisting) {
        results.errors.push({ row: r + 1, msg: 'Slot already exists (use replace=true to overwrite)' });
        results.skipped++;
        continue;
      }
      if (existing?.length && replaceExisting) {
        await supabase.from('TimetableSlot').delete().eq('classId', classId).eq('dayOfWeek', dayNum).eq('periodNumber', periodNum);
      }
      const id = cuid();
      const { error } = await supabase.from('TimetableSlot').insert({
        id,
        classId,
        subject: subjectVal,
        teacherId,
        dayOfWeek: dayNum,
        periodNumber: periodNum,
      });
      if (error) {
        results.errors.push({ row: r + 1, msg: error.message });
        results.skipped++;
        continue;
      }
      results.added++;
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
