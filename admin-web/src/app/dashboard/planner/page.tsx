"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isAuthenticated } from "@/lib/api";

type Class = { id: string; name: string; section: string; level?: string };
type Teacher = { id: string; name: string; specialization?: string };
type Slot = {
  id: string;
  classId: string;
  subject: string;
  teacherId: string;
  dayOfWeek: number;
  periodNumber: number;
  class?: { id: string; name: string; section: string };
  teacher?: { name: string };
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PlannerPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class");
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [config, setConfig] = useState<{ subjects: string[]; primaryPeriods: number; secondaryPeriods: number } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [addForm, setAddForm] = useState({ subject: "", teacherId: "", dayOfWeek: 1, periodNumber: 1 });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkReplace, setBulkReplace] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number; errors: { row: number; msg: string }[] } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const [c, t, cfg] = await Promise.all([
        api.classes.list(),
        api.teachers.list(),
        api.planner.config(),
      ]);
      setClasses((c as { data: Class[] }).data);
      setTeachers((t as { data: Teacher[] }).data);
      setConfig(cfg);
      const sorted = (c as { data: Class[] }).data;
      if (sorted.length && !selectedClassId) setSelectedClassId(sorted[0].id);
      if ((t as { data: Teacher[] }).data.length && !selectedTeacherId) setSelectedTeacherId((t as { data: Teacher[] }).data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedClassId && !selectedTeacherId) return;
    loadSlots();
  }, [selectedClassId, selectedTeacherId, viewMode]);

  async function loadSlots() {
    if (!selectedClassId && !selectedTeacherId) return;
    try {
      const params = viewMode === "class" ? { classId: selectedClassId } : { teacherId: selectedTeacherId };
      const r = await api.planner.listSlots(params);
      setSlots((r as { data: Slot[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slots");
    }
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const periodCount = selectedClass?.level === "secondary"
    ? ((config as { secondaryPeriods?: number })?.secondaryPeriods ?? 8)
    : ((config as { primaryPeriods?: number })?.primaryPeriods ?? 6);

  function getSlot(day: number, period: number): Slot | undefined {
    return slots.find((s) => s.dayOfWeek === day && s.periodNumber === period);
  }

  async function handleCreateSlot() {
    if (!selectedClassId || !addForm.subject || !addForm.teacherId) {
      setError("Select class, subject and teacher");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.planner.createSlot({
        classId: selectedClassId,
        subject: addForm.subject,
        teacherId: addForm.teacherId,
        dayOfWeek: addForm.dayOfWeek,
        periodNumber: addForm.periodNumber,
      });
      setAddForm({ subject: "", teacherId: "", dayOfWeek: 1, periodNumber: 1 });
      setShowAddSlot(false);
      loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add slot");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSlot() {
    if (!editingSlot) return;
    setError("");
    setSaving(true);
    try {
      await api.planner.updateSlot(editingSlot.id, {
        subject: editingSlot.subject,
        teacherId: editingSlot.teacherId,
        dayOfWeek: editingSlot.dayOfWeek,
        periodNumber: editingSlot.periodNumber,
      });
      setEditingSlot(null);
      loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!confirm("Remove this slot?")) return;
    try {
      await api.planner.deleteSlot(id);
      loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard/assign-class-teachers" className="text-[#64748B] hover:text-[#0F766E] text-sm">
            ← Assign Class Teachers
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
          Timetable Planner
        </h1>
        <p className="text-[#64748B] mt-1 font-['Source_Sans_3'] text-sm">
          Build weekly timetable by class or by teacher. Mon–Sat, 6 periods (primary) / 8 periods (secondary).
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {showBulk && (
        <div className="mb-6 p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60">
          <h2 className="text-lg font-bold text-[#1E293B] mb-2">Bulk Import Timetable</h2>
          <p className="text-[#64748B] text-sm mb-4">
            Upload your school&apos;s planner Excel. Columns: Class (5A), Day (Mon-Sat), Period (1-8), Subject, Teacher Email.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => api.planner.downloadTemplate().catch((e) => setError(e.message))}
              className="px-5 py-2.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63]"
            >
              Download Template
            </button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkReplace}
                onChange={(e) => setBulkReplace(e.target.checked)}
              />
              <span className="text-sm">Replace existing timetable</span>
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              disabled={!bulkFile || saving}
              onClick={async () => {
                if (!bulkFile) return;
                setError("");
                setBulkResult(null);
                setSaving(true);
                try {
                  const r = await api.planner.bulkUpload(bulkFile, bulkReplace);
                  setBulkResult(r);
                  if (selectedClassId) loadSlots();
                  else load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Upload failed");
                } finally {
                  setSaving(false);
                }
              }}
              className="px-5 py-2.5 rounded-lg border-2 border-[#0F766E] text-[#0F766E] font-semibold hover:bg-[#0F766E]/10 disabled:opacity-50"
            >
              {saving ? "Uploading…" : "Upload & Import"}
            </button>
            <button
              onClick={() => { setShowBulk(false); setBulkResult(null); }}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B]"
            >
              Close
            </button>
          </div>
          {bulkResult && (
            <div className="mt-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="font-semibold text-[#1E293B]">Added: {bulkResult.added} | Skipped: {bulkResult.skipped}</p>
              {bulkResult.errors.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto">
                  <p className="text-sm font-medium text-[#64748B] mb-2">Errors:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {bulkResult.errors.slice(0, 15).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.msg}</li>
                    ))}
                    {bulkResult.errors.length > 15 && <li>… and {bulkResult.errors.length - 15} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setShowBulk(!showBulk)}
          className={`px-4 py-2 rounded-lg font-medium ${showBulk ? "border-2 border-[#0F766E] text-[#0F766E]" : "bg-[#0F766E] text-white hover:bg-[#0d6b63]"}`}
        >
          {showBulk ? "Cancel Import" : "Bulk Import"}
        </button>
        <div className="flex rounded-lg border-2 border-[#E2E8F0] p-1">
          <button
            onClick={() => setViewMode("class")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "class" ? "bg-[#0F766E] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            By Class
          </button>
          <button
            onClick={() => setViewMode("teacher")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "teacher" ? "bg-[#0F766E] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            By Teacher
          </button>
        </div>

        {viewMode === "class" && (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 min-w-[140px]"
          >
            <option value="">Select class</option>
            {classes
              .sort((a, b) => {
                const o = ["LKG", "UKG", "Play", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
                return o.indexOf(a.name) - o.indexOf(b.name) || a.section.localeCompare(b.section);
              })
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}-{c.section}
                </option>
              ))}
          </select>
        )}

        {viewMode === "teacher" && (
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 min-w-[200px]"
          >
            <option value="">Select teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.specialization ? `(${t.specialization})` : ""}
              </option>
            ))}
          </select>
        )}

        {viewMode === "class" && selectedClassId && (
          <button
            onClick={() => setShowAddSlot(true)}
            className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium hover:bg-[#0d6b63]"
          >
            + Add Slot
          </button>
        )}
      </div>

      {viewMode === "class" && selectedClassId && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <h2 className="font-semibold text-[#1E293B]">
              {selectedClass?.name}-{selectedClass?.section} — {periodCount} periods/day
            </h2>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-16 p-2 text-left text-xs font-medium text-[#64748B]">Period</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className="p-2 text-center text-xs font-medium text-[#64748B] min-w-[120px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periodCount }, (_, p) => p + 1).map((period) => (
                  <tr key={period} className="border-t border-[#E2E8F0]">
                    <td className="p-2 font-medium text-[#1E293B]">P{period}</td>
                    {DAYS.map((_, dayIdx) => {
                      const day = dayIdx + 1;
                      const slot = getSlot(day, period);
                      return (
                        <td key={day} className="p-2 align-top">
                          {slot ? (
                            <div
                              className="p-2 rounded-lg bg-[#0F766E]/10 border border-[#0F766E]/30 cursor-pointer hover:bg-[#0F766E]/20"
                              onClick={() => setEditingSlot(slot)}
                            >
                              <div className="font-medium text-[#0F766E] text-sm">{slot.subject}</div>
                              <div className="text-xs text-[#64748B]">{slot.teacher?.name || "—"}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSlot(slot.id);
                                }}
                                className="mt-1 text-xs text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddForm((f) => ({ ...f, dayOfWeek: day, periodNumber: period }));
                                setShowAddSlot(true);
                              }}
                              className="w-full min-h-[60px] p-2 rounded-lg border-2 border-dashed border-[#E2E8F0] text-[#64748B] hover:border-[#0F766E]/50 hover:text-[#0F766E] text-sm"
                            >
                              + Add
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "teacher" && selectedTeacherId && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h2 className="font-semibold text-[#1E293B]">
              {selectedTeacher?.name} — {slots.length} slots
            </h2>
          </div>
          <div className="p-6">
            {slots.length === 0 ? (
              <p className="text-[#64748B]">No slots assigned. Switch to &quot;By Class&quot; to add slots.</p>
            ) : (
              <div className="space-y-2">
                {slots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <span className="font-medium">{DAYS[s.dayOfWeek - 1]} P{s.periodNumber}</span>
                    <span className="text-[#0F766E]">{s.subject}</span>
                    <span>{s.class ? `${s.class.name}-${s.class.section}` : "—"}</span>
                    <button
                      onClick={() => handleDeleteSlot(s.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddSlot && viewMode === "class" && selectedClassId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Add Slot</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Day</label>
                <select
                  value={addForm.dayOfWeek}
                  onChange={(e) => setAddForm({ ...addForm, dayOfWeek: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i + 1}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Period</label>
                <select
                  value={addForm.periodNumber}
                  onChange={(e) => setAddForm({ ...addForm, periodNumber: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                >
                  {Array.from({ length: periodCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>P{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Subject</label>
                <select
                  value={addForm.subject}
                  onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                  required
                >
                  <option value="">Select subject</option>
                  {(config?.subjects || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Teacher</label>
                <select
                  value={addForm.teacherId}
                  onChange={(e) => setAddForm({ ...addForm, teacherId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddSlot(false)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSlot}
                disabled={saving || !addForm.subject || !addForm.teacherId}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Edit Slot</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Subject</label>
                <select
                  value={editingSlot.subject}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subject: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                >
                  {(config?.subjects || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Teacher</label>
                <select
                  value={editingSlot.teacherId}
                  onChange={(e) => setEditingSlot({ ...editingSlot, teacherId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSlot}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
