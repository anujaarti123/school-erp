# School Management App — MVP Proposal & Stack Recommendation

## 1. Project Context

- **Current state:** School shares homework, fees, bus info with parents via **WhatsApp** (no dedicated app).
- **Goal:** Replace WhatsApp with a **clean, simple app** with separate experiences for **Parents**, **Teachers**, and **Admin**.
- **Target:** Professional, premium feel; scalable MVP that can grow.

---

## 2. MVP Scope (What to Build First)

Focus on replacing the three main WhatsApp flows:

| Area | MVP Features |
|------|-----------------------------|
| **Homework** | Teachers post homework (text, attachments). Parents/students see by class/section. Simple due dates. |
| **Fees** | Fee structure by class; view dues, pay online (or mark paid). Receipts. Basic fee reminders. |
| **Bus** | Bus routes, stops, timings; driver/vehicle info. Parents see their ward’s bus details. |
| **Auth & Roles** | Separate login: **Parent**, **Teacher**, **Admin**. Role-based dashboards. |
| **Admin** | Manage classes, sections, students, teachers, fee structure, bus routes; basic reports. |
| **Bulk upload / import** | Teachers & Admin upload **one file** (Excel/CSV/ODF) per type; system **aggregates and maps data to each student** (e.g. results, phone numbers, attendance). See §2.1. |

**Out of scope for MVP:** Full ERP (inventory, payroll), complex timetable, full LMS — add later.

### 2.1 Bulk Upload (Import) System — Teachers & Admin

**Goal:** One **common file format** (Excel, CSV, or ODF spreadsheet). Teacher or Admin uploads a file; the system **parses it, validates it, and maps each row to the correct student** (or class). No manual data entry per student.

**Principles:** Simple, clean, premium MVP. Easy to use: download template → fill → upload → see success/errors.

| Who | What they can upload | System action |
|-----|------------------------|----------------|
| **Teacher** | Results (marks/grades), attendance, class-specific data | Map by **Student ID / Roll no / Class+Section**; save against each student. |
| **Admin** | Same as Teacher, plus: student list (name, phone, class), parent phone numbers, bulk fee updates | Create/update students, link parent phone, update fees/attendance/results. |

**Supported format (MVP):**

- **Excel (.xlsx)** and **CSV (.csv)** — primary (everyone has Excel/Sheets).
- **ODF spreadsheet (.ods)** — optional if you need open format; same column layout as Excel template.

**No image/PDF parsing in MVP** — that would need OCR and is complex. For MVP: user downloads the **spreadsheet template**, fills it on computer, uploads the file. (Photo/scan upload can be a later phase.)

**Flow (same for each import type):**

1. **Download template** — e.g. “Results – Class 5”, “Attendance – March”, “Parent phones”. Template has fixed columns (e.g. `Roll No`, `Name`, `Subject`, `Marks` or `Date`, `Present/Absent`, `Phone`).
2. User fills the file and **uploads** in the app (Teacher or Admin screen).
3. **Backend:** Parse file (e.g. with `xlsx` / `csv-parse` in Node), validate rows (student exists, values in range), then **save against each student** in DB.
4. **UI:** Show “Imported X rows” and, if any errors, “Y rows failed” with a **simple error list** (e.g. “Row 5: Roll no 99 not found”). Option to **download error report** (same format with error column).

**Import types to support in MVP:**

| Import type | Columns (example) | Who | Maps to |
|-------------|-------------------|-----|--------|
| **Results** | Class, Section, Exam name, Roll no, Subject, Marks/Grade | Teacher, Admin | `student_id` + result stored per exam/subject |
| **Attendance** | Date, Class, Section, Roll no, Status (P/A/L) | Teacher, Admin | `student_id` + attendance record |
| **Parent phone** | Class, Section, Roll no, Parent name, Parent phone | Admin | `student_id` → parent link / update phone |
| **Student list** | Class, Section, Roll no, Name, Parent phone (optional) | Admin | Create/update students in class |

**UI (keep it simple & premium):**

- One **“Bulk import”** or **“Upload data”** area in Teacher dashboard and in Admin dashboard.
- Sub-sections or tabs: **Results** | **Attendance** | **Parent phones** (Admin only) | **Student list** (Admin only).
- Each: **Download template** button, **Choose file** + **Upload** button, then **Result summary** (success count, error count, link to error report).
- No clutter: single flow per type, clear labels, one primary action per screen.

