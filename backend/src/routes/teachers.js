const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

const SPECIALIZATIONS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education', 'Art', 'Music', 'Sanskrit', 'Other'];

router.use(authMiddleware);

// GET /api/teachers/template - must be before /:id
router.get('/template', requireRole('ADMIN'), (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Father/Husband Name', 'Email', 'Password', 'Specialization', 'Category', 'Blood Group', 'Experience', 'Address'],
    ['Rahul Sharma', 'Suresh Sharma', 'rahul@school.com', 'temp123', 'Mathematics', 'Permanent', 'B+', '5 years', '123 Main St'],
    ['Priya Singh', 'Rajesh Singh', 'priya@school.com', 'temp123', 'Science', 'Contract', 'O+', '3 years', '456 Park Ave'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=teacher-import-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET /api/teachers - admin only
router.get('/', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    const { data: teachers, error } = await supabase.from('Teacher').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    const list = await Promise.all(
      (teachers || []).map(async (t) => {
        const { data: u } = await supabase.from('User').select('email').eq('id', t.userId).single();
        return { ...t, email: u?.email };
      })
    );
    res.json({ data: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/teachers/assignments/list - must be before /:id
router.get('/assignments/list', async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    let query = supabase
      .from('TeacherClassAssignment')
      .select('*, teacher:Teacher(name), class:Class(name, section)');
    if (req.user.role === 'TEACHER') {
      query = query.eq('teacherId', req.user.teacherId || '');
    }
    const { data, error } = await query.order('classId');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/teachers/:id
router.get('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: teacher, error } = await supabase.from('Teacher').select('*').eq('id', req.params.id).single();
    if (error || !teacher) return res.status(404).json({ error: 'Teacher not found' });
    const { data: u } = await supabase.from('User').select('email').eq('id', teacher.userId).single();
    res.json({ ...teacher, email: u?.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/teachers - admin only, full create with login
router.post('/', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const {
    name,
    email,
    password,
    fatherHusbandName,
    specialization,
    category,
    bloodGroup,
    experience,
    address,
    imageUrl,
  } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
  try {
    const { data: existing } = await supabase.from('User').select('id').eq('email', email.toLowerCase().trim()).limit(1);
    if (existing?.length) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const userId = cuid();
    const teacherId = cuid();
    await supabase.from('User').insert({
      id: userId,
      email: email.toLowerCase().trim(),
      role: 'TEACHER',
      password: hashed,
    });
    await supabase.from('Teacher').insert({
      id: teacherId,
      userId,
      name: name.trim(),
      fatherHusbandName: fatherHusbandName?.trim() || null,
      specialization: specialization?.trim() || null,
      category: category?.trim() || null,
      bloodGroup: bloodGroup?.trim() || null,
      experience: experience?.trim() || null,
      address: address?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
    });
    const { data: t } = await supabase.from('Teacher').select('*').eq('id', teacherId).single();
    const { data: u } = await supabase.from('User').select('email').eq('id', userId).single();
    res.status(201).json({ ...t, email: u?.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/teachers/:id - admin only
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const {
    name,
    email,
    password,
    fatherHusbandName,
    specialization,
    category,
    bloodGroup,
    experience,
    address,
    imageUrl,
  } = req.body || {};
  try {
    const { data: teacher } = await supabase.from('Teacher').select('userId').eq('id', req.params.id).single();
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const teacherUpdates = {};
    if (name !== undefined) teacherUpdates.name = name.trim();
    if (fatherHusbandName !== undefined) teacherUpdates.fatherHusbandName = fatherHusbandName ? fatherHusbandName.trim() : null;
    if (specialization !== undefined) teacherUpdates.specialization = specialization ? specialization.trim() : null;
    if (category !== undefined) teacherUpdates.category = category ? category.trim() : null;
    if (bloodGroup !== undefined) teacherUpdates.bloodGroup = bloodGroup ? bloodGroup.trim() : null;
    if (experience !== undefined) teacherUpdates.experience = experience ? experience.trim() : null;
    if (address !== undefined) teacherUpdates.address = address ? address.trim() : null;
    if (imageUrl !== undefined) teacherUpdates.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (Object.keys(teacherUpdates).length > 0) {
      await supabase.from('Teacher').update(teacherUpdates).eq('id', req.params.id);
    }
    if (email !== undefined) {
      const { data: dup } = await supabase.from('User').select('id').eq('email', email.toLowerCase().trim()).neq('id', teacher.userId).limit(1);
      if (dup?.length) return res.status(400).json({ error: 'Email already in use' });
      await supabase.from('User').update({ email: email.toLowerCase().trim() }).eq('id', teacher.userId);
    }
    if (password !== undefined && password.trim()) {
      const hashed = await bcrypt.hash(password, 10);
      await supabase.from('User').update({ password: hashed }).eq('id', teacher.userId);
    }
    const { data: t } = await supabase.from('Teacher').select('*').eq('id', req.params.id).single();
    const { data: u } = await supabase.from('User').select('email').eq('id', teacher.userId).single();
    res.json({ ...t, email: u?.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/teachers/:id - admin only
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: teacher } = await supabase.from('Teacher').select('userId').eq('id', req.params.id).single();
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    await supabase.from('TeacherClassAssignment').delete().eq('teacherId', req.params.id);
    await supabase.from('Teacher').delete().eq('id', req.params.id);
    await supabase.from('User').delete().eq('id', teacher.userId);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/teachers/bulk-upload - admin only
router.post('/bulk-upload', requireRole('ADMIN'), upload.single('file'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows.length || rows.length < 2) return res.status(400).json({ error: 'Excel must have header row and at least one data row' });
    const headers = rows[0].map((h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
    const col = (name) => headers.findIndex((h) => h.includes(name));
    const idx = {
      name: col('name') >= 0 ? col('name') : 0,
      fatherHusband: col('father') >= 0 ? col('father') : col('husband'),
      email: col('email') >= 0 ? col('email') : -1,
      password: col('password') >= 0 ? col('password') : -1,
      specialization: col('specialization') >= 0 ? col('specialization') : -1,
      category: col('category') >= 0 ? col('category') : -1,
      bloodGroup: col('blood') >= 0 ? col('blood') : -1,
      experience: col('experience') >= 0 ? col('experience') : -1,
      address: col('address') >= 0 ? col('address') : -1,
    };
    const results = { added: 0, skipped: 0, errors: [] };
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const get = (i) => (i >= 0 && row[i] != null ? String(row[i]).trim() : '');
      const name = get(idx.name);
      const email = get(idx.email);
      const password = get(idx.password) || 'temp123';
      if (!name || !email) {
        results.errors.push({ row: r + 1, msg: 'Missing name or email' });
        results.skipped++;
        continue;
      }
      const { data: existing } = await supabase.from('User').select('id').eq('email', email.toLowerCase()).limit(1);
      if (existing?.length) {
        results.errors.push({ row: r + 1, msg: `Email ${email} already registered` });
        results.skipped++;
        continue;
      }
      const hashed = await bcrypt.hash(password, 10);
      const userId = cuid();
      const teacherId = cuid();
      await supabase.from('User').insert({
        id: userId,
        email: email.toLowerCase(),
        role: 'TEACHER',
        password: hashed,
      });
      await supabase.from('Teacher').insert({
        id: teacherId,
        userId,
        name,
        fatherHusbandName: get(idx.fatherHusband) || null,
        specialization: get(idx.specialization) || null,
        category: get(idx.category) || null,
        bloodGroup: get(idx.bloodGroup) || null,
        experience: get(idx.experience) || null,
        address: get(idx.address) || null,
      });
      results.added++;
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/teachers/assignments - admin only
router.post('/assignments', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { teacherId, classId } = req.body || {};
  if (!teacherId || !classId) return res.status(400).json({ error: 'teacherId and classId required' });
  try {
    const id = cuid();
    const { error } = await supabase.from('TeacherClassAssignment').insert({ id, teacherId, classId });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = await supabase
      .from('TeacherClassAssignment')
      .select('*, teacher:Teacher(name), class:Class(name, section)')
      .eq('id', id)
      .single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/teachers/assignments/:id - admin only
router.delete('/assignments/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { error } = await supabase.from('TeacherClassAssignment').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/teachers/set-password - admin only
router.post('/set-password', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ error: 'userId and password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('User').update({ password: hashed }).eq('id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
