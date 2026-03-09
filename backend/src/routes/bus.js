const express = require('express');
const { supabase } = require('../supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const cuid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);

router.use(authMiddleware);

// --- Drivers ---
router.get('/drivers', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    const { data, error } = await supabase.from('BusDriver').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/drivers', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { name, phone } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const id = cuid();
    await supabase.from('BusDriver').insert({ id, name: String(name).trim(), phone: phone?.trim() || null });
    const { data } = await supabase.from('BusDriver').select('*').eq('id', id).single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/drivers/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { name, phone } = req.body || {};
  try {
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates' });
    await supabase.from('BusDriver').update(updates).eq('id', req.params.id);
    const { data } = await supabase.from('BusDriver').select('*').eq('id', req.params.id).single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/drivers/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    await supabase.from('BusRoute').update({ driverId: null }).eq('driverId', req.params.id);
    await supabase.from('BusDriver').delete().eq('id', req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Vehicles ---
router.get('/vehicles', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    const { data, error } = await supabase.from('BusVehicle').select('*').order('busNumber');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/vehicles', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { busNumber, registration } = req.body || {};
  if (!busNumber?.trim()) return res.status(400).json({ error: 'Bus number required' });
  try {
    const id = cuid();
    await supabase.from('BusVehicle').insert({
      id,
      busNumber: String(busNumber).trim(),
      registration: registration?.trim() || null,
    });
    const { data } = await supabase.from('BusVehicle').select('*').eq('id', id).single();
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/vehicles/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { busNumber, registration } = req.body || {};
  try {
    const updates = {};
    if (busNumber !== undefined) updates.busNumber = String(busNumber).trim();
    if (registration !== undefined) updates.registration = registration ? String(registration).trim() : null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates' });
    await supabase.from('BusVehicle').update(updates).eq('id', req.params.id);
    const { data } = await supabase.from('BusVehicle').select('*').eq('id', req.params.id).single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/vehicles/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    await supabase.from('BusRoute').update({ vehicleId: null }).eq('vehicleId', req.params.id);
    await supabase.from('BusVehicle').delete().eq('id', req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function enrichRoute(route) {
  if (!route) return null;
  const { data: stops } = await supabase.from('BusStop').select('*').eq('routeId', route.id).order('sequence');
  route.stops = stops || [];
  if (route.driverId) {
    const { data: d } = await supabase.from('BusDriver').select('id, name, phone').eq('id', route.driverId).single();
    route.driver = d || null;
  } else route.driver = null;
  if (route.vehicleId) {
    const { data: v } = await supabase.from('BusVehicle').select('id, busNumber, registration').eq('id', route.vehicleId).single();
    route.vehicle = v || null;
  } else route.vehicle = null;
  return route;
}

// --- Routes ---
router.get('/routes', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    const { data, error } = await supabase.from('BusRoute').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    const routes = [];
    for (const r of data || []) {
      routes.push(await enrichRoute({ ...r }));
    }
    res.json({ data: routes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/routes', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { name, driverId, vehicleId, stops } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Route name required' });
  try {
    const id = cuid();
    const { error: insertErr } = await supabase.from('BusRoute').insert({
      id,
      name: String(name).trim(),
      stops: [], // legacy column (NOT NULL); actual stops in BusStop table
      driverId: driverId || null,
      vehicleId: vehicleId || null,
    });
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    if (Array.isArray(stops) && stops.length) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        const stopId = cuid();
        await supabase.from('BusStop').insert({
          id: stopId,
          routeId: id,
          name: String(s.name || '').trim() || `Stop ${i + 1}`,
          sequence: i + 1,
          arrivalTime: s.arrivalTime?.trim() || null,
          departureTime: s.departureTime?.trim() || null,
        });
      }
    }
    const { data: route } = await supabase.from('BusRoute').select('*').eq('id', id).single();
    const result = await enrichRoute(route || { id, name: String(name).trim(), driverId: driverId || null, vehicleId: vehicleId || null });
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/routes/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { name, driverId, vehicleId, stops } = req.body || {};
  if (!req.params.id) return res.status(400).json({ error: 'Route ID required' });
  try {
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (driverId !== undefined) updates.driverId = driverId || null;
    if (vehicleId !== undefined) updates.vehicleId = vehicleId || null;
    if (Object.keys(updates).length) {
      await supabase.from('BusRoute').update(updates).eq('id', req.params.id);
    }
    if (Array.isArray(stops)) {
      await supabase.from('BusStop').delete().eq('routeId', req.params.id);
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        const stopId = cuid();
        await supabase.from('BusStop').insert({
          id: stopId,
          routeId: req.params.id,
          name: String(s.name || '').trim() || `Stop ${i + 1}`,
          sequence: i + 1,
          arrivalTime: s.arrivalTime?.trim() || null,
          departureTime: s.departureTime?.trim() || null,
        });
      }
    }
    const { data: route } = await supabase.from('BusRoute').select('*').eq('id', req.params.id).single();
    const result = await enrichRoute(route || { id: req.params.id, name: name ?? '', driverId: driverId || null, vehicleId: vehicleId || null });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/routes/:id', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    await supabase.from('Student').update({ busRouteId: null, pickupStopId: null, dropStopId: null }).eq('busRouteId', req.params.id);
    await supabase.from('BusStop').delete().eq('routeId', req.params.id);
    await supabase.from('BusRoute').delete().eq('id', req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Students on route (for admin assignment) ---
router.get('/routes/:id/students', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.json({ data: [] });
  try {
    const { data, error } = await supabase
      .from('Student')
      .select('id, rollNo, name, busRouteId, pickupStopId, dropStopId, class:Class(id, name, section)')
      .eq('busRouteId', req.params.id)
      .order('rollNo');
    if (error) return res.status(500).json({ error: error.message });
    const students = data || [];
    const { data: stops } = await supabase.from('BusStop').select('*').eq('routeId', req.params.id).order('sequence');
    res.json({ data: students, stops: stops || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Assign student to route ---
router.put('/students/:studentId/bus', requireRole('ADMIN'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { busRouteId, pickupStopId, dropStopId } = req.body || {};
  try {
    const updates = {};
    if (busRouteId !== undefined) updates.busRouteId = busRouteId || null;
    if (pickupStopId !== undefined) updates.pickupStopId = pickupStopId || null;
    if (dropStopId !== undefined) updates.dropStopId = dropStopId || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates' });
    await supabase.from('Student').update(updates).eq('id', req.params.studentId);
    const { data } = await supabase
      .from('Student')
      .select('id, rollNo, name, busRouteId, pickupStopId, dropStopId, class:Class(id, name, section)')
      .eq('id', req.params.studentId)
      .single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Parent: my children's bus info ---
router.get('/my-children', async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Forbidden' });
  if (!supabase) return res.json({ children: [] });
  try {
    const { data: parents } = await supabase.from('Parent').select('id').eq('userId', req.user.id);
    const parentIds = (parents || []).map((p) => p.id);
    const { data: links } = await supabase.from('StudentParent').select('studentId').in('parentId', parentIds);
    const studentIds = [...new Set((links || []).map((l) => l.studentId))];
    const children = [];
    for (const sid of studentIds) {
      const { data: student } = await supabase
        .from('Student')
        .select('id, name, rollNo, imageUrl, busRouteId, pickupStopId, dropStopId, class:Class(id, name, section)')
        .eq('id', sid)
        .single();
      if (!student) continue;
      let busInfo = null;
      if (student.busRouteId) {
        const { data: route } = await supabase
          .from('BusRoute')
          .select('id, name, driver:BusDriver(id, name, phone), vehicle:BusVehicle(id, busNumber, registration)')
          .eq('id', student.busRouteId)
          .single();
        if (route) {
          const { data: pickupStop } = student.pickupStopId
            ? await supabase.from('BusStop').select('*').eq('id', student.pickupStopId).single()
            : { data: null };
          const { data: dropStop } = student.dropStopId
            ? await supabase.from('BusStop').select('*').eq('id', student.dropStopId).single()
            : { data: null };
          busInfo = {
            route: { id: route.id, name: route.name, driver: route.driver, vehicle: route.vehicle },
            pickup: pickupStop,
            drop: dropStop,
          };
        }
      }
      children.push({ student, busInfo });
    }
    res.json({ children });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