**Backend (simple & scalable):**

- One **API per import type** (e.g. `POST /api/import/results`, `POST /api/import/attendance`, …).
- Use a **library** to read Excel/CSV (Node: `xlsx` or `exceljs`; for ODF add `ods` parser if needed).
- Validate, then **batch insert/update** in Supabase/PostgreSQL (e.g. Prisma). Return list of errors (row index + message).
- Store **audit**: who imported what and when (user_id, type, file name, row counts) for Admin.

This gives you a **clean, simple, premium MVP**: one format (Excel/CSV/ODF), one flow (template → fill → upload → see result), for both Teacher and Admin, with data correctly segregated and stored against each student.

---

## 3. User Roles, Login & Where They Use the System

| Role | Where | Login | Main screens / actions |
|------|--------|--------|-------------------------|
| **Parent** | **Mobile app** (phone) | Phone + OTP | Dashboard, Homework (by child), Fees, Bus |
| **Teacher** | **Mobile app** (phone) | Email + password | Dashboard, **Post homework** (form: class, title, description, due date, optional file), Bulk upload (results/attendance), View class list |
| **Admin** | **Web dashboard** (browser on computer) | Email + password | Full dashboard: Students, Teachers, Classes, Fees, Bus, Homework overview, **Bulk upload** (results, attendance, parent phones, student list), Reports |

- **Admin = web dashboard:** Admin has lots of work (bulk uploads, tables, reports). A **web dashboard** on a computer is easier than doing everything on the phone. One URL, login with email, full-screen UI.
- **Parents & Teachers = mobile app:** Parents and teachers use the **Flutter app** on the phone.
- **Clean & simple:** Dedicated layouts per role; one main action per screen where possible.

### 3.1 How the teacher uploads (posts) homework

Homework is **not** bulk-uploaded via Excel. The teacher **posts one homework at a time** from the **mobile app**:

1. Teacher opens app → logs in → taps **“Post homework”**.
2. Selects **class & section** (e.g. Class 5, Section A).
3. Fills a **simple form:** Title, Description (text), Due date (optional), **Attachment** (optional — one file: PDF, image, or document from phone).
4. Taps **“Post” / “Publish”**. Homework is saved and linked to that class/section.
5. Parents of students in that class see it in their app (for their child) and can get a push (and optional WhatsApp) notification.

Bulk file upload (Excel/CSV) is used only for **results** and **attendance**, not for homework.

### 3.2 One teacher for multiple classes — how admin assigns

**Requirement:** One teacher can teach **multiple** classes/sections (e.g. Class 5A, 5B, 6A). Admin must be able to assign and change this.

**Data model:**  
- **Teacher** and **Class/Section** are linked in a **many-to-many** way: one teacher ↔ many class-sections, one class-section can have one (or more) teacher(s).  
- Store **teacher–class assignments** (e.g. table `teacher_class` or `teacher_assignments`: `teacher_id`, `class_id`, `section_id`). When a class has a single “class teacher,” one row per class-section; if a class can have multiple teachers (e.g. subject-wise later), multiple rows per class-section.

**How admin assigns (Admin web dashboard):**

1. **From “Teachers”:**  
   - Open **Teachers** → click a teacher → **“Assigned classes”** (or “Teaches”).  
   - Show a **multi-select** or **checkboxes** of all class/sections (e.g. 5A, 5B, 6A, 6B, …).  
   - Admin selects the classes this teacher teaches → **Save**.  
   - So: “Teacher Priya teaches: 5A, 5B, 6A.”

2. **From “Classes” (optional, same data):**  
   - Open **Classes** → click a class/section (e.g. 5A) → **“Class teacher”** or **“Assigned teacher”** → dropdown or search to pick one teacher.  
   - Saving updates the same assignment table.  
   - Use either “by teacher” or “by class”; one source of truth (the assignment table).

**In the mobile app (teacher):**

