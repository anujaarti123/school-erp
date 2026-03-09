# What We Are Building — Simple Summary

A **School Management App** that replaces WhatsApp. **Parents and Teachers** use the **mobile app** (phone). **Admin** uses a **web dashboard** on a computer (browser) because they have a lot of work — managing students, bulk uploads, fees, bus, reports — which is easier on a big screen. Clean, simple, and premium look.

---

## Why This App?

Right now the school sends homework, fee reminders, and bus information to parents **via WhatsApp**. There is no single place to see everything, and no proper way for teachers or admin to manage data. This app will:

- Give **one place** for all school–parent communication
- Let **teachers** post homework and upload results/attendance easily
- Let **admin** manage students, fees, bus, and bulk data without WhatsApp
- Give **parents** a simple view of their child’s homework, fees, and bus — with push and optional WhatsApp alerts

---

## Who Will Use What?

| User | Where they use | What they do |
|------|-----------------|---------------|
| **Parent** | **Mobile app** (phone) | Log in with **phone + OTP**. See homework, fees, and bus info **for their child (or children)**. Get push and optional WhatsApp notifications. |
| **Teacher** | **Mobile app** (phone) | Log in with **email + password**. Post homework, upload **results and attendance in bulk** (Excel/CSV), view class list. Teacher sees **only the classes admin assigned** to them (one teacher can have multiple classes). See “How does the teacher upload homework?” and “One teacher for multiple classes” below. |
| **Admin** | **Web dashboard** (computer / browser) | Log in with **email + password**. Manage students, teachers, classes, fees, bus routes. **Bulk upload** results, attendance, parent phone numbers, student list. See reports. **Admin has lots of work — so we give them a full web dashboard**, not just the app. |

---

## How Do Parents See Their Child’s Data?

- Parents **do not** add their children in the app.
- **Admin** links each student to a **parent phone number** (in the app or via bulk upload).
- When a parent logs in with **that phone number (OTP)**, the app shows **all students linked to that number** (e.g. two siblings).
- Parent can switch between children to see homework, fees, and bus for each.

So: **one parent phone** → can be linked to **multiple children**. Login is **phone + OTP** (no password for parents).

---

## Main Things We Are Building

### 1. Login (Auth)

- **Parents:** Phone number + **OTP** (using Firebase — free).
- **Teachers & Admin:** Email + password.
- After login, each user goes to **their own dashboard** (Parent / Teacher / Admin). No mixing; clean and simple.

### 2. Homework

- **Teachers** create homework (text, attachments, due date) for a class/section — from the **mobile app**. (See **“How does the teacher upload homework?”** below.)
- **Parents** see homework **only for their linked child(ren)** in the app.
- **Admin** can see/overview all homework in the **web dashboard**.

---

## How does the teacher use the app?

The teacher uses the **mobile app** (phone). After login (email + password), they see a **Teacher dashboard** with clear options. Main use:

1. **Post / upload homework** (see below).
2. **Bulk upload results or attendance** — download Excel/CSV template → fill → upload in the app; system maps to each student.
3. **View class list** — see students in the **classes they teach** (only classes admin assigned to them; one teacher can have multiple classes).

Everything is simple: one main action per screen, no clutter.

---

## How does the teacher upload homework? (Step by step)

Homework is **posted by the teacher from the mobile app**. It is not a bulk file upload like results — it’s **one homework at a time**, with optional attachment. Flow:

1. **Open the app** → Teacher logs in (email + password) → lands on **Teacher dashboard**.
2. **Tap “Post homework”** (or “Add homework”).
3. **Choose class & section** — e.g. Class 5, Section A. (Teacher may only see classes they teach.)
4. **Enter homework details:**
   - **Title** (e.g. “Math – Chapter 5”).
   - **Description** (what to do — type or paste text).
   - **Due date** (optional — when it’s due).
   - **Attachment** (optional) — tap to attach a **file** (e.g. PDF, image, document) from the phone. One file per homework is enough for MVP; we can allow multiple later.
5. **Tap “Post” or “Publish”.**
6. **Done.** The homework is saved and linked to that class/section. **Parents** of students in that class see it in their app (for their child). They can also get a **push notification** (and optional WhatsApp) that “New homework for Class 5”.

So: teacher **does not** upload a list of homeworks in Excel. For **one** homework, they fill a **simple form** in the app (class, title, description, due date, optional file) and post. Quick and easy on the phone. Bulk upload (Excel/CSV) is only for **results and attendance**, not for homework.

---

## One teacher for multiple classes — how is it managed? How does admin assign?

**We support one teacher teaching multiple classes.** For example: same teacher for Class 5A, Class 5B, and Class 6A.

**How it works:**

1. **Admin assigns which teacher teaches which class(es).**  
   In the **Admin web dashboard**:
   - **Option A:** Go to **Teachers** → open a teacher → **“Assigned classes”** → select one or more class/section (e.g. Class 5A, 5B, 6A). Save.
   - **Option B:** Go to **Classes** → open a class/section (e.g. Class 5A) → **“Class teacher”** or **“Assigned teacher(s)”** → select the teacher. Save.  
   (We can use one or both; Option A is enough for MVP: “Edit Teacher” → multi-select “Teaches: 5A, 5B, 6A”.)

