"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, isAuthenticated } from "@/lib/api";

type Driver = { id: string; name: string; phone?: string };
type Vehicle = { id: string; busNumber: string; registration?: string };
type BusStop = { id: string; routeId: string; name: string; sequence: number; arrivalTime?: string; departureTime?: string };
type Route = {
  id: string;
  name: string;
  driverId?: string;
  vehicleId?: string;
  driver?: Driver;
  vehicle?: Vehicle;
  stops?: BusStop[];
};
type Class = { id: string; name: string; section: string };
type Student = {
  id: string;
  rollNo: string;
  name: string;
  busRouteId?: string;
  pickupStopId?: string;
  dropStopId?: string;
  class?: Class;
};

export default function BusPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"drivers" | "vehicles" | "routes" | "students">("drivers");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ name: "", phone: "" });
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ busNumber: "", registration: "" });
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeForm, setRouteForm] = useState({ name: "", driverId: "", vehicleId: "", stops: [] as { name: string; arrivalTime: string; departureTime: string }[] });
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudent, setAssignStudent] = useState<Student | null>(null);
  const [assignForm, setAssignForm] = useState({ busRouteId: "", pickupStopId: "", dropStopId: "" });
  const [routeStops, setRouteStops] = useState<BusStop[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const [d, v, r, c] = await Promise.all([
        api.bus.drivers(),
        api.bus.vehicles(),
        api.bus.routes(),
        api.classes.list(),
      ]);
      setDrivers((d as { data: Driver[] }).data);
      setVehicles((v as { data: Vehicle[] }).data);
      setRoutes((r as { data: Route[] }).data);
      setClasses((c as { data: Class[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const params: { classId?: string; search?: string } = {};
      if (filterClass) params.classId = filterClass;
      const r = await api.students.list(params);
      setStudents((r as { data: Student[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    }
  }

  useEffect(() => {
    if (tab === "students") loadStudents();
  }, [tab, filterClass]);

  async function handleDriverSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingDriver) {
        await api.bus.updateDriver(editingDriver.id, { name: driverForm.name, phone: driverForm.phone || undefined });
      } else {
        await api.bus.createDriver({ name: driverForm.name, phone: driverForm.phone || undefined });
      }
      setShowDriverForm(false);
      setEditingDriver(null);
      setDriverForm({ name: "", phone: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleVehicleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingVehicle) {
        await api.bus.updateVehicle(editingVehicle.id, { busNumber: vehicleForm.busNumber, registration: vehicleForm.registration || undefined });
      } else {
        await api.bus.createVehicle({ busNumber: vehicleForm.busNumber, registration: vehicleForm.registration || undefined });
      }
      setShowVehicleForm(false);
      setEditingVehicle(null);
      setVehicleForm({ busNumber: "", registration: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRouteSave(e: React.FormEvent) {
    e.preventDefault();
    if (!routeForm.name.trim()) return;
    setError("");
    setSaving(true);
    try {
      const stops = routeForm.stops.filter((s) => s.name.trim()).map((s) => ({
        name: s.name.trim(),
        arrivalTime: s.arrivalTime?.trim() || undefined,
        departureTime: s.departureTime?.trim() || undefined,
      }));
      if (editingRoute) {
        await api.bus.updateRoute(editingRoute.id, {
          name: routeForm.name,
          driverId: routeForm.driverId || undefined,
          vehicleId: routeForm.vehicleId || undefined,
          stops,
        });
      } else {
        await api.bus.createRoute({
          name: routeForm.name,
          driverId: routeForm.driverId || undefined,
          vehicleId: routeForm.vehicleId || undefined,
          stops,
        });
      }
      setShowRouteForm(false);
      setEditingRoute(null);
      setRouteForm({ name: "", driverId: "", vehicleId: "", stops: [] });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignSave(e: React.FormEvent) {
    e.preventDefault();
    if (!assignStudent) return;
    setError("");
    setSaving(true);
    try {
      await api.bus.assignStudentBus(assignStudent.id, {
        busRouteId: assignForm.busRouteId || undefined,
        pickupStopId: assignForm.pickupStopId || undefined,
        dropStopId: assignForm.dropStopId || undefined,
      });
      setShowAssignModal(false);
      setAssignStudent(null);
      setAssignForm({ busRouteId: "", pickupStopId: "", dropStopId: "" });
      loadStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function openAssign(s: Student) {
    setAssignStudent(s);
    setAssignForm({
      busRouteId: s.busRouteId || "",
      pickupStopId: s.pickupStopId || "",
      dropStopId: s.dropStopId || "",
    });
    setRouteStops([]);
    if (s.busRouteId) {
      const route = routes.find((r) => r.id === s.busRouteId);
      setRouteStops(route?.stops || []);
    }
    setShowAssignModal(true);
  }

  function onAssignRouteChange(routeId: string) {
    setAssignForm((prev) => ({ ...prev, busRouteId: routeId, pickupStopId: "", dropStopId: "" }));
    const route = routes.find((r) => r.id === routeId);
    setRouteStops(route?.stops || []);
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">Bus Management</h1>
      <p className="text-[#64748B] mt-2 font-['Source_Sans_3']">Drivers, vehicles, routes, and student assignment.</p>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">{error}</div>
      )}

      <div className="flex gap-2 mt-6 border-b border-[#E2E8F0]">
        {(["drivers", "vehicles", "routes", "students"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium capitalize ${tab === t ? "border-b-2 border-[#0F766E] text-[#0F766E]" : "text-[#64748B] hover:text-[#1E293B]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "drivers" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#1E293B]">Drivers</h2>
            <button
              onClick={() => {
                setEditingDriver(null);
                setDriverForm({ name: "", phone: "" });
                setShowDriverForm(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium"
            >
              + Add Driver
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Name</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Phone</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-t border-[#E2E8F0]">
                    <td className="px-6 py-4 font-medium">{d.name}</td>
                    <td className="px-6 py-4">{d.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditingDriver(d);
                          setDriverForm({ name: d.name, phone: d.phone || "" });
                          setShowDriverForm(true);
                        }}
                        className="text-[#0F766E] hover:underline text-sm mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("Delete this driver?")) {
                            await api.bus.deleteDriver(d.id);
                            load();
                          }
                        }}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drivers.length === 0 && <div className="p-12 text-center text-[#64748B]">No drivers. Add one to get started.</div>}
          </div>
        </div>
      )}

      {tab === "vehicles" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#1E293B]">Vehicles</h2>
            <button
              onClick={() => {
                setEditingVehicle(null);
                setVehicleForm({ busNumber: "", registration: "" });
                setShowVehicleForm(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium"
            >
              + Add Vehicle
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Bus Number</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Registration</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-t border-[#E2E8F0]">
                    <td className="px-6 py-4 font-medium">{v.busNumber}</td>
                    <td className="px-6 py-4">{v.registration || "—"}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditingVehicle(v);
                          setVehicleForm({ busNumber: v.busNumber, registration: v.registration || "" });
                          setShowVehicleForm(true);
                        }}
                        className="text-[#0F766E] hover:underline text-sm mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("Delete this vehicle?")) {
                            await api.bus.deleteVehicle(v.id);
                            load();
                          }
                        }}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vehicles.length === 0 && <div className="p-12 text-center text-[#64748B]">No vehicles. Add one to get started.</div>}
          </div>
        </div>
      )}

      {tab === "routes" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#1E293B]">Routes</h2>
            <button
              onClick={() => {
                setEditingRoute(null);
                setRouteForm({ name: "", driverId: "", vehicleId: "", stops: [{ name: "", arrivalTime: "", departureTime: "" }] });
                setShowRouteForm(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium"
            >
              + Add Route
            </button>
          </div>
          <div className="overflow-x-auto">
            {routes.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6 mb-4 border border-[#E2E8F0]/60">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#1E293B]">{r.name}</h3>
                    <p className="text-sm text-[#64748B] mt-1">
                      Driver: {r.driver?.name || "—"} | Bus: {r.vehicle?.busNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setEditingRoute(r);
                        setRouteForm({
                          name: r.name,
                          driverId: r.driverId || "",
                          vehicleId: r.vehicleId || "",
                          stops: (r.stops || []).length
                            ? r.stops!.map((s) => ({ name: s.name, arrivalTime: s.arrivalTime || "", departureTime: s.departureTime || "" }))
                            : [{ name: "", arrivalTime: "", departureTime: "" }],
                        });
                        setShowRouteForm(true);
                      }}
                      className="text-[#0F766E] hover:underline text-sm mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Delete this route?")) {
                          await api.bus.deleteRoute(r.id);
                          load();
                        }
                      }}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-sm">
                  <span className="font-medium text-[#64748B]">Stops:</span>
                  <ul className="mt-1 space-y-1">
                    {(r.stops || []).map((s, i) => (
                      <li key={s.id}>
                        {i + 1}. {s.name} — Arrival: {s.arrivalTime || "—"} | Departure: {s.departureTime || "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            {routes.length === 0 && <div className="p-12 text-center text-[#64748B] bg-white rounded-2xl">No routes. Add drivers and vehicles first, then create a route.</div>}
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0]"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Roll No</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Name</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Route</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const route = routes.find((r) => r.id === s.busRouteId);
                  return (
                    <tr key={s.id} className="border-t border-[#E2E8F0]">
                      <td className="px-6 py-4">{s.rollNo}</td>
                      <td className="px-6 py-4 font-medium">{s.name}</td>
                      <td className="px-6 py-4">{s.class ? `${s.class.name}-${s.class.section}` : "—"}</td>
                      <td className="px-6 py-4">{route?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => openAssign(s)} className="text-[#0F766E] hover:underline text-sm">
                          Assign
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {students.length === 0 && <div className="p-12 text-center text-[#64748B]">No students found</div>}
          </div>
        </div>
      )}

      {/* Driver form modal */}
      {showDriverForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">{editingDriver ? "Edit Driver" : "Add Driver"}</h3>
            <form onSubmit={handleDriverSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Name</label>
                <input value={driverForm.name} onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Phone</label>
                <input value={driverForm.phone} onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" placeholder="10-digit" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowDriverForm(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle form modal */}
      {showVehicleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</h3>
            <form onSubmit={handleVehicleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Bus Number</label>
                <input value={vehicleForm.busNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, busNumber: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" placeholder="e.g. KA-01-AB-1234" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Registration</label>
                <input value={vehicleForm.registration} onChange={(e) => setVehicleForm({ ...vehicleForm, registration: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowVehicleForm(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route form modal */}
      {showRouteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h3 className="font-bold text-[#1E293B] mb-4">{editingRoute ? "Edit Route" : "Add Route"}</h3>
            <form onSubmit={handleRouteSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Route Name</label>
                <input value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" placeholder="e.g. Route 1" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-1">Driver</label>
                  <select value={routeForm.driverId} onChange={(e) => setRouteForm({ ...routeForm, driverId: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                    <option value="">Select</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-1">Vehicle</label>
                  <select value={routeForm.vehicleId} onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                    <option value="">Select</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.busNumber}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Stops (name, arrival time, departure time)</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {routeForm.stops.map((s, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={s.name} onChange={(e) => setRouteForm({ ...routeForm, stops: routeForm.stops.map((s2, j) => (j === i ? { ...s2, name: e.target.value } : s2)) })} placeholder="Stop name" className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0]" />
                      <input value={s.arrivalTime} onChange={(e) => setRouteForm({ ...routeForm, stops: routeForm.stops.map((s2, j) => (j === i ? { ...s2, arrivalTime: e.target.value } : s2)) })} placeholder="7:15 AM" className="w-24 px-3 py-2 rounded-lg border border-[#E2E8F0]" />
                      <input value={s.departureTime} onChange={(e) => setRouteForm({ ...routeForm, stops: routeForm.stops.map((s2, j) => (j === i ? { ...s2, departureTime: e.target.value } : s2)) })} placeholder="2:45 PM" className="w-24 px-3 py-2 rounded-lg border border-[#E2E8F0]" />
                      <button type="button" onClick={() => setRouteForm({ ...routeForm, stops: routeForm.stops.filter((_, j) => j !== i) })} className="text-red-600 text-sm">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setRouteForm({ ...routeForm, stops: [...routeForm.stops, { name: "", arrivalTime: "", departureTime: "" }] })} className="text-[#0F766E] text-sm">+ Add stop</button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRouteForm(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign student modal */}
      {showAssignModal && assignStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">Assign Bus — {assignStudent.name}</h3>
            <form onSubmit={handleAssignSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Route</label>
                <select value={assignForm.busRouteId} onChange={(e) => onAssignRouteChange(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                  <option value="">None</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              {assignForm.busRouteId && routeStops.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Pickup Stop</label>
                    <select value={assignForm.pickupStopId} onChange={(e) => setAssignForm({ ...assignForm, pickupStopId: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                      <option value="">Select</option>
                      {routeStops.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.arrivalTime || "—"})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Drop Stop</label>
                    <select value={assignForm.dropStopId} onChange={(e) => setAssignForm({ ...assignForm, dropStopId: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                      <option value="">Select</option>
                      {routeStops.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.departureTime || "—"})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