- When the teacher **posts homework** or **uploads results/attendance** or **views class list**, the app asks the backend: “Which class/sections is this teacher assigned to?”  
- Backend returns only those class/sections.  
- The teacher sees **only their classes** in every dropdown/list (e.g. “Class 5A”, “Class 5B”, “Class 6A”). No other classes.  
- So one teacher, one login, multiple classes — all managed by admin assignments.

**Summary:** Admin assigns teachers to class(es) in the web dashboard (by teacher or by class). Teacher sees only assigned classes in the app. One teacher can have multiple classes; easy to manage and scalable.

---

## 4. Recommended Stack (Professional & Premium)

### Frontend (App)

| Choice | Why |
|--------|-----|
| **Next.js 14+ (App Router)** | React-based, SSR/SSG, great DX, easy deployment (Vercel), SEO if you add a public site. |
| **TypeScript** | Type safety, fewer bugs, better maintainability. |
| **Tailwind CSS** | Fast, consistent UI; easy to keep “clean & simple” and premium. |
| **UI library** | **Shadcn/ui** (copy-paste components, full control) or **Radix UI** — accessible, professional. |
| **State** | **React Query (TanStack Query)** for server state; **Zustand** or React Context for minimal client state. |
| **Auth (frontend)** | **NextAuth.js** (sessions, JWT, role in token/session). |

**Alternative:** If you must support **native mobile first** and one codebase: **React Native (Expo)** or **Flutter**. For “premium web app + optional PWA,” Next.js is the best fit.

### Backend

| Choice | Why |
|--------|-----|
| **Node.js + framework** | **Next.js API Routes** (same repo) for small MVP, or **NestJS** (separate backend) for strict structure and scaling. |
| **Database** | **PostgreSQL** (e.g. Supabase or Neon) — relational, good for students, fees, classes, bus routes. |
| **ORM** | **Prisma** — type-safe, migrations, great with Next.js/NestJS. |
| **Auth (backend)** | **NextAuth.js** with Credentials + JWT, or **Supabase Auth** if you use Supabase (built-in email/OTP). |
| **File storage** | **Supabase Storage** or **AWS S3** — homework attachments, receipts. |
| **Payments (fees)** | **Razorpay** (India) or **Stripe** — integrate in Phase 2 after basic fee CRUD works. |

### DevOps & Environment

| Item | Recommendation |
|------|-----------------|
| **Version control** | Git (GitHub / GitLab). |
| **Hosting (frontend)** | Vercel (Next.js) or Netlify. |
| **Backend** | Vercel (API routes) or Railway / Render (NestJS). |
| **Database** | Supabase (PostgreSQL + Auth + Storage) or Neon + separate auth. |
| **Env** | `.env` for local; env vars in Vercel/Railway for staging & production. |

---

## 5. Best Single Recommendation

For a **professional, premium MVP** with one team and fast delivery:

- **Mobile app (Parents + Teachers):** **Flutter** — one codebase for Android and iOS.
- **Admin:** **Web dashboard** — **Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn/ui**; admin opens a URL in the browser on a computer for bulk uploads, tables, reports.
- **Backend:** **Node.js** (API) + **Prisma + PostgreSQL (Supabase)**; same API serves both the Flutter app and the Admin web app.
- **Auth:** Firebase (phone OTP for parents), Supabase Auth or NextAuth (email/password for Teacher & Admin).
- **Deploy:** **Vercel** (Admin web + API) or separate API host; **Supabase** (DB, auth, storage); Flutter app to Play Store/App Store.

This gives you:

- **Admin = web only** (no admin in the mobile app). Parents & Teachers = mobile app only (or teacher can also get a simple web “post homework” later if needed).
- One backend API; two frontends: Flutter app + Next.js Admin dashboard.
- Scalable: you can later move API to NestJS if needed.

---

