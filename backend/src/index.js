require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabase');

const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const classesRoutes = require('./routes/classes');
const homeworkRoutes = require('./routes/homework');
const teachersRoutes = require('./routes/teachers');
const uploadRoutes = require('./routes/upload');
const plannerRoutes = require('./routes/planner');
const notificationsRoutes = require('./routes/notifications');
const feesRoutes = require('./routes/fees');
const busRoutes = require('./routes/bus');
const parentRoutes = require('./routes/parent');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Root - API info
app.get('/', (req, res) => {
  res.json({
    name: 'School ERP API',
    status: 'running',
    db: supabase ? 'connected' : 'not configured',
    version: '1.0.0',
    endpoints: {
      auth: { login: 'POST /api/auth/login', register: 'POST /api/auth/register', parent: 'POST /api/auth/parent' },
      students: '/api/students',
      classes: '/api/classes',
      homework: '/api/homework',
      teachers: '/api/teachers',
    },
  });
});

// Health check (no auth)
app.get('/api/health', async (req, res) => {
  if (!supabase) {
    return res.json({ status: 'ok', db: 'not configured', message: 'Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env' });
  }
  try {
    const { error } = await supabase.from('User').select('id').limit(1);
    return res.json({ status: 'ok', db: error ? 'error' : 'connected', message: 'School ERP API' });
  } catch (e) {
    return res.json({ status: 'ok', db: 'error', message: e.message });
  }
});

// Auth (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/students', studentsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/bus', busRoutes);
app.use('/api/parent', parentRoutes);

app.listen(PORT, () => {
  console.log(`School ERP API running on http://localhost:${PORT}`);
  console.log(supabase ? 'Database: Supabase connected' : 'Database: Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env');
});
