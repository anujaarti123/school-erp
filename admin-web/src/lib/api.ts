const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  if (data.token) localStorage.setItem("auth_token", data.token);
  return data;
}

export async function registerTeacher(email: string, password: string, name: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, role: "TEACHER" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export function logout() {
  localStorage.removeItem("auth_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    window.location.href = "/";
    throw new Error("Session expired");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export async function uploadTeacherImage(file: File): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_URL}/api/upload/teacher-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

export async function uploadStudentImage(file: File): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_URL}/api/upload/student-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

export const api = {
  students: {
    parentLookup: (phone: string) =>
      fetchApi<{ found: boolean; parent?: { name: string; phone?: string; address?: string; profession?: string } }>(
        `/api/students/parent-lookup?phone=${encodeURIComponent(phone)}`
      ),
    list: (params?: { classId?: string; bloodGroup?: string; search?: string }) =>
      fetchApi<{ data: unknown[] }>(
        params ? `/api/students?${new URLSearchParams(params as Record<string, string>).toString()}` : "/api/students"
      ),
    checkDuplicate: (params: { rollNo?: string; classId?: string; parentPhone?: string; studentName?: string }) =>
      fetchApi<{ duplicate: boolean; matches: unknown[] }>(
        `/api/students/check-duplicate?${new URLSearchParams(params as Record<string, string>).toString()}`
      ),
    create: (body: {
      rollNo: string;
      name: string;
      classId: string;
      parentName: string;
      parentPhone: string;
      parentProfession?: string;
      address?: string;
      busStop?: string;
      bloodGroup?: string;
      imageUrl?: string;
    }) =>
      fetchApi("/api/students", { method: "POST", body: JSON.stringify(body) }),
    getOne: (id: string) => fetchApi(`/api/students/${id}`),
    update: (
      id: string,
      body: Partial<{
        rollNo: string;
        name: string;
        classId: string;
        address?: string;
        busStop?: string;
        bloodGroup?: string;
        imageUrl?: string;
        parentName?: string;
        parentPhone?: string;
        parentProfession?: string;
      }>
    ) =>
      fetchApi(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      fetchApi(`/api/students/${id}`, { method: "DELETE" }),
    downloadTemplate: async () => {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/students/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    },
    bulkUpload: async (file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/students/bulk-upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data as { added: number; skipped: number; errors: { row: number; msg: string }[] };
    },
  },
  classes: {
    list: () => fetchApi<{ data: unknown[] }>("/api/classes"),
    create: (body: { name: string; section: string; level?: string }) =>
      fetchApi("/api/classes", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ name: string; section: string; level?: string; classTeacherId?: string | null }>) =>
      fetchApi(`/api/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      fetchApi(`/api/classes/${id}`, { method: "DELETE" }),
  },
  planner: {
    config: () => fetchApi<{ subjects: string[]; days: string[]; primaryPeriods: number; secondaryPeriods: number }>("/api/planner/config"),
    downloadTemplate: async () => {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/planner/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "planner-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    },
    bulkUpload: async (file: File, replace?: boolean) => {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      if (replace) form.append("replace", "true");
      const res = await fetch(`${API_URL}/api/planner/bulk-upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data as { added: number; skipped: number; errors: { row: number; msg: string }[] };
    },
    myTimetable: () => fetchApi<{ data: unknown[] }>("/api/planner/my-timetable"),
    myClasses: () => fetchApi<{ data: unknown[] }>("/api/planner/my-classes"),
    getByClass: (classId: string) => fetchApi<{ class: unknown; slots: unknown[] }>(`/api/planner/class/${classId}`),
    getByTeacher: (teacherId: string) => fetchApi<{ teacher: unknown; slots: unknown[] }>(`/api/planner/teacher/${teacherId}`),
    listSlots: (params?: { classId?: string; teacherId?: string }) =>
      fetchApi<{ data: unknown[] }>(params ? `/api/planner/slots?${new URLSearchParams(params as Record<string, string>).toString()}` : "/api/planner/slots"),
    createSlot: (body: { classId: string; subject: string; teacherId: string; dayOfWeek: number; periodNumber: number }) =>
      fetchApi("/api/planner/slots", { method: "POST", body: JSON.stringify(body) }),
    updateSlot: (id: string, body: Partial<{ classId: string; subject: string; teacherId: string; dayOfWeek: number; periodNumber: number }>) =>
      fetchApi(`/api/planner/slots/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteSlot: (id: string) => fetchApi(`/api/planner/slots/${id}`, { method: "DELETE" }),
  },
  teachers: {
    list: () => fetchApi<{ data: unknown[] }>("/api/teachers"),
    getOne: (id: string) => fetchApi(`/api/teachers/${id}`),
    create: (body: {
      name: string;
      email: string;
      password: string;
      fatherHusbandName?: string;
      specialization?: string;
      category?: string;
      bloodGroup?: string;
      experience?: string;
      address?: string;
      imageUrl?: string;
    }) =>
      fetchApi("/api/teachers", { method: "POST", body: JSON.stringify(body) }),
    update: (
      id: string,
      body: Partial<{
        name: string;
        email: string;
        password: string;
        fatherHusbandName: string;
        specialization: string;
        category: string;
        bloodGroup: string;
        experience: string;
        address: string;
        imageUrl: string;
      }>
    ) =>
      fetchApi(`/api/teachers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      fetchApi(`/api/teachers/${id}`, { method: "DELETE" }),
    downloadTemplate: async () => {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/teachers/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "teacher-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    },
    bulkUpload: async (file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/teachers/bulk-upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data as { added: number; skipped: number; errors: { row: number; msg: string }[] };
    },
    assignments: () => fetchApi<{ data: unknown[] }>("/api/teachers/assignments/list"),
    addAssignment: (body: { teacherId: string; classId: string }) =>
      fetchApi("/api/teachers/assignments", { method: "POST", body: JSON.stringify(body) }),
    removeAssignment: (id: string) =>
      fetchApi(`/api/teachers/assignments/${id}`, { method: "DELETE" }),
  },
  homework: {
    list: () => fetchApi<{ data: unknown[] }>("/api/homework"),
  },
  fees: {
    config: () => fetchApi<{ feeUpiId: string; feeQrUrl: string; adminWhatsApp: string; feeStartYear?: number }>("/api/fees/config"),
    updateConfig: (body: { feeUpiId?: string; feeQrUrl?: string; adminWhatsApp?: string; feeStartYear?: number }) =>
      fetchApi("/api/fees/config", { method: "PUT", body: JSON.stringify(body) }),
    sessions: () => fetchApi<{ sessions: string[] }>("/api/fees/sessions"),
    structure: () => fetchApi<{ data: unknown[] }>("/api/fees/structure"),
    updateStructure: (classId: string, body: { baseAmount?: number; examinationFee?: number; eventsFee?: number; otherFee?: number; lateFeePercent?: number }) =>
      fetchApi(`/api/fees/structure/${classId}`, { method: "PUT", body: JSON.stringify(body) }),
    extras: (params?: { classId?: string; month?: number; year?: number }) =>
      fetchApi<{ data: unknown[] }>(params ? `/api/fees/extras?${new URLSearchParams(params as Record<string, string>).toString()}` : "/api/fees/extras"),
    addExtra: (body: { classId: string; month: number; year: number; feeType: string; amount: number; description?: string }) =>
      fetchApi("/api/fees/extras", { method: "POST", body: JSON.stringify(body) }),
    deleteExtra: (id: string) => fetchApi(`/api/fees/extras/${id}`, { method: "DELETE" }),
    students: (params?: { classId?: string; search?: string; session?: string }) =>
      fetchApi<{ data: unknown[] }>(params ? `/api/fees/students?${new URLSearchParams(params as Record<string, string>).toString()}` : "/api/fees/students"),
    studentFees: (studentId: string, session?: string) =>
      fetchApi<{ student: unknown; fees: unknown[]; totalDue: number; totalPaid: number }>(
        session ? `/api/fees/student/${studentId}?session=${encodeURIComponent(session)}` : `/api/fees/student/${studentId}`
      ),
    recordPayment: (body: { studentId: string; amount: number; method: string; reference?: string; note?: string }) =>
      fetchApi("/api/fees/payment", { method: "POST", body: JSON.stringify(body) }),
    summary: (session?: string) =>
      fetchApi<{ totalDue: number; totalCollected: number }>(
        session ? `/api/fees/summary?session=${encodeURIComponent(session)}` : "/api/fees/summary"
      ),
    receipt: (paymentId: string) => fetchApi<{ payment: unknown; allocations: unknown[] }>(`/api/fees/receipt/${paymentId}`),
  },
  bus: {
    drivers: () => fetchApi<{ data: unknown[] }>("/api/bus/drivers"),
    createDriver: (body: { name: string; phone?: string }) =>
      fetchApi("/api/bus/drivers", { method: "POST", body: JSON.stringify(body) }),
    updateDriver: (id: string, body: { name?: string; phone?: string }) =>
      fetchApi(`/api/bus/drivers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteDriver: (id: string) => fetchApi(`/api/bus/drivers/${id}`, { method: "DELETE" }),
    vehicles: () => fetchApi<{ data: unknown[] }>("/api/bus/vehicles"),
    createVehicle: (body: { busNumber: string; registration?: string }) =>
      fetchApi("/api/bus/vehicles", { method: "POST", body: JSON.stringify(body) }),
    updateVehicle: (id: string, body: { busNumber?: string; registration?: string }) =>
      fetchApi(`/api/bus/vehicles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteVehicle: (id: string) => fetchApi(`/api/bus/vehicles/${id}`, { method: "DELETE" }),
    routes: () => fetchApi<{ data: unknown[] }>("/api/bus/routes"),
    createRoute: (body: { name: string; driverId?: string; vehicleId?: string; stops?: { name: string; arrivalTime?: string; departureTime?: string }[] }) =>
      fetchApi("/api/bus/routes", { method: "POST", body: JSON.stringify(body) }),
    updateRoute: (id: string, body: { name?: string; driverId?: string; vehicleId?: string; stops?: { name: string; arrivalTime?: string; departureTime?: string }[] }) =>
      fetchApi(`/api/bus/routes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteRoute: (id: string) => fetchApi(`/api/bus/routes/${id}`, { method: "DELETE" }),
    routeStudents: (routeId: string) => fetchApi<{ data: unknown[]; stops: unknown[] }>(`/api/bus/routes/${routeId}/students`),
    assignStudentBus: (studentId: string, body: { busRouteId?: string; pickupStopId?: string; dropStopId?: string }) =>
      fetchApi(`/api/bus/students/${studentId}/bus`, { method: "PUT", body: JSON.stringify(body) }),
    myChildren: () => fetchApi<{ children: unknown[] }>("/api/bus/my-children"),
  },
};