## 6. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MOBILE APP (Flutter)              │  ADMIN WEB DASHBOARD (Next.js)      │
│  Parent + Teacher                  │  Admin only (browser on computer)   │
│  ┌─────────────┐ ┌─────────────┐   │  Students, Teachers, Classes,       │
│  │   Parent    │ │   Teacher   │   │  Fees, Bus, Bulk upload, Reports    │
│  │ Homework,   │ │ Post HW,    │   │  Full screen — lots of work         │
│  │ Fees, Bus   │ │ Bulk upload │   └────────────────┬──────────────────┘
│  └──────┬──────┘ └──────┬──────┘                      │                   
│         └───────────────┼─────────────────────────────┘                   
│                         │  Same backend API (Node.js)                     
│  ┌──────────────────────┴──────────────────────┐                        
│  │  API: Homework, Fees, Bus, Students, Import, Auth                       │
│  └──────────────────────┬───────────────────────┘                        
└─────────────────────────┼─────────────────────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────────────────────┐
│                 Prisma ORM │ PostgreSQL (Supabase)                      │
│                 + Supabase Storage (attachments)                        │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 7. Suggested Folder Structure

**Two frontends, one backend:**

```
school-erp/
├── mobile-app/                 # Flutter — Parents & Teachers (Play Store)
│   ├── lib/
│   │   ├── screens/            # Parent dashboard, Teacher dashboard
│   │   ├── widgets/
│   │   └── services/           # API client, auth
│   └── ...
│
├── admin-web/                  # Next.js — Admin only (browser)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (admin)/        # Protected admin routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── students/
│   │   │   │   ├── teachers/
│   │   │   │   ├── classes/
│   │   │   │   ├── fees/
│   │   │   │   ├── bus/
│   │   │   │   ├── homework/
│   │   │   │   └── import/     # Bulk upload (results, attendance, etc.)
│   │   │   └── layout.tsx
│   │   └── api/                # Optional: API routes here or in backend
│   ├── components/
│   └── package.json
│
└── backend/                    # Node.js API (or NestJS) — shared by both
    ├── src/
    │   ├── routes/             # Homework, fees, bus, students, import
    │   ├── services/
    │   └── ...
    ├── prisma/
    │   └── schema.prisma
    └── package.json
```

---

## 8. MVP Phases (Suggested)

| Phase | Focus | Duration (rough) |
|-------|--------|-------------------|
| **1** | Auth (Parent / Teacher / Admin), Admin: classes, sections, students, teachers | 2–3 weeks |
| **2** | Homework: create, list by class, parent view | 1–2 weeks |
| **3** | Fees: structure, dues, view; payment integration optional | 1–2 weeks |
| **4** | Bus: routes, stops, assign to students; parent view | ~1 week |
| **4.5** | **Bulk import:** Templates (Excel/CSV/ODF), upload for results, attendance, parent phone; Teacher + Admin; map rows to each student | ~1 week |
| **5** | Polish, notifications (email/in-app), PWA | 1–2 weeks |

---

## 9. Key Decisions — Your Questions Answered

### 9.1 Node.js vs Flutter — Which for Play Store? **Recommendation: Flutter (app) + Node.js (backend)**

- **Node.js** is a **backend** runtime (APIs, server). You do **not** publish Node.js to the Play Store — it runs on your server.
- **Flutter** is a **frontend/mobile framework**. You build the **app** with Flutter and publish that app to the Play Store (and App Store).

| For Play Store app | Use |
|--------------------|-----|
| **Mobile app (Android/iOS)** | **Flutter** (recommended) or React Native |
| **Backend (API, database, auth)** | **Node.js** (e.g. Next.js API, NestJS, or Express) |

**Why Flutter is recommended for your Play Store app**

- Single codebase for **Android + iOS** (and web if needed later).
- **Premium UI** is easy: Material/Cupertino + custom themes, smooth animations, splash screen, app icon.
- Good performance, native feel; large ecosystem and Google backing.
- Fits **MVP + scalable**: start with one app, add features without rewriting.

**Final recommendation:** Build the **mobile app** in **Flutter** (for Play Store/App Store). Build the **backend** in **Node.js** (Next.js API Routes or NestJS) + **Supabase**. Flutter app talks to your Node/Supabase backend via REST or GraphQL.

---

### 9.2 Supabase vs Firebase? **Recommendation: Supabase**

| Aspect | Supabase | Firebase |
|--------|----------|----------|
| **Database** | PostgreSQL (relational, SQL) | Firestore (NoSQL) |
| **Data model** | Perfect for school: students, classes, sections, fees, bus routes (tables + relations) | Document-based; possible but more awkward for reports, joins, fee structure |
| **Auth** | Email, magic link, phone (with Twilio/etc.), social | Email, **phone OTP built-in**, social |
| **Vendor lock-in** | Open-source; can self-host; standard PostgreSQL | Google ecosystem; harder to migrate |
| **Cost** | Generous free tier; predictable at scale | Free tier good; can spike with reads/writes |
| **Push** | Use OneSignal / FCM with your backend | FCM built-in, very smooth |

