const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, GIF allowed'));
  },
});

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.post('/student-image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5 MB' });
      return res.status(400).json({ error: err.message || 'Invalid file' });
    }
    next();
  });
}, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Storage not configured' });
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === 'student-images');
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket('student-images', { public: true });
      if (createErr) {
        return res.status(503).json({
          error: 'Create bucket "student-images" in Supabase Dashboard → Storage → New bucket (public).',
        });
      }
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const name = `student-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { data, error } = await supabase.storage
      .from('student-images')
      .upload(name, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    const { data: urlData } = supabase.storage.from('student-images').getPublicUrl(data.path);
    res.json({ url: urlData.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/teacher-image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5 MB' });
      return res.status(400).json({ error: err.message || 'Invalid file' });
    }
    next();
  });
}, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Storage not configured' });
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === 'teacher-images');
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket('teacher-images', { public: true });
      if (createErr) {
        return res.status(503).json({
          error: 'Create bucket "teacher-images" in Supabase Dashboard → Storage → New bucket (public).',
        });
      }
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const name = `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { data, error } = await supabase.storage
      .from('teacher-images')
      .upload(name, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    const { data: urlData } = supabase.storage.from('teacher-images').getPublicUrl(data.path);
    res.json({ url: urlData.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/banner-image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5 MB' });
      return res.status(400).json({ error: err.message || 'Invalid file' });
    }
    next();
  });
}, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Storage not configured' });
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === 'banner-images');
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket('banner-images', { public: true });
      if (createErr) {
        return res.status(503).json({
          error: 'Create bucket "banner-images" in Supabase Dashboard → Storage → New bucket (public).',
        });
      }
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const name = `banner-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { data, error } = await supabase.storage
      .from('banner-images')
      .upload(name, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (error) return res.status(500).json({ error: error.message });
    const { data: urlData } = supabase.storage.from('banner-images').getPublicUrl(data.path);
    res.json({ url: urlData.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
