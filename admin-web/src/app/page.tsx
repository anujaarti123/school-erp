"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, isAuthenticated } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#0F766E] font-['Plus_Jakarta_Sans']">
            School ERP
          </h1>
          <p className="text-[#64748B] mt-2 font-['Source_Sans_3']">
            Admin Dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
          style={{ fontFamily: "'Source Sans 3', sans-serif" }}
        >
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6 font-['Plus_Jakarta_Sans']">
            Sign in
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#64748B]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#64748B]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3 px-4 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d6b63] transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