**Why Supabase for a school management app**

1. **Relational data** — Classes, sections, students, fee structure, bus routes, homework are naturally relational. PostgreSQL + Prisma is a better fit than Firestore.
2. **Reports & queries** — Fee reports, “all students in class X,” bus assignments are simple SQL. In Firestore you’d need more denormalization and composite queries.
3. **Scalable & portable** — Standard SQL and open-source; you can move DB or self-host later.
4. **Auth** — Supabase Auth supports email and (with Twilio) phone OTP. For “parent login by phone OTP” you add a small integration (Twilio + custom Supabase flow or your Node API).

**When Firebase can make sense:** If you want **phone OTP with zero setup** and **push notifications as the top priority**, Firebase Auth + FCM is very convenient. You can still use **Supabase for database** and **Firebase only for Auth + FCM** if you want both.

**Summary:** Use **Supabase** for database, storage, and (optionally) auth for Teacher/Admin. Use **Firebase Auth for phone OTP** (free, ideal for parents). Use **Firebase Cloud Messaging (FCM)** for push so you have one Firebase project for both auth and push.

---

### 9.3 Premium Look — Not Ordinary (Fonts, Colors, Polish)

**Requirement:** The app must feel **premium**, not ordinary. No generic black-on-white. Use premium typography and a refined color palette. See `DESIGN-GUIDE-PREMIUM.md` for full specs.

- **Premium typography:** Use a **premium font** for headings (e.g. Plus Jakarta Sans, DM Sans, Outfit) and body (e.g. Source Sans 3, Nunito Sans). **Not** system default, Arial, or Roboto. Add via `google_fonts` (Flutter) or Google Fonts (Admin web).
- **Premium colors:** A **refined palette** — primary (e.g. deep teal `#0F766E` or navy `#1E3A5F`), soft backgrounds (`#F8FAFC`, `#F1F5F9`), text in charcoal (`#1E293B`) — **never pure black** (`#000`). Accent for highlights (e.g. amber `#D97706`). No default Material purple.
- **App icon (logo):** Simple, recognizable; 1–2 colors from the palette. 1024×1024 master; Flutter/Android/iOS generate all sizes.
- **Splash screen:** Logo on branded background (primary or background color). Optional school name in heading font. 1–2 seconds, then login.
- **Visual polish:** Soft shadows (`0 4px 12px rgba(0,0,0,0.06)`), rounded corners (8–12px), generous spacing. Subtle animations (200–300ms). No harsh black shadows.
- **Deliverables:** One app icon set, one splash screen, one theme (fonts + colors) applied across Parent/Teacher/Admin. App must feel **premium**, not ordinary.

---

### 9.4 Push Notifications + WhatsApp Notifications

- **In-app push (must-have):**
  - Use **Firebase Cloud Messaging (FCM)** or **OneSignal**. Store FCM/OneSignal device tokens per user in your DB (Supabase).
  - Backend (Node.js): on events (e.g. new homework, fee reminder, bus change), call FCM/OneSignal API to send push to the right users (by role or by student).
- **WhatsApp (in addition to push):**
  - Keep WhatsApp for parents who prefer it or as a backup. Use **WhatsApp Business API** (e.g. Twilio, official Meta API) to send template messages (e.g. “New homework for Class 5”, “Fee due in 3 days”).
  - Flow: same backend events trigger both (1) push notification and (2) WhatsApp message (for configured parents).
- MVP: Implement **push first** (FCM or OneSignal). Add **WhatsApp** as Phase 2 once push is stable.

---

### 9.5 How Parents Login & Connect to Their Children? Login Type: Phone OTP vs Email

**Recommended: Phone OTP as primary for parents; email optional.**

