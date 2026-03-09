const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

router.use(authMiddleware);

// POST /api/notifications/register - Teacher registers FCM token for push
router.post('/register', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { token, platform } = req.body || {};
  if (!token || !token.trim()) return res.status(400).json({ error: 'token required' });
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: existing } = await supabase.from('DeviceToken').select('id').eq('userId', userId).eq('token', token.trim()).limit(1);
    if (existing?.length) return res.json({ success: true });
    const id = cuid();
    const { error } = await supabase.from('DeviceToken').insert({ id, userId, token: token.trim(), platform: platform || null });
    if (error && error.code !== '23505') return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
