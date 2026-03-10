"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, isAuthenticated } from "@/lib/api";

type Class = { id: string; name: string; section: string };
type FeeStructure = { id: string; classId: string; baseAmount?: number; amount?: number; examinationFee?: number; eventsFee?: number; otherFee?: number; lateFeePercent?: number; class?: Class };
type StudentFeeRow = { id: string; rollNo: string; name: string; classId: string; class?: Class; totalDue: number; pendingMonths: number };
type FeeRecord = { id: string; month: number; year: number; amount: number; paidAmount: number; dueAmount: number; status: string };

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PAYMENT_METHODS = ["upi", "cash", "bank", "cheque"];

function formatAmount(n: number) {
  return "₹" + (n || 0).toLocaleString("en-IN");
}

function getWhatsAppLink(adminWhatsApp: string, studentName: string, amount: number, ref?: string) {
  const num = (adminWhatsApp || "").replace(/\D/g, "").slice(-10);
  if (!num) return "";
  const msg = encodeURIComponent(
    `I have paid ${formatAmount(amount)} for ${studentName}.${ref ? ` UPI Ref: ${ref}` : ""}`
  );
  return `https://wa.me/91${num}?text=${msg}`;
}

export default function FeesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"summary" | "structure" | "extras" | "students" | "config">("summary");
  const [classes, setClasses] = useState<Class[]>([]);
  const [structure, setStructure] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<StudentFeeRow[]>([]);
  const [summary, setSummary] = useState({ totalDue: 0, totalCollected: 0 });
  const [config, setConfig] = useState({ feeUpiId: "", feeQrUrl: "", adminWhatsApp: "", feeStartYear: new Date().getFullYear() - 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [sessions, setSessions] = useState<string[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentFeeRow | null>(null);
  const [studentFees, setStudentFees] = useState<FeeRecord[]>([]);
  const [studentDetail, setStudentDetail] = useState<{ student: { name: string; rollNo: string; class?: Class }; totalDue: number; totalPaid: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "upi" as string, reference: "", note: "" });
  const [saving, setSaving] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState(config);
  const [editingStructure, setEditingStructure] = useState<Class | null>(null);
  const [structureForm, setStructureForm] = useState({ baseAmount: "", examinationFee: "", eventsFee: "", otherFee: "", lateFeePercent: "" });
  const [extras, setExtras] = useState<{ id: string; classId: string; month: number; year: number; feeType: string; amount: number; description?: string; class?: Class }[]>([]);
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraForm, setExtraForm] = useState({ classId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), feeType: "examination", amount: "", description: "" });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const [c, s, sum, cfg, sess] = await Promise.all([
        api.classes.list(),
        api.fees.structure(),
        api.fees.summary(filterSession || undefined),
        api.fees.config(),
        api.fees.sessions(),
      ]);
      setClasses((c as { data: Class[] }).data);
      setStructure((s as { data: FeeStructure[] }).data);
      setSummary(sum as { totalDue: number; totalCollected: number });
      const cfgData = cfg as { feeUpiId: string; feeQrUrl: string; adminWhatsApp: string; feeStartYear?: number };
      setConfig({
        feeUpiId: cfgData.feeUpiId ?? "",
        feeQrUrl: cfgData.feeQrUrl ?? "",
        adminWhatsApp: cfgData.adminWhatsApp ?? "",
        feeStartYear: cfgData.feeStartYear ?? new Date().getFullYear() - 1,
      });
      setConfigForm({
        feeUpiId: cfgData.feeUpiId ?? "",
        feeQrUrl: cfgData.feeQrUrl ?? "",
        adminWhatsApp: cfgData.adminWhatsApp ?? "",
        feeStartYear: cfgData.feeStartYear ?? new Date().getFullYear() - 1,
      });
      const sessList = (sess as { sessions: string[] }).sessions || [];
      setSessions(sessList);
      if (sessList.length && !filterSession) setFilterSession(sessList[sessList.length - 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const params: { classId?: string; search?: string; session?: string } = {};
      if (filterClass) params.classId = filterClass;
      if (filterSearch.trim()) params.search = filterSearch.trim();
      if (filterSession) params.session = filterSession;
      const r = await api.fees.students(Object.keys(params).length ? params : undefined);
      setStudents((r as { data: StudentFeeRow[] }).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    }
  }

  useEffect(() => {
    if (tab === "students") loadStudents();
    if (tab === "extras") api.fees.extras().then((r) => setExtras((r as { data: typeof extras }).data));
  }, [tab, filterClass, filterSearch, filterSession]);

  useEffect(() => {
    if (tab === "summary") {
      api.fees.summary(filterSession || undefined).then((s) => setSummary(s as { totalDue: number; totalCollected: number }));
    }
  }, [filterSession, tab]);

  async function openStudent(s: StudentFeeRow) {
    setSelectedStudent(s);
    try {
      const r = await api.fees.studentFees(s.id, filterSession || undefined);
      const data = r as { student: unknown; fees: FeeRecord[]; totalDue: number; totalPaid: number };
      setStudentFees(data.fees);
      setStudentDetail({ student: data.student as { name: string; rollNo: string; class?: Class }, totalDue: data.totalDue, totalPaid: data.totalPaid });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setError("");
    setSaving(true);
    try {
      await api.fees.recordPayment({
        studentId: selectedStudent.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
      });
      setPaymentForm({ amount: "", method: "upi", reference: "", note: "" });
      setShowPayment(false);
      openStudent(selectedStudent);
      load();
      if (filterSession) loadStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  function openEditStructure(c: Class) {
    const fs = structure.find((s) => s.classId === c.id);
    setEditingStructure(c);
    setStructureForm({
      baseAmount: String(fs?.baseAmount ?? fs?.amount ?? ""),
      examinationFee: String(fs?.examinationFee ?? ""),
      eventsFee: String(fs?.eventsFee ?? ""),
      otherFee: String(fs?.otherFee ?? ""),
      lateFeePercent: String(fs?.lateFeePercent ?? ""),
    });
  }

  async function handleStructureSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStructure) return;
    setError("");
    setSaving(true);
    try {
      await api.fees.updateStructure(editingStructure.id, {
        baseAmount: parseFloat(structureForm.baseAmount) || 0,
        examinationFee: parseFloat(structureForm.examinationFee) || 0,
        eventsFee: parseFloat(structureForm.eventsFee) || 0,
        otherFee: parseFloat(structureForm.otherFee) || 0,
        lateFeePercent: parseFloat(structureForm.lateFeePercent) || 0,
      });
      setEditingStructure(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfigSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.fees.updateConfig({ ...configForm, feeQrUrl: "" });
      setConfig({ ...configForm, feeQrUrl: "" });
      setShowConfig(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[#1E293B] font-['Plus_Jakarta_Sans']">
          Fee Management
        </h1>
        <button
          onClick={() => setShowConfig(true)}
          className="px-4 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] font-medium hover:bg-[#0F766E]/10"
        >
          UPI / QR / WhatsApp
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-[#E2E8F0]">
        {(["summary", "structure", "extras", "students", "config"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium capitalize ${tab === t ? "border-b-2 border-[#0F766E] text-[#0F766E]" : "text-[#64748B] hover:text-[#1E293B]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-[#64748B]">Session:</label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0]"
            >
              <option value="">All</option>
              {sessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60">
            <h3 className="text-sm font-medium text-[#64748B]">Total Due</h3>
            <p className="text-2xl font-bold text-[#DC2626] mt-1">{formatAmount(summary.totalDue)}</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]/60">
            <h3 className="text-sm font-medium text-[#64748B]">Total Collected</h3>
            <p className="text-2xl font-bold text-[#059669] mt-1">{formatAmount(summary.totalCollected)}</p>
          </div>
        </div>
        </div>
      )}

      {tab === "structure" && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h2 className="font-semibold text-[#1E293B]">Fee Structure by Class</h2>
            <p className="text-sm text-[#64748B] mt-1">Base monthly fee. Add extras (exam, events) via Fee Extras for specific months.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Base (₹/month)</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Exam Fee</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Events Fee</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Other</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Late %</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const fs = structure.find((s) => s.classId === c.id);
                  return (
                    <tr key={c.id} className="border-t border-[#E2E8F0]">
                      <td className="px-6 py-4 font-medium">{c.name}-{c.section}</td>
                      <td className="px-6 py-4">{formatAmount(fs?.baseAmount ?? fs?.amount ?? 0)}</td>
                      <td className="px-6 py-4">{formatAmount(fs?.examinationFee ?? 0)}</td>
                      <td className="px-6 py-4">{formatAmount(fs?.eventsFee ?? 0)}</td>
                      <td className="px-6 py-4">{formatAmount(fs?.otherFee ?? 0)}</td>
                      <td className="px-6 py-4">{(fs?.lateFeePercent ?? 0)}%</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEditStructure(c)}
                          className="text-[#0F766E] hover:underline text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "extras" && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <h2 className="font-semibold text-[#1E293B]">Fee Extras (Exam, Events)</h2>
            <button onClick={() => setShowAddExtra(true)} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium">
              + Add Extra
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Month</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Type</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Amount</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Description</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {extras.map((e) => (
                  <tr key={e.id} className="border-t border-[#E2E8F0]">
                    <td className="px-6 py-4">{e.class ? `${e.class.name}-${e.class.section}` : "—"}</td>
                    <td className="px-6 py-4">{MONTHS[e.month]} {e.year}</td>
                    <td className="px-6 py-4 capitalize">{e.feeType}</td>
                    <td className="px-6 py-4">{formatAmount(e.amount)}</td>
                    <td className="px-6 py-4">{e.description || "—"}</td>
                    <td className="px-6 py-4">
                      <button onClick={async () => { await api.fees.deleteExtra(e.id); setExtras((prev) => prev.filter((x) => x.id !== e.id)); }} className="text-red-600 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {extras.length === 0 && <div className="p-12 text-center text-[#64748B]">No extras. Add exam/events fee for specific months.</div>}
          </div>
        </div>
      )}

      {showAddExtra && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">Add Fee Extra</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSaving(true);
              try {
                await api.fees.addExtra({
                  classId: extraForm.classId,
                  month: extraForm.month,
                  year: extraForm.year,
                  feeType: extraForm.feeType,
                  amount: parseFloat(extraForm.amount),
                  description: extraForm.description || undefined,
                });
                setShowAddExtra(false);
                setExtraForm({ classId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), feeType: "examination", amount: "", description: "" });
                api.fees.extras().then((r) => setExtras((r as { data: typeof extras }).data));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed");
              } finally {
                setSaving(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Class</label>
                <select value={extraForm.classId} onChange={(e) => setExtraForm({ ...extraForm, classId: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" required>
                  <option value="">Select</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-1">Month</label>
                  <select value={extraForm.month} onChange={(e) => setExtraForm({ ...extraForm, month: parseInt(e.target.value, 10) })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                    {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-1">Year</label>
                  <input type="number" value={extraForm.year} onChange={(e) => setExtraForm({ ...extraForm, year: parseInt(e.target.value, 10) })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Type</label>
                <select value={extraForm.feeType} onChange={(e) => setExtraForm({ ...extraForm, feeType: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]">
                  <option value="examination">Examination</option>
                  <option value="events">Events</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Amount (₹)</label>
                <input type="number" step="0.01" value={extraForm.amount} onChange={(e) => setExtraForm({ ...extraForm, amount: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Description</label>
                <input value={extraForm.description} onChange={(e) => setExtraForm({ ...extraForm, description: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]" placeholder="e.g. Half-yearly exam" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddExtra(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">{saving ? "Adding…" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0]"
            >
              <option value="">All sessions</option>
              {sessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0]"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search student..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] min-w-[200px]"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Roll No</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Name</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Class</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Total Due</th>
                  <th className="text-left px-6 py-4 font-medium text-[#64748B] text-sm">Pending Months</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]/50">
                    <td className="px-6 py-4">{s.rollNo}</td>
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4">{s.class ? `${s.class.name}-${s.class.section}` : "—"}</td>
                    <td className="px-6 py-4 font-semibold text-[#DC2626]">{formatAmount(s.totalDue)}</td>
                    <td className="px-6 py-4">{s.pendingMonths}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openStudent(s)}
                        className="text-[#0F766E] hover:underline text-sm font-medium"
                      >
                        View / Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="p-12 text-center text-[#64748B]">No students found</div>
            )}
          </div>
        </div>
      )}

      {tab === "config" && (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6 max-w-xl">
          <h2 className="font-semibold text-[#1E293B] mb-4">Payment Config</h2>
          <p className="text-sm text-[#64748B] mb-4">These are shown to parents for UPI/QR payment. Admin WhatsApp receives &quot;I have paid&quot; notifications.</p>
          <dl className="space-y-2">
            <dt className="text-sm font-medium text-[#64748B]">UPI ID</dt>
            <dd className="font-mono">{config.feeUpiId || "—"}</dd>
            <dt className="text-sm font-medium text-[#64748B] mt-4">QR Code (auto-generated from UPI ID)</dt>
            <dd>
              {config.feeUpiId ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${config.feeUpiId}&pn=Sutara%20Mehi%20School&cu=INR`)}`}
                  alt="UPI QR Code"
                  className="w-36 h-36 mt-1 border border-[#E2E8F0] rounded-lg"
                />
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-sm font-medium text-[#64748B] mt-4">Admin WhatsApp</dt>
            <dd>{config.adminWhatsApp || "—"}</dd>
          </dl>
          <button
            onClick={() => setShowConfig(true)}
            className="mt-6 px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium"
          >
            Edit Config
          </button>
        </div>
      )}

      {/* Student detail modal */}
      {selectedStudent && studentDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <div>
                <h2 className="font-bold text-[#1E293B]">{studentDetail.student.name} — {studentDetail.student.rollNo}</h2>
                <p className="text-sm text-[#64748B]">
                  Total Due: {formatAmount(studentDetail.totalDue)} | Paid: {formatAmount(studentDetail.totalPaid)}
                </p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-2xl text-[#64748B] hover:text-[#1E293B]">×</button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-2">Month</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Paid</th>
                      <th className="text-right py-2">Due</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentFees.map((f) => (
                      <tr key={f.id} className="border-b border-[#E2E8F0]">
                        <td className="py-2">{MONTHS[f.month]} {f.year}</td>
                        <td className="text-right">{formatAmount(f.amount)}</td>
                        <td className="text-right text-[#059669]">{formatAmount(f.paidAmount)}</td>
                        <td className="text-right text-[#DC2626]">{formatAmount(f.dueAmount)}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            f.status === "paid" ? "bg-green-100 text-green-800" :
                            f.status === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                          }`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium"
                >
                  Record Payment
                </button>
                {config.adminWhatsApp && (
                  <a
                    href={getWhatsAppLink(config.adminWhatsApp, studentDetail.student.name, studentDetail.totalDue)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#25D366] text-white font-medium inline-flex items-center gap-2"
                  >
                    I have paid (WhatsApp)
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {showPayment && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">Record Payment</h3>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Reference (UPI ref, cheque no)</label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Note</label>
                <input
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPayment(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">
                  {saving ? "Saving…" : "Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit structure modal */}
      {editingStructure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">Edit Fee — {editingStructure.name}-{editingStructure.section}</h3>
            <form onSubmit={handleStructureSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Base Monthly (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={structureForm.baseAmount}
                  onChange={(e) => setStructureForm({ ...structureForm, baseAmount: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Examination Fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={structureForm.examinationFee}
                  onChange={(e) => setStructureForm({ ...structureForm, examinationFee: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Events Fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={structureForm.eventsFee}
                  onChange={(e) => setStructureForm({ ...structureForm, eventsFee: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Other Fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={structureForm.otherFee}
                  onChange={(e) => setStructureForm({ ...structureForm, otherFee: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Late Fee % (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={structureForm.lateFeePercent}
                  onChange={(e) => setStructureForm({ ...structureForm, lateFeePercent: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingStructure(null)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">Payment Config</h3>
            <form onSubmit={handleConfigSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">School UPI ID</label>
                <input
                  value={configForm.feeUpiId}
                  onChange={(e) => setConfigForm({ ...configForm, feeUpiId: e.target.value })}
                  placeholder="school@upi or admin@gmail.com"
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
                <p className="text-xs text-[#64748B] mt-1">QR code is auto-generated from this UPI ID</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Admin WhatsApp (10-digit)</label>
                <input
                  value={configForm.adminWhatsApp}
                  onChange={(e) => setConfigForm({ ...configForm, adminWhatsApp: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
                <p className="text-xs text-[#64748B] mt-1">Parents tap &quot;I have paid&quot; → opens WhatsApp to notify admin</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Fee Start Year</label>
                <input
                  type="number"
                  value={configForm.feeStartYear ?? ""}
                  onChange={(e) => setConfigForm({ ...configForm, feeStartYear: parseInt(e.target.value, 10) || new Date().getFullYear() - 1 })}
                  placeholder="e.g. 2023"
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0]"
                />
                <p className="text-xs text-[#64748B] mt-1">Fees generated from April of this year (e.g. 2023 for 2023-24)</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowConfig(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0]">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-medium disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