- **Why phone OTP:** In many regions (e.g. India), parents are used to phone-based login; no password to remember; high open rates for SMS/OTP. Good for adoption.
- **Flow:**
  1. Parent enters **phone number** → receives **OTP** (via Twilio, MSG91, or Supabase + provider).
  2. After OTP verify, create or sign in **Parent** account. No “password” required for parents if you use OTP-only.
  3. **Linking to children:** Parents do **not** self-register children. **Admin** (or teacher) assigns:
     - In “Students” management, each student has a field: “Parent phone” (or “Parent user ID”). When that parent logs in with that phone, the app loads **all students** linked to that phone.
  4. So: **one parent phone** → can be linked to **multiple children** (siblings). Parent sees a switcher or list: “Child 1 – Class 5”, “Child 2 – Class 3”, and chooses which child’s homework/fees/bus to view.

**Login types by role**

| Role | Recommended login |
|------|--------------------|
| **Parent** | **Phone + OTP** (primary); optionally add email later for receipts/notifications |
| **Teacher** | Email + password (or magic link) — school assigns email |
| **Admin** | Email + password — internal use |

**Technical — Use Firebase for phone OTP (recommended, free):**

- **Firebase Authentication** offers **phone OTP (SMS verification) for free** within generous quotas. You get:
  - Free phone auth verification (Google may apply SMS costs in some regions; check [Firebase pricing](https://firebase.google.com/pricing)); for many countries it’s free or very low cost.
  - No need for Twilio/MSG91 for parents — one less vendor and setup.
- **Hybrid approach that fits your stack:**
  - **Firebase Auth** → **only for parent phone OTP** (sign in with phone, get Firebase UID + idToken).
  - **Supabase** → all school data (students, classes, fees, homework, bus). Store a `firebase_uid` or `phone` on your `parents` table and link to students.
  - **Flutter:** Use `firebase_auth` for phone sign-in; after success, send Firebase `idToken` to your Node.js API; backend verifies the token, finds or creates the parent in Supabase, and returns your app’s session/JWT. Parent then sees only their linked children from Supabase.
- So: **yes, use Firebase for phone OTP** — it’s free, simple, and works well with Flutter + Supabase. Keep Teacher/Admin login with **Supabase Auth** (email + password) or your Node API if you prefer.

---

### 9.6 Premium + MVP + Scalable

- **Premium:** From day one use a clear visual system: logo, splash, one font family, one color palette, clean layouts. No “placeholder” look.
- **MVP:** Ship only: Parent/Teacher/Admin auth, homework, fees, bus, and (if possible) push. No extra modules (e.g. full timetable, inventory) until core is live.
- **Scalable:**
  - **Backend:** Node.js + **PostgreSQL (Supabase)** — add tables and APIs without rewriting.
  - **App:** Flutter — add screens and features incrementally; single codebase for Android + iOS.
  - **Auth & linking:** Phone OTP + admin-assigned parent–student links scale to many schools by adding “School” tenant and multi-tenancy later.

---

## 10. Summary (Updated)

- **Mobile app (Play Store):** **Flutter** for **Parents** and **Teachers**. **Admin** uses a **web dashboard** (Next.js) on a computer — same backend, better for bulk work.
- **Database & backend:** **Supabase** (PostgreSQL) over Firebase for relational data, reports, and portability; use FCM or OneSignal for push; optionally Firebase only for Auth (phone OTP) or FCM.
- **Premium feel:** Dedicated **app icon**, **splash screen**, and consistent **theme** (typography, colors, spacing) across the app.
- **Notifications:** **Push** (FCM/OneSignal) must-have; **WhatsApp** (Business API) as complement for parents.
- **Parent login:** **Phone OTP** primary; **admin links** parent phone to student(s); one parent can have multiple children.
- **MVP + scalable:** Small feature set, premium UI from start, and architecture (Flutter + Node + Supabase) that grows with more schools and features.
- **Bulk upload:** Teachers & Admin use **one common format** (Excel/CSV/ODF): download template → fill → upload; system **aggregates and maps data to each student** (results, attendance, parent phone). Simple, clean flow; no image/PDF parsing in MVP.

If you want, next step can be: **scaffold a Flutter app** with logo/splash placeholders, theme, and login (phone OTP for parent, email for teacher/admin) + role-based navigation to Parent / Teacher / Admin dashboards, and a **Node.js + Supabase** backend with Prisma schema and auth.
