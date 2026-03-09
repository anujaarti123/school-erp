"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, isAuthenticated } from "@/lib/api";

type Class = { id: string; name: string; section: string };

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", section: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const c = await api.classes.list();
      setClasses((c as { data: Class[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.classes.create(form);
      setForm({ name: "", section: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this class?")) return;
    try {
      await api.classes.delete(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
          Classes
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium hover:bg-[#0d6b63]"
        >
          {showForm ? "Cancel" : "Add Class"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 p-6 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        >
          <h2 className="text-lg font-semibold mb-4">New Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Name (e.g. 5)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0]"
              required
            />
            <input
              placeholder="Section (e.g. A)"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-[#1E293B]">Name</th>
              <th className="text-left px-6 py-4 font-medium text-[#1E293B]">Section</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-[#E2E8F0]">
                <td className="px-6 py-4">{c.name}</td>
                <td className="px-6 py-4">{c.section}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {classes.length === 0 && (
          <div className="p-12 text-center text-[#64748B]">No classes yet</div>
        )}
      </div>
    </div>
  );
}
