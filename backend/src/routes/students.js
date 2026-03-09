const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

router.use(authMiddleware);

// GET /api/students - list all with advanced filters
router.get('/', async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    let query = supabase
      .from('Student')
      .select('*, class:Class(name, section)')
      .order('rollNo');
    const { classId, bloodGroup, search } = req.query || {};
    if (classId) query = query.eq('classId', classId);
    if (bloodGroup) query = query.eq('bloodGroup', bloodGroup);
    if (req.user.role === 'TEACHER') {
      const { data: assignments } = await supabase
        .from('TeacherClassAssignment')
        .select('classId')
        .eq('teacherId', req.user.teacherId || '');
      const classIds = (assignments || []).map((a) => a.classId).filter(Boolean);
      if (classIds.length === 0) return res.json({ data: [] });
      query = query.in('classId', classIds);
    }
    const { data: students, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    let list = students || [];
    const withParents = await Promise.all(
      list.map(async (s) => {
        const { data: links } = await supabase.from('StudentParent').select('parentId').eq('studentId', s.id);
        const parentIds = (links || []).map((l) => l.parentId);
        let parents = [];
        if (parentIds.length) {
          const { data: p } = await supabase.from('Parent').select('id, name, address, profession, userId').in('id', parentIds);
          const parentList = p || [];
          for (const par of parentList) {
            const { data: u } = await supabase.from('User').select('phone').eq('id', par.userId || '').single();
            parents.push({ name: par.name, phone: u?.phone, address: par.address, profession: par.profession });
          }
        }
        return { ...s, parents };
      })
    );
    let result = withParents;
    if (search && String(search).trim()) {
      const s = String(search).toLowerCase();
      const phone = normalizePhone(search);
      result = result.filter((st) => {
        if (st.name?.toLowerCase().includes(s)) return true;
        if (st.rollNo?.toLowerCase().includes(s)) return true;
        if (st.address?.toLowerCase().includes(s)) return true;
        if (st.busStop?.toLowerCase().includes(s)) return true;
        if (st.bloodGroup?.toLowerCase().includes(s)) return true;
        for (const p of st.parents || []) {
          if (p.name?.toLowerCase().includes(s)) return true;
          if (p.phone && (p.phone.includes(search) || normalizePhone(p.phone).includes(phone))) return true;
          if (p.profession?.toLowerCase().includes(s)) return true;
        }
        return false;
      });
    }
    res.json({ data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/students/parent-lookup - lookup parent by phone, auto-fill details
router.get('/parent-lookup', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const phone = normalizePhone(req.query.phone || '');
  if (phone.length < 10) return res.json({ found: false });
  try {
    const patterns = [phone, `+91${phone}`, `91${phone}`, `0${phone}`, `${phone}`];
    let users = null;
    for (const p of patterns) {
      const { data } = await supabase.from('User').select('id').eq('role', 'PARENT').eq('phone', p).limit(1);
      if (data?.length) {
        users = data;
        break;
      }
    }
    if (!users?.length) {
      const { data: allParents } = await supabase.from('User').select('id, phone').eq('role', 'PARENT');
      const match = (allParents || []).find((u) => normalizePhone(u.phone || '') === phone);
      if (match) users = [match];
    }
    if (!users?.length) return res.json({ found: false });
    const { data: parent } = await supabase.from('Parent').select('name, address, profession').eq('userId', users[0].id).single();
    if (!parent) return res.json({ found: false });
    const { data: u } = await supabase.from('User').select('phone').eq('id', users[0].id).single();
    res.json({
      found: true,
      parent: {
        name: parent.name,
        phone: u?.phone,
        address: parent.address,
        profession: parent.profession,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/students/check-duplicate - admin only
router.get('/check-duplicate', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { rollNo, classId, parentPhone, studentName } = req.query || {};
  const phone = normalizePhone(parentPhone);
  try {
    const matches = [];
    if (rollNo && classId) {
      const { data } = await supabase.from('Student').select('id, name, rollNo').eq('rollNo', String(rollNo).trim()).eq('classId', classId);
      if (data?.length) matches.push({ type: 'rollNo_class', student: data[0] });
    }
    if (phone && studentName && classId) {
      const { data: users } = await supabase.from('User').select('id').eq('role', 'PARENT').or(`phone.eq.${parentPhone},phone.eq.${phone},phone.eq.91${phone}`);
      for (const u of users || []) {
        const { data: parents } = await supabase.from('Parent').select('id').eq('userId', u.id);
        for (const p of parents || []) {
          const { data: links } = await supabase.from('StudentParent').select('studentId').eq('parentId', p.id);
          for (const l of links || []) {
            const { data: st } = await supabase.from('Student').select('id, name, rollNo').eq('id', l.studentId).eq('classId', classId).ilike('name', `%${studentName}%`);
            if (st?.length) matches.push({ type: 'parent_student_class', student: st[0] });
          }
        }
      }
    }
    res.json({ duplicate: matches.length > 0, matches });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/students/template - must be before /:id
router.get('/template', requireRole('ADMIN'), (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Roll No', 'Student Name', 'Class', 'Section', 'Blood Group', 'Parent Name', 'Parent Phone', 'Parent Profession', 'Address', 'Bus Stop'],
    ['101', 'Rahul Kumar', '5', 'A', 'B+', 'Suresh Kumar', '9876543210', 'Government Employee', '123 Main St, City', 'Stop 1'],
    ['102', 'Priya Sharma', '5', 'A', 'O+', 'Rajesh Sharma', '9876543211', 'Private Sector', '456 Park Ave', 'Stop 2'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=student-import-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: student, error } = await supabase
      .from('Student')
      .select('*, class:Class(name, section)')
      .eq('id', req.params.id)
      .single();
    if (error || !student) return res.status(404).json({ error: 'Student not found' });
    const { data: links } = await supabase.from('StudentParent').select('parentId').eq('studentId', student.id);
    let parents = [];
    for (const l of links || []) {
      const { data: p } = await supabase.from('Parent').select('id, name, address, profession').eq('id', l.parentId).single();
      if (p) {
        const { data: u } = await supabase.from('User').select('phone').eq('id', p.userId).single();
        parents.push({ name: p.name, phone: u?.phone, address: p.address, profession: p.profession });
      }
    }
    res.json({ ...student, parents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/students - admin only, full fields + parent link
router.post('/', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const {
    rollNo,
    name,
    classId,
    parentName,
    parentPhone,
    parentProfession,
    address,
    busStop,
    bloodGroup,
    imageUrl,
  } = req.body || {};

  if (!rollNo || !name || !classId) {
    return res.status(400).json({ error: 'Roll No, Name, and Class are required' });
  }
  if (!parentName || !parentPhone) {
    return res.status(400).json({ error: 'Parent name and phone are required' });
  }

  const phone = normalizePhone(parentPhone);
  if (phone.length < 10) {
    return res.status(400).json({ error: 'Valid parent phone number required (10 digits)' });
  }

  try {
    // Duplication check: rollNo + classId
    const { data: dupRoll } = await supabase
      .from('Student')
      .select('id, name')
      .eq('rollNo', String(rollNo).trim())
      .eq('classId', classId)
      .limit(1);
    if (dupRoll?.length) {
      return res.status(409).json({
        error: `Duplicate: Student with Roll No ${rollNo} already exists in this class`,
        duplicate: dupRoll[0],
      });
    }

    // Find or create Parent (User + Parent)
    let parentId;
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('role', 'PARENT')
      .or(`phone.eq.${parentPhone},phone.eq.${phone},phone.eq.91${phone},phone.eq.+91${phone}`)
      .limit(1);
    if (existingUser?.length) {
      const { data: existingParent } = await supabase.from('Parent').select('id').eq('userId', existingUser[0].id).single();
      if (existingParent) {
        parentId = existingParent.id;
        await supabase.from('Parent').update({
          name: parentName.trim(),
          address: address?.trim() || null,
          profession: parentProfession?.trim() || null,
        }).eq('id', parentId);
      } else {
        parentId = cuid();
        await supabase.from('Parent').insert({
          id: parentId,
          userId: existingUser[0].id,
          name: parentName.trim(),
          address: address?.trim() || null,
          profession: parentProfession?.trim() || null,
        });
      }
    } else {
      const userId = cuid();
      await supabase.from('User').insert({
        id: userId,
        phone: phone.length === 10 ? `+91${phone}` : parentPhone.trim(),
        role: 'PARENT',
      });
      parentId = cuid();
      await supabase.from('Parent').insert({
        id: parentId,
        userId,
        name: parentName.trim(),
        address: address?.trim() || null,
        profession: parentProfession?.trim() || null,
      });
    }

    const studentId = cuid();
    await supabase.from('Student').insert({
      id: studentId,
      rollNo: String(rollNo).trim(),
      name: name.trim(),
      classId,
      address: address?.trim() || null,
      busStop: busStop?.trim() || null,
      bloodGroup: bloodGroup?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
    });
    await supabase.from('StudentParent').insert({
      id: cuid(),
      studentId,
      parentId,
    });

    const { data } = await supabase
      .from('Student')
      .select('*, class:Class(name, section)')
      .eq('id', studentId)
      .single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/students/:id - admin only
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const {
    rollNo,
    name,
    classId,
    address,
    busStop,
    bloodGroup,
    imageUrl,
    parentName,
    parentPhone,
    parentProfession,
  } = req.body || {};
  const updates = {};
  if (rollNo !== undefined) updates.rollNo = String(rollNo).trim();
  if (name !== undefined) updates.name = name.trim();
  if (classId !== undefined) updates.classId = classId;
  if (address !== undefined) updates.address = address ? String(address).trim() : null;
  if (busStop !== undefined) updates.busStop = busStop ? String(busStop).trim() : null;
  if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup ? String(bloodGroup).trim() : null;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl ? String(imageUrl).trim() : null;
  const hasParentUpdates = parentName !== undefined || parentPhone !== undefined || parentProfession !== undefined || address !== undefined;
  if (Object.keys(updates).length === 0 && !hasParentUpdates) return res.status(400).json({ error: 'No fields to update' });
  try {
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('Student').update(updates).eq('id', req.params.id);
      if (error) return res.status(500).json({ error: error.message });
    }
    if (parentName !== undefined || parentPhone !== undefined || parentProfession !== undefined || address !== undefined) {
      const { data: links } = await supabase.from('StudentParent').select('parentId').eq('studentId', req.params.id);
      for (const l of links || []) {
        const parentUpdates = {};
        if (parentName !== undefined) parentUpdates.name = parentName.trim();
        if (parentProfession !== undefined) parentUpdates.profession = parentProfession ? String(parentProfession).trim() : null;
        if (address !== undefined) parentUpdates.address = address ? String(address).trim() : null;
        if (Object.keys(parentUpdates).length > 0) {
          await supabase.from('Parent').update(parentUpdates).eq('id', l.parentId);
        }
        if (parentPhone !== undefined && parentPhone.trim()) {
          const phone = normalizePhone(parentPhone);
          if (phone.length >= 10) {
            const { data: p } = await supabase.from('Parent').select('userId').eq('id', l.parentId).single();
            if (p?.userId) {
              await supabase.from('User').update({ phone: `+91${phone}` }).eq('id', p.userId);
            }
          }
        }
      }
    }
    const { data: student } = await supabase.from('Student').select('*, class:Class(name, section)').eq('id', req.params.id).single();
    const { data: linkData } = await supabase.from('StudentParent').select('parentId').eq('studentId', req.params.id);
    let parents = [];
    for (const lnk of linkData || []) {
      const { data: p } = await supabase.from('Parent').select('id, name, address, profession').eq('id', lnk.parentId).single();
      if (p) {
        const { data: u } = await supabase.from('User').select('phone').eq('id', p.userId).single();
        parents.push({ name: p.name, phone: u?.phone, address: p.address, profession: p.profession });
      }
    }
    res.json({ ...student, parents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/students/bulk-upload - admin only, Excel file
router.post('/bulk-upload', requireRole('ADMIN'), upload.single('file'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows.length || rows.length < 2) return res.status(400).json({ error: 'Excel must have header row and at least one data row' });
    const headers = rows[0].map((h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
    const col = (name) => {
      const i = headers.findIndex((h) => h.includes(name));
      return i >= 0 ? i : -1;
    };
    const idx = {
      rollNo: col('roll no') >= 0 ? col('roll no') : col('roll'),
      name: col('student name') >= 0 ? col('student name') : col('student'),
      className: col('class'),
      section: col('section'),
      bloodGroup: col('blood'),
      parentName: col('parent name') >= 0 ? col('parent name') : col('parent'),
      parentPhone: col('parent phone') >= 0 ? col('parent phone') : col('phone'),
      parentProfession: col('profession'),
      address: col('address'),
      busStop: col('bus stop') >= 0 ? col('bus stop') : col('bus'),
    };
    const { data: classes } = await supabase.from('Class').select('id, name, section');
    const classMap = new Map();
    (classes || []).forEach((c) => classMap.set(`${c.name}-${c.section}`.toLowerCase(), c.id));
    const results = { added: 0, skipped: 0, errors: [] };
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const get = (i) => (i >= 0 && row[i] != null ? String(row[i]).trim() : '');
      const rollNo = get(idx.rollNo);
      const studentName = get(idx.name);
      const className = get(idx.className);
      const section = get(idx.section) || 'A';
      const parentName = get(idx.parentName);
      const parentPhone = get(idx.parentPhone);
      if (!rollNo || !studentName || !parentName || !parentPhone) {
        results.errors.push({ row: r + 1, msg: 'Missing Roll No, Name, Parent Name or Phone' });
        results.skipped++;
        continue;
      }
      const phone = normalizePhone(parentPhone);
      if (phone.length < 10) {
        results.errors.push({ row: r + 1, msg: 'Invalid parent phone' });
        results.skipped++;
        continue;
      }
      const classId = classMap.get(`${className}-${section}`.toLowerCase()) || classMap.get(className?.toLowerCase());
      if (!classId) {
        results.errors.push({ row: r + 1, msg: `Class ${className}-${section} not found` });
        results.skipped++;
        continue;
      }
      const { data: dup } = await supabase.from('Student').select('id').eq('rollNo', rollNo).eq('classId', classId).limit(1);
      if (dup?.length) {
        results.errors.push({ row: r + 1, msg: `Duplicate: Roll ${rollNo} in class` });
        results.skipped++;
        continue;
      }
      let parentId;
      const { data: existingUser } = await supabase.from('User').select('id').eq('role', 'PARENT').or(`phone.eq.${phone},phone.eq.+91${phone},phone.eq.91${phone}`).limit(1);
      if (existingUser?.length) {
        const { data: existingParent } = await supabase.from('Parent').select('id').eq('userId', existingUser[0].id).single();
        parentId = existingParent?.id;
        if (parentId) {
          await supabase.from('Parent').update({ name: parentName, address: get(idx.address) || null, profession: get(idx.parentProfession) || null }).eq('id', parentId);
        }
      }
      if (!parentId) {
        const userId = cuid();
        await supabase.from('User').insert({ id: userId, phone: `+91${phone}`, role: 'PARENT' });
        parentId = cuid();
        await supabase.from('Parent').insert({ id: parentId, userId, name: parentName, address: get(idx.address) || null, profession: get(idx.parentProfession) || null });
      }
      const studentId = cuid();
      await supabase.from('Student').insert({
        id: studentId,
        rollNo,
        name: studentName,
        classId,
        address: get(idx.address) || null,
        busStop: get(idx.busStop) || null,
        bloodGroup: get(idx.bloodGroup) || null,
      });
      await supabase.from('StudentParent').insert({ id: cuid(), studentId, parentId });
      results.added++;
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/students/:id - admin only
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { error } = await supabase.from('Student').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
