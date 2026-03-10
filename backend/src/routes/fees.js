const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

const ACADEMIC_YEAR_START_MONTH = 4;
const PAYMENT_METHODS = ['upi', 'cash', 'bank', 'cheque'];

function parseSession(session) {
  if (!session || typeof session !== 'string') return null;
  const m = session.match(/^(\d{4})-(\d{2,4})$/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  const endYear = end < 100 ? 2000 + end : end;
  return { startYear: start, endYear };
}

function getSessionMonths(session) {
  const parsed = parseSession(session);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let startYear = currentYear;
  let startMonth = ACADEMIC_YEAR_START_MONTH;
  if (currentMonth < ACADEMIC_YEAR_START_MONTH) startYear--;
  let endYear = currentMonth >= ACADEMIC_YEAR_START_MONTH ? currentYear : currentYear - 1;
  let endMonth = currentMonth >= ACADEMIC_YEAR_START_MONTH ? currentMonth : 12;
  if (parsed) {
    startYear = parsed.startYear;
    startMonth = ACADEMIC_YEAR_START_MONTH;
    endYear = parsed.endYear;
    endMonth = 3;
  }
  const months = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

function getAvailableSessions(feeStartYear) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const endYear = currentMonth >= ACADEMIC_YEAR_START_MONTH ? currentYear : currentYear - 1;
  const start = feeStartYear || endYear - 2;
  const sessions = [];
  for (let y = start; y <= endYear; y++) {
    sessions.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return sessions;
}

router.use(authMiddleware);

// GET /api/fees/sessions - available sessions (admin)
router.get('/sessions', requireRole('ADMIN'), async (req, res) => {
  try {
    const { data } = await supabase?.from('SchoolConfig').select('value').eq('key', 'fee_start_year').single();
    const feeStartYear = data?.value ? parseInt(data.value, 10) : new Date().getFullYear() - 1;
    res.json({ sessions: getAvailableSessions(feeStartYear) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/config - UPI, QR, WhatsApp (admin gets all; parent gets public)
router.get('/config', async (req, res) => {
  if (!supabase) return res.json({});
  try {
    const { data } = await supabase.from('SchoolConfig').select('key, value');
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    res.json({
      feeUpiId: map.fee_upi_id || '',
      feeQrUrl: map.fee_qr_url || '',
      adminWhatsApp: map.admin_whatsapp || '',
      feeStartYear: map.fee_start_year ? parseInt(map.fee_start_year, 10) : new Date().getFullYear() - 1,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/fees/config - admin only
router.put('/config', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { feeUpiId, feeQrUrl, adminWhatsApp } = req.body || {};
  try {
    const upsert = async (key, val) => {
      const { data: ex } = await supabase.from('SchoolConfig').select('id').eq('key', key).single();
      if (ex) {
        await supabase.from('SchoolConfig').update({ value: val || null }).eq('key', key);
      } else {
        await supabase.from('SchoolConfig').insert({ id: cuid(), key, value: val || null });
      }
    };
    if (feeUpiId !== undefined) await upsert('fee_upi_id', feeUpiId);
    if (feeQrUrl !== undefined) await upsert('fee_qr_url', feeQrUrl);
    if (adminWhatsApp !== undefined) await upsert('admin_whatsapp', adminWhatsApp);
    if (req.body?.feeStartYear !== undefined) await upsert('fee_start_year', String(req.body.feeStartYear));
    const { data } = await supabase.from('SchoolConfig').select('key, value');
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    res.json({
      feeUpiId: map.fee_upi_id || '',
      feeQrUrl: map.fee_qr_url || '',
      adminWhatsApp: map.admin_whatsapp || '',
      feeStartYear: map.fee_start_year ? parseInt(map.fee_start_year, 10) : new Date().getFullYear() - 1,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/structure - list fee structure by class
router.get('/structure', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    const { data, error } = await supabase.from('FeeStructure').select('*, class:Class(id, name, section)').order('classId');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/fees/structure/:classId - update fee structure
router.put('/structure/:classId', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { baseAmount, amount, examinationFee, eventsFee, otherFee, lateFeePercent } = req.body || {};
  const amt = baseAmount != null ? baseAmount : amount;
  if (amt == null || isNaN(parseFloat(amt))) return res.status(400).json({ error: 'baseAmount/amount required' });
  try {
    const { data: existing } = await supabase.from('FeeStructure').select('id').eq('classId', req.params.classId).single();
    const updates = {
      baseAmount: parseFloat(amt),
      amount: parseFloat(amt),
      examinationFee: examinationFee != null ? parseFloat(examinationFee) : 0,
      eventsFee: eventsFee != null ? parseFloat(eventsFee) : 0,
      otherFee: otherFee != null ? parseFloat(otherFee) : 0,
      lateFeePercent: lateFeePercent != null ? parseFloat(lateFeePercent) : 0,
      term: 'monthly',
    };
    if (existing) {
      await supabase.from('FeeStructure').update(updates).eq('classId', req.params.classId);
    } else {
      await supabase.from('FeeStructure').insert({ id: cuid(), classId: req.params.classId, ...updates });
    }
    const { data } = await supabase.from('FeeStructure').select('*, class:Class(id, name, section)').eq('classId', req.params.classId).single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/extras - list fee extras (admin)
router.get('/extras', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  const { classId, month, year } = req.query || {};
  try {
    let q = supabase.from('FeeExtra').select('*, class:Class(id, name, section)');
    if (classId) q = q.eq('classId', classId);
    if (month) q = q.eq('month', parseInt(month, 10));
    if (year) q = q.eq('year', parseInt(year, 10));
    const { data, error } = await q.order('year').order('month');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/fees/extras - add fee extra (admin)
router.post('/extras', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { classId, month, year, feeType, amount, description } = req.body || {};
  if (!classId || !month || !year || !feeType || amount == null) return res.status(400).json({ error: 'classId, month, year, feeType, amount required' });
  const extraAmt = parseFloat(amount);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  try {
    const id = cuid();
    await supabase.from('FeeExtra').insert({
      id,
      classId,
      month: m,
      year: y,
      feeType: String(feeType).trim(),
      amount: extraAmt,
      description: description?.trim() || null,
    });
    const { data: students } = await supabase.from('Student').select('id').eq('classId', classId);
    for (const st of students || []) {
      const { data: sf } = await supabase.from('StudentFee').select('id, amount, dueAmount').eq('studentId', st.id).eq('month', m).eq('year', y).single();
      if (sf) {
        const newAmount = parseFloat(sf.amount || 0) + extraAmt;
        const newDue = parseFloat(sf.dueAmount || 0) + extraAmt;
        await supabase.from('StudentFee').update({ amount: newAmount, dueAmount: newDue }).eq('id', sf.id);
      }
    }
    const { data } = await supabase.from('FeeExtra').select('*, class:Class(id, name, section)').eq('id', id).single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/fees/extras/:id
router.delete('/extras/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    await supabase.from('FeeExtra').delete().eq('id', req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getFeeStartYear() {
  const { data } = await supabase.from('SchoolConfig').select('value').eq('key', 'fee_start_year').single();
  return data?.value ? parseInt(data.value, 10) : new Date().getFullYear() - 1;
}

async function getEffectiveFeeStructure(classId) {
  const { data: fs } = await supabase.from('FeeStructure').select('baseAmount, amount, examinationFee, eventsFee, otherFee').eq('classId', classId).single();
  if (fs && (parseFloat(fs?.baseAmount ?? fs?.amount ?? 0) > 0)) return fs;
  const { data: cls } = await supabase.from('Class').select('name').eq('id', classId).single();
  if (!cls?.name) return fs;
  const { data: siblings } = await supabase.from('Class').select('id').eq('name', cls.name).neq('id', classId);
  for (const s of siblings || []) {
    const { data: sfs } = await supabase.from('FeeStructure').select('baseAmount, amount, examinationFee, eventsFee, otherFee').eq('classId', s.id).single();
    if (sfs && parseFloat(sfs?.baseAmount ?? sfs?.amount ?? 0) > 0) return sfs;
  }
  return fs;
}

async function ensureStudentFees(studentId, classId, session) {
  const fs = await getEffectiveFeeStructure(classId);
  const baseAmt = parseFloat(fs?.baseAmount ?? fs?.amount ?? 0);
  const examFee = parseFloat(fs?.examinationFee ?? 0);
  const eventsFee = parseFloat(fs?.eventsFee ?? 0);
  const otherFee = parseFloat(fs?.otherFee ?? 0);
  const feeStartYear = await getFeeStartYear();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let monthList;
  if (session) {
    monthList = getMonthsForSession(session);
  } else {
    monthList = [];
    for (let y = feeStartYear; y <= currentYear; y++) {
      const startM = y === feeStartYear ? ACADEMIC_YEAR_START_MONTH : 1;
      const endM = y < currentYear ? 12 : currentMonth;
      for (let m = startM; m <= endM; m++) {
        monthList.push({ year: y, month: m });
      }
    }
  }
  for (const { year, month } of monthList) {
    const { data: extras } = await supabase.from('FeeExtra').select('amount').eq('classId', classId).eq('month', month).eq('year', year);
    const extraAmt = (extras || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const amount = baseAmt + examFee + eventsFee + otherFee + extraAmt;
    const { data: existing } = await supabase.from('StudentFee').select('id, amount, paidAmount').eq('studentId', studentId).eq('month', month).eq('year', year).single();
    if (existing) {
      if (parseFloat(existing.amount || 0) === 0 && amount > 0) {
        const paid = parseFloat(existing.paidAmount || 0);
        const newDue = Math.max(0, amount - paid);
        await supabase.from('StudentFee').update({
          amount,
          dueAmount: newDue,
          status: newDue <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
        }).eq('id', existing.id);
      }
      continue;
    }
    const id = cuid();
    await supabase.from('StudentFee').insert({
      id,
      studentId,
      month,
      year,
      amount,
      paidAmount: 0,
      dueAmount: amount,
      status: 'pending',
      lateFeeAmount: 0,
    });
  }
}

function getMonthsForSession(session) {
  const parsed = parseSession(session);
  if (!parsed) return getSessionMonths();
  const months = [];
  for (let m = ACADEMIC_YEAR_START_MONTH; m <= 12; m++) months.push({ year: parsed.startYear, month: m });
  for (let m = 1; m <= 3; m++) months.push({ year: parsed.endYear, month: m });
  return months;
}

// GET /api/fees/students - list students with fee summary (admin)
router.get('/students', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  const { classId, search, session } = req.query || {};
  try {
    let q = supabase.from('Student').select('id, rollNo, name, classId, class:Class(id, name, section)');
    if (classId) q = q.eq('classId', classId);
    const { data: students, error } = await q.order('rollNo');
    if (error) return res.status(500).json({ error: error.message });
    let list = students || [];
    if (search && String(search).trim()) {
      const s = String(search).toLowerCase();
      list = list.filter((st) => st.name?.toLowerCase().includes(s) || st.rollNo?.toLowerCase().includes(s));
    }
    const sessionMonths = session ? getMonthsForSession(session) : null;
    const withFees = await Promise.all(
      list.map(async (st) => {
        await ensureStudentFees(st.id, st.classId, session);
        let fees = (await supabase.from('StudentFee').select('dueAmount, status, month, year').eq('studentId', st.id)).data || [];
        if (sessionMonths && sessionMonths.length) {
          const key = (f) => `${f.year}-${f.month}`;
          const sessionKeys = new Set(sessionMonths.map((m) => `${m.year}-${m.month}`));
          fees = fees.filter((f) => sessionKeys.has(key(f)));
        }
        const totalDue = fees.reduce((s, f) => s + parseFloat(f.dueAmount || 0), 0);
        const pendingCount = fees.filter((f) => f.status !== 'paid').length;
        return { ...st, totalDue, pendingMonths: pendingCount };
      })
    );
    res.json({ data: withFees });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/student/:id - student's month-wise fees
router.get('/student/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const studentId = req.params.id;
  const { session } = req.query || {};
  if (req.user.role === 'PARENT') {
    const { data: links } = await supabase.from('StudentParent').select('parentId').eq('studentId', studentId);
    const parentIds = (links || []).map((l) => l.parentId);
    const { data: parents } = await supabase.from('Parent').select('userId').in('id', parentIds);
    const parentUserIds = (parents || []).map((p) => p.userId);
    if (!parentUserIds.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  } else if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { data: student } = await supabase.from('Student').select('id, name, rollNo, classId, class:Class(id, name, section)').eq('id', studentId).single();
    if (!student) return res.status(404).json({ error: 'Student not found' });
    await ensureStudentFees(studentId, student.classId, session);
    let fees = (await supabase.from('StudentFee').select('*').eq('studentId', studentId).order('year').order('month')).data || [];
    if (session) {
      const sessionMonths = getMonthsForSession(session);
      const sessionKeys = new Set(sessionMonths.map((m) => `${m.year}-${m.month}`));
      fees = fees.filter((f) => sessionKeys.has(`${f.year}-${f.month}`));
    }
    const totalDue = fees.reduce((s, f) => s + parseFloat(f.dueAmount || 0), 0);
    const totalPaid = fees.reduce((s, f) => s + parseFloat(f.paidAmount || 0), 0);
    res.json({ student, fees, totalDue, totalPaid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/fees/payment - record payment (admin), FIFO allocation
router.post('/payment', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { studentId, amount, method, reference, note } = req.body || {};
  if (!studentId || amount == null || !method) return res.status(400).json({ error: 'studentId, amount, method required' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!PAYMENT_METHODS.includes(String(method).toLowerCase())) return res.status(400).json({ error: 'method must be upi, cash, bank, or cheque' });
  try {
    await ensureStudentFees(studentId, (await supabase.from('Student').select('classId').eq('id', studentId).single()).data?.classId);
    const { data: pending } = await supabase.from('StudentFee').select('id, dueAmount').eq('studentId', studentId).gt('dueAmount', 0).order('year').order('month');
    let remaining = amt;
    const allocations = [];
    for (const sf of pending || []) {
      if (remaining <= 0) break;
      const due = parseFloat(sf.dueAmount);
      const apply = Math.min(remaining, due);
      if (apply <= 0) continue;
      allocations.push({ studentFeeId: sf.id, amount: apply });
      remaining -= apply;
    }
    const paymentId = cuid();
    await supabase.from('Payment').insert({
      id: paymentId,
      studentId,
      amount: amt,
      method: String(method).toLowerCase(),
      reference: reference?.trim() || null,
      note: note?.trim() || null,
      recordedBy: req.user.id,
    });
    for (const a of allocations) {
      const allocId = cuid();
      await supabase.from('FeePaymentAllocation').insert({ id: allocId, paymentId, studentFeeId: a.studentFeeId, amount: a.amount });
      const { data: sf } = await supabase.from('StudentFee').select('paidAmount, amount, dueAmount').eq('id', a.studentFeeId).single();
      const newPaid = parseFloat(sf?.paidAmount || 0) + a.amount;
      const totalAmt = parseFloat(sf?.amount || 0);
      const newDue = totalAmt - newPaid;
      const status = newDue <= 0 ? 'paid' : 'partial';
      await supabase.from('StudentFee').update({ paidAmount: newPaid, dueAmount: Math.max(0, newDue), status }).eq('id', a.studentFeeId);
    }
    const { data: payment } = await supabase.from('Payment').select('*').eq('id', paymentId).single();
    const { data: fees } = await supabase.from('StudentFee').select('*').eq('studentId', studentId).order('year').order('month');
    const totalDue = (fees || []).reduce((s, f) => s + parseFloat(f.dueAmount || 0), 0);
    res.status(201).json({ payment, fees, totalDue });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/summary - total due, collected (admin)
router.get('/summary', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ totalDue: 0, totalCollected: 0 });
  const { session } = req.query || {};
  try {
    let fees = (await supabase.from('StudentFee').select('dueAmount, paidAmount, month, year')).data || [];
    if (session) {
      const sessionMonths = getMonthsForSession(session);
      const sessionKeys = new Set(sessionMonths.map((m) => `${m.year}-${m.month}`));
      fees = fees.filter((f) => sessionKeys.has(`${f.year}-${f.month}`));
    }
    let totalDue = 0;
    let totalCollected = 0;
    fees.forEach((f) => {
      totalDue += parseFloat(f.dueAmount || 0);
      totalCollected += parseFloat(f.paidAmount || 0);
    });
    res.json({ totalDue, totalCollected });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/my-children - parent's children fee summary
// Query: summaryOnly=1 (fast, no fee history), session=2024-25, month=1-12, status=paid|pending|partial|all
router.get('/my-children', async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Forbidden' });
  if (!supabase) return res.json({ children: [], totalDue: 0, sessions: [] });
  try {
    const summaryOnly = req.query.summaryOnly === '1' || req.query.summaryOnly === 'true';
    const session = req.query.session;
    const month = req.query.month ? parseInt(req.query.month, 10) : null;
    const statusFilter = req.query.status || 'all';

    const { data: config } = await supabase.from('SchoolConfig').select('key, value');
    const cfg = {};
    (config || []).forEach((r) => { cfg[r.key] = r.value; });
    const feeStartYear = cfg.fee_start_year ? parseInt(cfg.fee_start_year, 10) : new Date().getFullYear() - 1;
    const sessions = getAvailableSessions(feeStartYear);

    const { data: parents } = await supabase.from('Parent').select('id').eq('userId', req.user.id);
    const parentIds = (parents || []).map((p) => p.id);
    const { data: links } = await supabase.from('StudentParent').select('studentId').in('parentId', parentIds);
    const studentIds = [...new Set((links || []).map((l) => l.studentId))];
    const children = [];
    let totalDue = 0;

    const sessionKeys = new Set();
    if (session) {
      getSessionMonths(session).forEach(({ year, month: m }) => sessionKeys.add(`${year}-${m}`));
    }

    let dueByStudent = {};
    if (summaryOnly && studentIds.length > 0) {
      const { data: allFees } = await supabase.from('StudentFee').select('studentId, dueAmount').in('studentId', studentIds);
      (allFees || []).forEach((f) => {
        dueByStudent[f.studentId] = (dueByStudent[f.studentId] || 0) + parseFloat(f.dueAmount || 0);
      });
    }

    for (const sid of studentIds) {
      const { data: student } = await supabase.from('Student').select('id, name, rollNo, classId, class:Class(id, name, section)').eq('id', sid).single();
      if (!student) continue;
      if (!summaryOnly) await ensureStudentFees(sid, student.classId);

      let fees = summaryOnly ? [] : ((await supabase.from('StudentFee').select('*').eq('studentId', sid).order('year').order('month')).data || []);

      if (!summaryOnly && fees.length > 0) {
        if (sessionKeys.size > 0) fees = fees.filter((f) => sessionKeys.has(`${f.year}-${f.month}`));
        if (month >= 1 && month <= 12) fees = fees.filter((f) => f.month === month);
        if (statusFilter !== 'all') fees = fees.filter((f) => (f.status || '').toLowerCase() === statusFilter.toLowerCase());
      }

      const childDue = summaryOnly ? (dueByStudent[sid] || 0) : fees.reduce((s, f) => s + parseFloat(f.dueAmount || 0), 0);
      totalDue += childDue;
      children.push({ student, fees, totalDue: childDue });
    }

    res.json({
      children,
      totalDue,
      sessions,
      feeUpiId: cfg.fee_upi_id || '',
      feeQrUrl: cfg.fee_qr_url || '',
      adminWhatsApp: cfg.admin_whatsapp || '',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/fees/receipt/:paymentId - PDF receipt (admin or parent of student)
router.get('/receipt/:paymentId', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: payment } = await supabase.from('Payment').select('*, student:Student(id, name, rollNo, class:Class(name, section))').eq('id', req.params.paymentId).single();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (req.user.role === 'PARENT') {
      const { data: links } = await supabase.from('StudentParent').select('parentId').eq('studentId', payment.studentId);
      const parentIds = (links || []).map((l) => l.parentId);
      const { data: parents } = await supabase.from('Parent').select('userId').in('id', parentIds);
      if (!(parents || []).some((p) => p.userId === req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    } else if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { data: allocs } = await supabase.from('FeePaymentAllocation').select('*, studentFee:StudentFee(month, year)').eq('paymentId', req.params.paymentId);
    res.json({ payment, allocations: allocs || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
