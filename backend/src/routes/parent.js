const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/parent/children - parent's children with class teacher & image
router.get('/children', async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Forbidden' });
  if (!supabase) return res.json({ children: [] });
  try {
    const { data: parents } = await supabase.from('Parent').select('id').eq('userId', req.user.id);
    const parentIds = (parents || []).map((p) => p.id);
    const { data: links } = await supabase.from('StudentParent').select('studentId').in('parentId', parentIds);
    const studentIds = [...new Set((links || []).map((l) => l.studentId))];
    const children = [];
    for (const sid of studentIds) {
      const { data: student, error: studentErr } = await supabase
        .from('Student')
        .select('id, name, rollNo, imageUrl, classId, class:Class(id, name, section)')
        .eq('id', sid)
        .single();
      if (studentErr || !student) continue;
      let classTeacher = null;
      const classData = student.class;
      const classId = classData?.id || student.classId;
      let ctId = null;
      if (classId) {
        const { data: cls } = await supabase.from('Class').select('classTeacherId').eq('id', classId).single();
        ctId = cls?.classTeacherId;
      }
      if (ctId) {
        const { data: teacher } = await supabase.from('Teacher').select('id, name, userId').eq('id', ctId).single();
        if (teacher) {
          const { data: u } = await supabase.from('User').select('email, phone').eq('id', teacher.userId || '').single();
          classTeacher = {
            name: teacher.name,
            email: u?.email || null,
            phone: u?.phone || null,
          };
        }
      }
      children.push({
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        imageUrl: student.imageUrl || null,
        class: classData ? { id: classData.id, name: classData.name, section: classData.section } : null,
        classTeacher,
      });
    }
    res.json({ children });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
