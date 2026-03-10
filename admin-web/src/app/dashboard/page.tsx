"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isAuthenticated, logout } from "@/lib/api";

const CARD_CONFIG = [
  {
    title: "Students",
    valueKey: "students",
    gradient: "from-emerald-500 to-teal-600",
    icon: "👥",
    href: "/dashboard/students",
  },
  {
    title: "Teachers",
    valueKey: "teachers",
    gradient: "from-amber-500 to-orange-600",
    icon: "👨‍🏫",
    href: "/dashboard/teachers",
  },
  {
    title: "Classes",
    valueKey: "classes",
    gradient: "from-blue-500 to-indigo-600",
    icon: "📚",
    href: "/dashboard/classes",
  },
  {
    title: "Homework",
    valueKey: "homework",
    gradient: "from-violet-500 to-purple-600",
    icon: "📝",
    href: "/dashboard/planner",
  },
  {
    title: "Pending Fee Due",
    valueKey: "totalDue",
    gradient: "from-rose-500 to-red-600",
    icon: "₹",
    href: "/dashboard/fees",
    format: (v: number) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : v),
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    homework: 0,
    totalDue: 0,
  });
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
      api.fees.summary().catch(() => ({ totalDue: 0, totalCollected: 0 })),
    ])
      .then(([s, t, c, h, fees]) => {
        const feeSummary = fees as { totalDue: number; totalCollected: number };
        setStats({
          students: (s as { data: unknown[] }).data.length,
          teachers: (t as { data: unknown[] }).data.length,
          classes: (c as { data: unknown[] }).data.length,
          homework: (h as { data: unknown[] }).data.length,
          totalDue: feeSummary?.totalDue ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] font-['Plus_Jakarta_Sans'] tracking-tight">
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
          className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {CARD_CONFIG.map((card) => {
          const value = stats[card.valueKey as keyof typeof stats] ?? 0;
          const displayValue = card.format
            ? card.format(value as number)
            : loading
              ? "…"
              : value;
          return (
            <Link key={card.title} href={card.href}>
              <div
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-6 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 hover:-translate-y-0.5`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <span className="text-2xl opacity-90">{card.icon}</span>
                  <p className="text-white/90 text-sm font-medium mt-3 font-['Source_Sans_3']">
                    {card.title}
                  </p>
                  <p className="text-white text-2xl font-bold mt-1 font-['Plus_Jakarta_Sans'] tracking-tight">
                    {displayValue}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg shadow-black/5 border border-white/50">
        <h2 className="text-lg font-semibold text-[#0F172A] font-['Plus_Jakarta_Sans'] mb-4">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/import"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium shadow-md hover:shadow-lg hover:from-teal-600 hover:to-emerald-700 transition-all"
          >
            Bulk Import
          </Link>
          <Link
            href="/dashboard/students"
            className="px-5 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-[#1E293B] font-medium hover:border-teal-400 hover:bg-teal-50/50 transition-all"
          >
            Add Student
          </Link>
          <Link
            href="/dashboard/teachers"
            className="px-5 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-[#1E293B] font-medium hover:border-amber-400 hover:bg-amber-50/50 transition-all"
          >
            Add Teacher
          </Link>
        </div>
      </div>
    </div>
  );
}
