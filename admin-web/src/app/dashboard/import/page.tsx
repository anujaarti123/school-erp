"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/api";

export default function ImportPage() {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) router.replace("/");
  }, [router]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
        Bulk Import
      </h1>
      <p className="text-[#64748B] mt-2 font-['Source_Sans_3']">
        Excel/CSV import for students, results, attendance — coming soon
      </p>
    </div>
  );
}
