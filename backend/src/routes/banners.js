const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);
const MAX_BANNERS = 3;

// GET /api/banners - public, for parent app carousel
router.get('/', (req, res) => {
  if (!supabase) return res.json({ banners: [] });
  supabase
    .from('SchoolConfig')
    .select('value')
    .eq('key', 'banners')
    .single()
    .then(({ data, error }) => {
      if (error || !data?.value) return res.json({ banners: [] });
      try {
        const banners = JSON.parse(data.value);
        const list = Array.isArray(banners) ? banners.slice(0, MAX_BANNERS) : [];
        res.json({ banners: list });
      } catch {
        res.json({ banners: [] });
      }
    })
    .catch(() => res.json({ banners: [] }));
});

// PUT /api/banners - admin only, set banners (max 3)
router.put('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { banners } = req.body || {};
  if (!Array.isArray(banners)) return res.status(400).json({ error: 'banners must be an array' });
  const list = banners.slice(0, MAX_BANNERS).map((b, i) => ({
    id: b.id || cuid(),
    imageUrl: b.imageUrl || '',
    title: b.title || '',
    sortOrder: b.sortOrder ?? i,
  }));
  try {
    const { data: ex } = await supabase.from('SchoolConfig').select('id').eq('key', 'banners').single();
    const value = JSON.stringify(list);
    if (ex) {
      await supabase.from('SchoolConfig').update({ value }).eq('key', 'banners');
    } else {
      await supabase.from('SchoolConfig').insert({ id: cuid(), key: 'banners', value });
    }
    res.json({ banners: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