2. **In the app, the teacher only sees their assigned classes.**  
   When the teacher posts homework or uploads results/attendance, the **class/section dropdown** shows **only the classes they are assigned to**. So one teacher can work with multiple classes without seeing other teachers’ classes.

3. **Same teacher login, multiple classes.**  
   One account per teacher; that account is linked to **many** class/sections. No need for separate logins per class.

**Summary:** Admin assigns “Teacher X teaches Class 5A, 5B, 6A” in the web dashboard. Teacher X logs in once and sees only 5A, 5B, 6A everywhere (post homework, bulk upload, class list). Easy to manage and scalable.

---

### 3. Fees

- **Admin** sets fee structure (e.g. by class). Parents see **dues and payment status** for their child.
- Later: online payment (e.g. Razorpay/Stripe) and receipts. MVP can start with “view only” and manual marking.

### 4. Bus

- **Admin** sets bus routes, stops, timings, driver/vehicle.
- **Parents** see **their child’s bus** (route, stop, time). No need to search.

### 5. Bulk Upload (Import) — Teachers & Admin

- **One common format:** Excel or CSV (and optionally ODF). No typing data student-by-student.
- **Flow:** Download a **template** (e.g. “Results – Class 5”, “Attendance”, “Parent phones”) → fill it on computer → **upload** in the app.
- **System** reads the file and **puts each row against the correct student** (by roll no / class / section).
- **Types we support:**
  - **Results** (marks/grades) — Teacher or Admin
  - **Attendance** — Teacher or Admin
  - **Parent phone numbers** — Admin
  - **Student list** (name, class, phone) — Admin
- After upload: show “X rows imported, Y failed” and an **error report** for failed rows (e.g. “Roll no not found”). Simple and easy to fix.

No image or PDF upload in MVP — user fills the **spreadsheet** and uploads the **file**.

### 6. Notifications

- **Push notifications** (in the app) — e.g. new homework, fee reminder, bus change. We use Firebase Cloud Messaging (FCM) or similar.
- **WhatsApp** (optional) — same alerts can also be sent via WhatsApp so parents who prefer WhatsApp still get messages. Both push and WhatsApp can be sent from the same backend.

### 7. Premium Look & Feel — Not Ordinary

- **Premium typography:** Use a **premium font** (e.g. Plus Jakarta Sans, DM Sans, Outfit) — not system default or plain black text. See `DESIGN-GUIDE-PREMIUM.md`.
- **Premium colors:** A **refined color palette** — primary (e.g. deep teal/navy or indigo), soft backgrounds (off-white, warm gray), charcoal text (not pure black). No generic black-on-white.
- **App icon (logo)** and **splash screen** — branded, using palette colors.
- **Visual polish:** Soft shadows, rounded corners, generous spacing. Subtle animations. Feels **premium**, not ordinary.
- **Simple and easy to use:** one main action per screen, clear labels, no clutter.

---

## What We Are *Not* Building in MVP

- Full ERP (inventory, payroll, etc.)
- Complex timetable or full LMS
- Upload by **photo/scan** (OCR) — MVP uses **file upload** (Excel/CSV/ODF) only
- Multiple schools in one app (can be added later)

---

## Tech in One Line (For Reference)

- **Mobile app (Play Store):** **Flutter** — for **Parents** and **Teachers** (Android and iOS).
- **Admin:** **Web dashboard** — built with **Next.js** (or similar) in the browser; same backend (Node.js + Supabase). Admin opens a URL on computer and logs in; full screen for bulk uploads, tables, reports.
- **Backend:** **Node.js** (API) + **Supabase** (database, storage). Firebase for **phone OTP** and **push**.
- **Bulk import:** Backend reads Excel/CSV (and ODF if we add it), validates, and saves to database per student.

---

## Summary in 5 Points

1. **Parents & Teachers** use the **mobile app** (Flutter). **Admin** uses a **web dashboard** (browser on computer) — because admin has lots of work and needs a big screen for bulk uploads, tables, and reports.
2. **Parents** see homework, fees, and bus **only for their child(ren)**; admin links parent phone to students.
3. **Homework:** Teacher **posts one homework at a time** from the app (class, title, description, due date, optional file). **Bulk upload** (Excel/CSV) is for **results and attendance**, not homework.
4. **Bulk upload:** Teachers (in app) and Admin (in web) upload **Excel/CSV**; system **maps data to each student** (results, attendance, parent phone, student list). Download template → fill → upload.
5. **One teacher, multiple classes:** Admin **assigns** which teacher teaches which class(es) in the web dashboard. Teacher sees **only those classes** in the app (homework, bulk upload, class list). **Premium MVP:** Premium font + premium colors (no pure black), app icon, splash screen, soft shadows, generous spacing — app must feel **premium**, not ordinary. Easy to use, scalable later.

That’s everything we are going to build, in a simple explanation.
