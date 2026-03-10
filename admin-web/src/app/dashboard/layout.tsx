import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col">
        <div className="p-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <img
              src="/school_logo.png"
              alt="School Logo"
              className="h-10 w-10 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#B91C1C] font-['Plus_Jakarta_Sans'] leading-tight">
                SUTARA MEHI MISSION SCHOOL
              </h1>
              <p className="text-xs text-[#991B1B] font-semibold font-['Plus_Jakarta_Sans'] tracking-wide">
                KURSELA
              </p>
              <p className="text-xs text-[#64748B] mt-0.5 font-['Source_Sans_3']">
                Admin
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0F766E]/10 text-[#0F766E] font-medium"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/students"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Students
          </Link>
          <Link
            href="/dashboard/teachers"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Teachers
          </Link>
          <Link
            href="/dashboard/classes"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Classes
          </Link>
          <Link
            href="/dashboard/assign-class-teachers"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Assign Class Teachers
          </Link>
          <Link
            href="/dashboard/planner"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Timetable Planner
          </Link>
          <Link
            href="/dashboard/fees"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Fees
          </Link>
          <Link
            href="/dashboard/bus"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Bus
          </Link>
          <Link
            href="/dashboard/banners"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Banners
          </Link>
          <Link
            href="/dashboard/import"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          >
            Bulk Import
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
