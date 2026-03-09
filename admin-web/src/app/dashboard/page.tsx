"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isAuthenticated, logout } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, homework: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    Promise.all([
      api.students.list(),
      api.teachers.list(),
      api.classes.list(),
      api.homework.list(),
    ])
      .then(([s, t, c, h]) => {
        setStats({
          students: (s as { data: unknown[] }).data.length,
          teachers: (t as { data: unknown[] }).data.length,
          classes: (c as { data: unknown[] }).data.length,
          homework: (h as { data: unknown[] }).data.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
            Dashboard
          </h1>
          <p className="text-[#64748B] mt-1 font-['Source_Sans_3']">
            Overview of your school
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace("/");
          }}
          className="text-sm text-[#64748B] hover:text-[#1E293B]"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Students", value: loading ? "…" : stats.students, color: "#0F766E" },
          { title: "Teachers", value: loading ? "…" : stats.teachers, color: "#D97706" },
          { title: "Classes", value: loading ? "…" : stats.classes, color: "#059669" },
          { title: "Homework", value: loading ? "…" : stats.homework, color: "#14B8A6" },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
          >
            <p className="text-sm font-medium text-[#64748B] font-['Source_Sans_3']">
              {card.title}
            </p>
            <p
              className="text-2xl font-bold mt-2 font-['Plus_Jakarta_Sans']"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h2 className="text-lg font-semibold text-[#1E293B] font-['Plus_Jakarta_Sans'] mb-4">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/import"
            className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium hover:bg-[#0d6b63] transition-colors"
          >
            Bulk Import
          </Link>
          <Link
            href="/dashboard/students"
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#1E293B] font-medium hover:bg-[#F8FAFC] transition-colors"
          >
            Add Student
          </Link>
          <Link
            href="/dashboard/teachers"
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#1E293B] font-medium hover:bg-[#F8FAFC] transition-colors"
          >
            Add Teacher
          </Link>
        </div>
      </div>
    </div>
  );
}
