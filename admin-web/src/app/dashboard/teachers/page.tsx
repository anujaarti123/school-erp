"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, isAuthenticated, uploadTeacherImage } from "@/lib/api";

type Teacher = {
  id: string;
  name: string;
  email?: string;
  userId: string;
  fatherHusbandName?: string;
  specialization?: string;
  category?: string;
  bloodGroup?: string;
  experience?: string;
  address?: string;
  imageUrl?: string;
};
type Assignment = { id: string; teacherId: string; classId: string; teacher?: { name: string }; class?: { name: string; section: string } };
type Class = { id: string; name: string; section: string };

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SPECIALIZATIONS = [
  "Mathematics",
  "Science",
  "English",
  "Hindi",
  "Social Studies",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Physical Education",
  "Art",
  "Music",
  "Sanskrit",
  "Other",
];
const CATEGORIES = ["Permanent", "Contract"];

const FORM_INIT = {
  name: "",
  email: "",
  password: "",
  fatherHusbandName: "",
  specialization: "",
  category: "",
  bloodGroup: "",
  experience: "",
  address: "",
  imageUrl: "",
};

export default function TeachersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState(FORM_INIT);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number; errors: { row: number; msg: string }[] } | null>(null);

  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ teacherId: "", classId: "" });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const [t, a, c] = await Promise.all([
        api.teachers.list(),
        api.teachers.assignments(),
        api.classes.list(),
      ]);
      setTeachers((t as { data: Teacher[] }).data);
      setAssignments((a as { data: Assignment[] }).data);
      setClasses((c as { data: Class[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadTeacherImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadTeacherImage(file);
      setEditForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.teachers.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        fatherHusbandName: form.fatherHusbandName.trim() || undefined,
        specialization: form.specialization || undefined,
        category: form.category || undefined,
        bloodGroup: form.bloodGroup || undefined,
        experience: form.experience.trim() || undefined,
        address: form.address.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      });
      setForm(FORM_INIT);
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add teacher");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(t: Teacher) {
    setEditingTeacher(t);
    setEditForm({
      name: t.name || "",
      email: t.email || "",
      password: "",
      fatherHusbandName: t.fatherHusbandName || "",
      specialization: t.specialization || "",
      category: t.category || "",
      bloodGroup: t.bloodGroup || "",
      experience: t.experience || "",
      address: t.address || "",
      imageUrl: t.imageUrl || "",
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeacher) return;
    setError("");
    setSaving(true);
    try {
      await api.teachers.update(editingTeacher.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        password: editForm.password || undefined,
        fatherHusbandName: editForm.fatherHusbandName.trim() || undefined,
        specialization: editForm.specialization || undefined,
        category: editForm.category || undefined,
        bloodGroup: editForm.bloodGroup || undefined,
        experience: editForm.experience.trim() || undefined,
        address: editForm.address.trim() || undefined,
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
      setEditingTeacher(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update teacher");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this teacher? This will remove their login and cannot be undone.")) return;
    try {
      await api.teachers.delete(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.teachers.addAssignment(assignForm);
      setAssignForm({ teacherId: "", classId: "" });
      setShowAssign(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAssignment(id: string) {
    if (!confirm("Remove this assignment?")) return;
    try {
      await api.teachers.removeAssignment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  const sortedClasses = [...classes].sort((a, b) => {
    const order = ["LKG", "UKG", "Play", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai !== bi) return ai - bi;
    return a.section.localeCompare(b.section);
  });

  if (loading && teachers.length === 0) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
            Teachers
          </h1>
          <p className="text-[#64748B] mt-1 font-['Source_Sans_3'] text-sm">
            Manage teachers with profile, specialization & login for mobile app
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowBulk(!showBulk);
              setShowForm(false);
              setShowAssign(false);
              setBulkResult(null);
            }}
            className="px-5 py-2.5 rounded-lg border-2 border-[#0F766E] text-[#0F766E] font-semibold hover:bg-[#0F766E]/10 transition-colors"
          >
            {showBulk ? "Cancel" : "Bulk Import"}
          </button>
          <button
            onClick={() => {
              setShowAssign(!showAssign);
              setShowForm(false);
              setShowBulk(false);
            }}
            className="px-5 py-2.5 rounded-lg border-2 border-[#0F766E] text-[#0F766E] font-semibold hover:bg-[#0F766E]/10 transition-colors"
          >
            {showAssign ? "Cancel" : "Assign to Class"}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowBulk(false);
              setShowAssign(false);
              setForm(FORM_INIT);
              setError("");
            }}
            className="px-5 py-2.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] transition-colors shadow-sm"
          >
            {showForm ? "Cancel" : "+ Add Teacher"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {showBulk && (
        <div className="mb-10 p-8 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60">
          <h2 className="text-lg font-bold text-[#1E293B] mb-2 font-['Plus_Jakarta_Sans']">Bulk Import Teachers</h2>
          <p className="text-[#64748B] text-sm mb-6">Download the template, fill in teacher details. Each teacher gets a login (email + password) for the mobile app.</p>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => api.teachers.downloadTemplate().catch((e) => setError(e.message))}
              className="px-5 py-2.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63]"
            >
              Download Template
            </button>
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
                  const r = await api.teachers.bulkUpload(bulkFile);
                  setBulkResult(r);
                  load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Upload failed");
                } finally {
                  setSaving(false);
                }
              }}
              className="px-5 py-2.5 rounded-lg border-2 border-[#0F766E] text-[#0F766E] font-semibold hover:bg-[#0F766E]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Uploading…" : "Upload & Import"}
            </button>
          </div>
          {bulkResult && (
            <div className="mt-6 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="font-semibold text-[#1E293B]">
                Added: {bulkResult.added} | Skipped: {bulkResult.skipped}
              </p>
              {bulkResult.errors.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-[#64748B] mb-2">Errors:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {bulkResult.errors.slice(0, 20).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.msg}</li>
                    ))}
                    {bulkResult.errors.length > 20 && (
                      <li>… and {bulkResult.errors.length - 20} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAssign && (
        <form
          onSubmit={handleAssignSubmit}
          className="mb-10 p-8 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60"
        >
          <h2 className="text-lg font-bold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans']">Assign Teacher to Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={assignForm.teacherId}
              onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
              className="px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30"
              required
            >
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email || "—"})
                </option>
              ))}
            </select>
            <select
              value={assignForm.classId}
              onChange={(e) => setAssignForm({ ...assignForm, classId: e.target.value })}
              className="px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30"
              required
            >
              <option value="">Select class</option>
              {sortedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.section}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 px-6 py-2.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Assign"}
          </button>
        </form>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-8 py-5">
            <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              Add New Teacher
            </h2>
            <p className="text-white/90 text-sm mt-1 font-['Source_Sans_3']">
              Teacher can login to mobile app with email & password
            </p>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans'] uppercase tracking-wide">
                Basic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Name *</label>
                  <input
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Father / Husband Name</label>
                  <input
                    placeholder="Father or husband name"
                    value={form.fatherHusbandName}
                    onChange={(e) => setForm({ ...form, fatherHusbandName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Email * (Login)</label>
                  <input
                    type="email"
                    placeholder="teacher@school.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Password *</label>
                  <input
                    type="password"
                    placeholder="Login password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Specialization</label>
                  <select
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  >
                    <option value="">Select subject</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  >
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  >
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Experience</label>
                  <input
                    placeholder="e.g. 5 years"
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Photo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2.5 rounded-lg border-2 border-dashed border-[#E2E8F0] hover:border-[#0F766E]/50 text-[#64748B] hover:text-[#0F766E] transition-colors disabled:opacity-60"
                    >
                      {uploading ? "Uploading…" : "Upload Image"}
                    </button>
                    <span className="text-[#64748B] text-sm">or</span>
                    <input
                      type="url"
                      placeholder="Paste image URL"
                      value={form.imageUrl}
                      onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      className="flex-1 min-w-[180px] px-4 py-2.5 rounded-lg border border-[#E2E8F0]"
                    />
                    {form.imageUrl && (
                      <div className="flex items-center gap-2">
                        <img src={form.imageUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-[#E2E8F0]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} className="text-red-600 text-sm">Remove</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Address</label>
                  <textarea
                    placeholder="Full address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] disabled:opacity-60 transition-colors"
              >
                {saving ? "Adding…" : "Add Teacher"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Teacher cards */}
      <div className="mb-10">
        <h2 className="font-semibold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans']">
          Teacher List ({teachers.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#0F766E]/15 flex items-center justify-center text-[#0F766E] font-bold text-xl flex-shrink-0">
                      {(t.name || "?").charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1E293B] truncate">{t.name}</h3>
                    <p className="text-sm text-[#64748B] truncate">{t.fatherHusbandName || "—"}</p>
                    <p className="text-sm text-[#0F766E] font-medium truncate">{t.email || "—"}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {t.specialization || "—"} • {t.category || "—"} • {t.bloodGroup || "—"}
                    </p>
                    {t.experience && (
                      <p className="text-xs text-[#64748B]">Exp: {t.experience}</p>
                    )}
                    {t.address && (
                      <p className="text-xs text-[#64748B] truncate mt-1" title={t.address}>{t.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] font-medium text-sm hover:bg-[#0F766E]/10"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="flex-1 py-2 rounded-lg border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {teachers.length === 0 && (
          <div className="p-16 text-center text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]/60">
            No teachers yet. Click &quot;Add Teacher&quot; or use Bulk Import.
          </div>
        )}
      </div>

      {/* Class Assignments */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="font-semibold text-[#1E293B] font-['Plus_Jakarta_Sans']">
            Class Assignments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Teacher</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]/50">
                  <td className="px-6 py-4">{a.teacher?.name ?? "—"}</td>
                  <td className="px-6 py-4">
                    {a.class ? `${a.class.name}-${a.class.section}` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRemoveAssignment(a.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assignments.length === 0 && (
            <div className="p-12 text-center text-[#64748B]">No assignments yet. Use &quot;Assign to Class&quot; to link teachers to classes.</div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-8 py-5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Edit Teacher</h2>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="text-white/90 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Name *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Father / Husband Name</label>
                  <input
                    value={editForm.fatherHusbandName}
                    onChange={(e) => setEditForm({ ...editForm, fatherHusbandName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Email * (Login)</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">New Password (leave blank to keep)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Specialization</label>
                  <select
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="">Select</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Experience</label>
                  <input
                    value={editForm.experience}
                    onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Photo</label>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleEditImageChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2.5 rounded-lg border-2 border-dashed border-[#E2E8F0] hover:border-[#0F766E]/50 text-[#64748B] hover:text-[#0F766E] disabled:opacity-60"
                    >
                      {uploading ? "Uploading…" : "Upload New Image"}
                    </button>
                    <span className="text-[#64748B] text-sm">or</span>
                    <input
                      type="url"
                      placeholder="Paste image URL"
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      className="flex-1 min-w-[180px] px-4 py-2.5 rounded-lg border border-[#E2E8F0]"
                    />
                    {editForm.imageUrl && (
                      <div className="flex items-center gap-2">
                        <img src={editForm.imageUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-[#E2E8F0]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <button type="button" onClick={() => setEditForm((f) => ({ ...f, imageUrl: "" }))} className="text-red-600 text-sm">Remove</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Address</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#64748B] font-medium hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
