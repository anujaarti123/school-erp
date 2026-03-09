"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isAuthenticated } from "@/lib/api";

type Class = { id: string; name: string; section: string; level?: string; classTeacherId?: string | null };
type Teacher = { id: string; name: string; email?: string };

export default function AssignClassTeachersPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
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
      const [c, t] = await Promise.all([
        api.classes.list(),
        api.teachers.list(),
      ]);
      setClasses((c as { data: Class[] }).data);
      setTeachers((t as { data: Teacher[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(classId: string, teacherId: string | null) {
    setError("");
    setSaving(classId);
    try {
      await api.classes.update(classId, { classTeacherId: teacherId || null });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId ? { ...c, classTeacherId: teacherId || null } : c
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setSaving(null);
    }
  }

  const sortedClasses = [...classes].sort((a, b) => {
    const order = ["LKG", "UKG", "Play", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai !== bi) return ai - bi;
    return a.section.localeCompare(b.section);
  });

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard" className="text-[#64748B] hover:text-[#0F766E] text-sm">
            ← Dashboard
          </Link>
          <Link href="/dashboard/planner" className="text-[#64748B] hover:text-[#0F766E] text-sm">
            Timetable Planner →
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
          Assign Class Teachers
        </h1>
        <p className="text-[#64748B] mt-1 font-['Source_Sans_3'] text-sm">
          Assign one homeroom teacher per class. Then build the timetable in the Planner.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="font-semibold text-[#1E293B] font-['Plus_Jakarta_Sans']">
            Classes ({classes.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Level</th>
                <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class Teacher</th>
              </tr>
            </thead>
            <tbody>
              {sortedClasses.map((c) => (
                <tr key={c.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]/50">
                  <td className="px-6 py-4 font-medium text-[#1E293B]">
                    {c.name}-{c.section}
                  </td>
                  <td className="px-6 py-4 text-[#64748B] capitalize">
                    {c.level || "primary"}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={c.classTeacherId || ""}
                      onChange={(e) => handleAssign(c.id, e.target.value || null)}
                      disabled={saving === c.id}
                      className="px-4 py-2 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#0F766E]/30 min-w-[200px] disabled:opacity-60"
                    >
                      <option value="">— Select teacher —</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.email ? `(${t.email})` : ""}
                        </option>
                      ))}
                    </select>
                    {saving === c.id && (
                      <span className="ml-2 text-sm text-[#64748B]">Saving…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {classes.length === 0 && (
          <div className="p-16 text-center text-[#64748B]">
            No classes. <Link href="/dashboard/classes" className="text-[#0F766E] hover:underline">Add classes</Link> first.
          </div>
        )}
      </div>
    </div>
  );
}
