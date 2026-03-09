"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, isAuthenticated, uploadStudentImage } from "@/lib/api";

type Student = {
  id: string;
  rollNo: string;
  name: string;
  classId: string;
  address?: string;
  busStop?: string;
  bloodGroup?: string;
  imageUrl?: string;
  class?: { name: string; section: string };
  parents?: { name: string; phone?: string; address?: string; profession?: string }[];
};
type Class = { id: string; name: string; section: string };

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PROFESSIONS = [
  "Government Employee",
  "Private Sector",
  "Business / Self-employed",
  "Teacher",
  "Doctor",
  "Engineer",
  "Lawyer",
  "Farmer",
  "Homemaker",
  "Retired",
  "Daily Wage Worker",
  "Other",
];

const FORM_INIT = {
  rollNo: "",
  name: "",
  classId: "",
  parentName: "",
  parentPhone: "",
  parentProfession: "",
  address: "",
  busStop: "",
  bloodGroup: "",
  imageUrl: "",
};

export default function StudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [duplicateWarn, setDuplicateWarn] = useState<string | null>(null);
  const [parentFoundMsg, setParentFoundMsg] = useState<string | null>(null);

  const [filterSearch, setFilterSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterBlood, setFilterBlood] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState(FORM_INIT);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
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
      const params: { classId?: string; bloodGroup?: string; search?: string } = {};
      if (filterClass) params.classId = filterClass;
      if (filterBlood) params.bloodGroup = filterBlood;
      if (filterSearch.trim()) params.search = filterSearch.trim();
      const [s, c] = await Promise.all([
        api.students.list(Object.keys(params).length ? params : undefined),
        api.classes.list(),
      ]);
      setStudents((s as { data: Student[] }).data);
      setClasses((c as { data: Class[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) return;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [filterSearch, filterClass, filterBlood]);

  async function lookupParentByPhone(phone: string, isEdit: boolean) {
    const p = phone.replace(/\D/g, "").slice(-10);
    if (p.length < 10) {
      if (!isEdit) setParentFoundMsg(null);
      return;
    }
    try {
      const res = await api.students.parentLookup(p);
      if (res.found && res.parent) {
        if (isEdit) {
          setEditForm((f) => ({
            ...f,
            parentName: res.parent!.name || f.parentName,
            parentPhone: f.parentPhone || res.parent!.phone || "",
            address: res.parent!.address || f.address,
            parentProfession: res.parent!.profession || f.parentProfession,
          }));
        } else {
          setForm((f) => ({
            ...f,
            parentName: res.parent!.name || f.parentName,
            parentPhone: f.parentPhone || res.parent!.phone || "",
            address: res.parent!.address || f.address,
            parentProfession: res.parent!.profession || f.parentProfession,
          }));
          setParentFoundMsg(`Linked to existing parent: ${res.parent!.name}`);
          setTimeout(() => setParentFoundMsg(null), 4000);
        }
      } else {
        setParentFoundMsg(null);
      }
    } catch {
      setParentFoundMsg(null);
    }
  }

  async function checkDuplicate() {
    if (!form.rollNo || !form.classId) return;
    setDuplicateWarn(null);
    try {
      const res = (await api.students.checkDuplicate({
        rollNo: form.rollNo,
        classId: form.classId,
        parentPhone: form.parentPhone,
        studentName: form.name,
      })) as { duplicate: boolean; matches: { type: string; student: { name: string; rollNo: string } }[] };
      if (res.duplicate && res.matches?.length) {
        const m = res.matches[0];
        setDuplicateWarn(`Possible duplicate: ${m.student?.name} (Roll ${m.student?.rollNo}) in this class.`);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (form.rollNo && form.classId) {
      const t = setTimeout(() => checkDuplicate(), 500);
      return () => clearTimeout(t);
    } else {
      setDuplicateWarn(null);
    }
  }, [form.rollNo, form.classId, form.parentPhone, form.name]);

  // Auto-fill parent when 10 digits entered (debounced)
  useEffect(() => {
    const p = form.parentPhone.replace(/\D/g, "").slice(-10);
    if (p.length < 10) return;
    const t = setTimeout(() => lookupParentByPhone(form.parentPhone, false), 600);
    return () => clearTimeout(t);
  }, [form.parentPhone]);

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
      const url = await uploadStudentImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
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
    setDuplicateWarn(null);
    if (!form.parentName.trim() || !form.parentPhone.trim()) {
      setError("Parent name and phone are required");
      return;
    }
    const phone = form.parentPhone.replace(/\D/g, "").slice(-10);
    if (phone.length < 10) {
      setError("Enter a valid 10-digit parent phone number");
      return;
    }
    setSaving(true);
    try {
      await api.students.create({
        rollNo: form.rollNo.trim(),
        name: form.name.trim(),
        classId: form.classId,
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        parentProfession: form.parentProfession || undefined,
        address: form.address.trim() || undefined,
        busStop: form.busStop.trim() || undefined,
        bloodGroup: form.bloodGroup || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      });
      setForm(FORM_INIT);
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add student");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(s: Student) {
    setEditingStudent(s);
    setEditForm({
      rollNo: s.rollNo || "",
      name: s.name || "",
      classId: s.classId || "",
      parentName: s.parents?.[0]?.name || "",
      parentPhone: s.parents?.[0]?.phone || "",
      parentProfession: s.parents?.[0]?.profession || "",
      address: s.address || s.parents?.[0]?.address || "",
      busStop: s.busStop || "",
      bloodGroup: s.bloodGroup || "",
      imageUrl: s.imageUrl || "",
    });
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
      const url = await uploadStudentImage(file);
      setEditForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setError("");
    setSaving(true);
    try {
      await api.students.update(editingStudent.id, {
        rollNo: editForm.rollNo.trim(),
        name: editForm.name.trim(),
        classId: editForm.classId,
        parentName: editForm.parentName.trim(),
        parentPhone: editForm.parentPhone.trim(),
        parentProfession: editForm.parentProfession || undefined,
        address: editForm.address.trim() || undefined,
        busStop: editForm.busStop.trim() || undefined,
        bloodGroup: editForm.bloodGroup || undefined,
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
      setEditingStudent(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update student");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    try {
      await api.students.delete(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const sortedClasses = [...classes].sort((a, b) => {
    const order = ["LKG", "UKG", "Play", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai !== bi) return ai - bi;
    return a.section.localeCompare(b.section);
  });

  if (loading && students.length === 0) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
            Student Catalog
          </h1>
          <p className="text-[#64748B] mt-1 font-['Source_Sans_3'] text-sm">
            Add and manage students with parent details, health info & image upload
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowBulk(!showBulk);
              setShowForm(false);
              setBulkResult(null);
            }}
            className="px-5 py-2.5 rounded-lg border-2 border-[#0F766E] text-[#0F766E] font-semibold hover:bg-[#0F766E]/10 transition-colors"
          >
            {showBulk ? "Cancel" : "Bulk Import"}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowBulk(false);
              setForm(FORM_INIT);
              setError("");
              setDuplicateWarn(null);
            }}
            className="px-5 py-2.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] transition-colors shadow-sm"
          >
            {showForm ? "Cancel" : "+ Add Student"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Advanced filter */}
      <div className="mb-6 p-5 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#E2E8F0]/60">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans']">
          Search & Filter
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#64748B] mb-1">Search</label>
            <input
              type="search"
              placeholder="Name, roll no, phone, address, bus stop, blood group..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30"
            >
              <option value="">All classes</option>
              {sortedClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Blood Group</label>
            <select
              value={filterBlood}
              onChange={(e) => setFilterBlood(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30"
            >
              <option value="">All</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showBulk && (
        <div className="mb-10 p-8 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60">
          <h2 className="text-lg font-bold text-[#1E293B] mb-2 font-['Plus_Jakarta_Sans']">Bulk Import Students</h2>
          <p className="text-[#64748B] text-sm mb-6">Download the template, fill in student details, and upload. Same parent phone = auto-link; 100+ students in one go.</p>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => api.students.downloadTemplate().catch((e) => setError(e.message))}
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
                  const r = await api.students.bulkUpload(bulkFile);
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

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-8 py-5">
            <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              Add New Student
            </h2>
            <p className="text-white/90 text-sm mt-1 font-['Source_Sans_3']">
              All fields support search & duplicate prevention
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* Student details */}
            <div>
              <h3 className="text-sm font-semibold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans'] uppercase tracking-wide">
                Student Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Roll No *</label>
                  <input
                    placeholder="e.g. 101"
                    value={form.rollNo}
                    onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Student Name *</label>
                  <input
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Class *</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  >
                    <option value="">
                      {sortedClasses.length === 0 ? "No classes — run: node scripts/seed-classes.js" : "Select class"}
                    </option>
                    {sortedClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.section}
                      </option>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Student Photo</label>
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
              </div>
            </div>

            {/* Parent details */}
            <div>
              <h3 className="text-sm font-semibold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans'] uppercase tracking-wide">
                Parent / Guardian Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Parent Name *</label>
                  <input
                    placeholder="Guardian full name"
                    value={form.parentName}
                    onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Parent Phone No *</label>
                  <input
                    type="tel"
                    placeholder="Type 10-digit mobile — name, address, profession auto-fill if parent exists"
                    value={form.parentPhone}
                    onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                    onBlur={() => lookupParentByPhone(form.parentPhone, false)}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  />
                  {parentFoundMsg && (
                    <p className="mt-2 text-sm text-[#059669] font-medium">✓ {parentFoundMsg}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Parent Profession</label>
                  <select
                    value={form.parentProfession}
                    onChange={(e) => setForm({ ...form, parentProfession: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  >
                    <option value="">Select profession</option>
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Address & transport */}
            <div>
              <h3 className="text-sm font-semibold text-[#1E293B] mb-4 font-['Plus_Jakarta_Sans'] uppercase tracking-wide">
                Address & Transport
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Address</label>
                  <textarea
                    placeholder="Full address (street, city, PIN)"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Bus Stop</label>
                  <input
                    placeholder="Nearest bus stop / pickup point"
                    value={form.busStop}
                    onChange={(e) => setForm({ ...form, busStop: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>
            </div>

            {duplicateWarn && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                ⚠ {duplicateWarn}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] disabled:opacity-60 transition-colors"
              >
                {saving ? "Adding…" : "Add Student"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Student list */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="font-semibold text-[#1E293B] font-['Plus_Jakarta_Sans']">
            Student List ({students.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Roll No</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Name</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Blood</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Parent</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Profession</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Phone</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Bus Stop</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]/50">
                  <td className="px-6 py-4 font-medium text-[#1E293B]">{s.rollNo}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0F766E]/15 flex items-center justify-center text-[#0F766E] font-semibold">
                          {(s.name || "?").charAt(0)}
                        </div>
                      )}
                      {s.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#64748B]">
                    {s.class ? `${s.class.name}-${s.class.section}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-[#64748B] font-medium">{s.bloodGroup || "—"}</td>
                  <td className="px-6 py-4 text-[#64748B]">
                    {s.parents?.[0]?.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-[#64748B] text-sm">
                    {s.parents?.[0]?.profession || "—"}
                  </td>
                  <td className="px-6 py-4 text-[#64748B] font-mono text-sm">
                    {s.parents?.[0]?.phone || "—"}
                  </td>
                  <td className="px-6 py-4 text-[#64748B] text-sm">
                    {s.busStop || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-[#0F766E] hover:text-[#0d6b63] text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <div className="p-16 text-center text-[#64748B]">
            No students found. {filterSearch || filterClass || filterBlood ? "Try adjusting filters." : "Click \"Add Student\" to add your first student."}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-8 py-5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Edit Student</h2>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-white/90 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Roll No *</label>
                  <input
                    value={editForm.rollNo}
                    onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Student Name *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Class *</label>
                  <select
                    value={editForm.classId}
                    onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  >
                    {sortedClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Student Photo</label>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Parent Name *</label>
                  <input
                    value={editForm.parentName}
                    onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Parent Phone *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone — details auto-fill if exists"
                    value={editForm.parentPhone}
                    onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    onBlur={() => lookupParentByPhone(editForm.parentPhone, true)}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-2">Parent Profession</label>
                  <select
                    value={editForm.parentProfession}
                    onChange={(e) => setEditForm({ ...editForm, parentProfession: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="">Select</option>
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Bus Stop</label>
                <input
                  value={editForm.busStop}
                  onChange={(e) => setEditForm({ ...editForm, busStop: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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
