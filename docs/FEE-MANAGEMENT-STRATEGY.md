# Fee Management System — Strategy Document

> **Purpose:** Discuss architecture before implementation. Align Admin Web and Parents Mobile App.

---

## 1. Requirements Summary

| # | Requirement | Notes |
|---|-------------|------|
| 1 | Student-wise & month-wise | Fees per student, per month; total due & pending |
| 2 | Parents app — clear tab | Total due, which month due, which month completed |
| 3 | Manual payment (UPI/QR) | School UPI ID + QR; full or partial payment |
| 4 | Partial payment adjustment | Apply to pending months as per rule |
| 5 | Admin — total due, update payment | Real-time sync to parents app |
| 6 | Clear, professional, scalable | Both admin & parents |

---

## 2. Data Model

### 2.1 Existing

- **FeeStructure** — `classId`, `amount`, `term` (e.g. "monthly")
- One structure per class; amount = monthly fee for that class

### 2.2 New Tables

**StudentFee** — One row per student per month (fee liability)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | PK |
| studentId | TEXT | FK → Student |
| month | INT | 1–12 |
| year | INT | e.g. 2025 |
| amount | DECIMAL | Fee for this month (from FeeStructure) |
| paidAmount | DECIMAL | Amount paid against this month |
| dueAmount | DECIMAL | amount − paidAmount |
| status | TEXT | 'pending', 'partial', 'paid' |

**Unique:** `(studentId, month, year)`

**Payment** — Each payment record (manual or gateway)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | PK |
| studentId | TEXT | FK → Student |
| amount | DECIMAL | Amount received |
| method | TEXT | 'upi', 'cash', 'bank', 'cheque' |
| reference | TEXT | UPI ref, cheque no, etc. |
| paidAt | TIMESTAMP | When received |
| recordedBy | TEXT | Admin userId |
| note | TEXT | Optional |

**FeePaymentAllocation** — Links payment to specific months (for partial)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | PK |
| paymentId | TEXT | FK → Payment |
| studentFeeId | TEXT | FK → StudentFee |
| amount | DECIMAL | Amount applied to this month |

**SchoolConfig** (or new table) — UPI & QR for display

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | 'fee_upi_id', 'fee_qr_url' |
| value | TEXT | UPI ID or QR image URL |

---

## 3. Partial Payment Rule

**Rule: Oldest unpaid month first (FIFO)**

When parent pays ₹500:
1. Find oldest StudentFee with dueAmount > 0 (e.g. Apr 2025, due ₹1000)
2. Apply ₹500 → paidAmount += 500, dueAmount = 500, status = 'partial'
3. If payment > due, apply remainder to next oldest month

**Alternative:** Let admin choose which month to apply (more flexible, but more UI).

**Recommendation:** FIFO by default; optional "Apply to specific month" in admin.

---

## 4. Fee Generation

**When to create StudentFee rows?**

- **Option A:** On-demand — When viewing fees, generate missing months from FeeStructure
- **Option B:** Cron/batch — Monthly job creates next month's fees for all students
- **Option C:** Admin action — "Generate fees for Apr 2025" for all/selected students

**Recommendation:** **Option A (on-demand)** for MVP — simpler. When parent/admin views fees, we:
1. Get student's class → FeeStructure (monthly amount)
2. For each month from "start" (e.g. Apr 2025) to current month, ensure StudentFee exists
3. Return list with paid/due

**Start month:** Configurable (e.g. academic year start: April) or first month of current academic year.

---

## 5. Admin Workflow

### 5.1 Fee Structure

- Set monthly fee per class (FeeStructure)
- Optional: different amounts per term (e.g. Apr–Sep vs Oct–Mar)

### 5.2 Fee Overview

- **Dashboard:** Total due (all students), total collected (this month)
- **Student-wise:** Search/select student → see month-wise breakdown
- **Filters:** Class, status (pending/partial/paid)

### 5.3 Record Payment

1. Select student (or scan/enter)
2. Enter amount, method (UPI/cash/bank), reference
3. System auto-allocates to oldest pending months (FIFO)
4. Admin can override: "Apply to Apr 2025 only" or "Split across months"

### 5.4 UPI / QR Setup

- Admin sets school UPI ID and QR image URL
- Displayed to parents in app and on receipts

---

## 6. Parents App Workflow

### 6.1 Fees Tab

- **Summary card:** Total due (all children combined)
- **Per child:** Expand to see month-wise list
- **Each month:** Amount, Paid, Due, Status (Paid ✓ / Partial / Pending)
- **Pay button:** Opens UPI/QR info + "I have paid" (optional — or admin only records)

### 6.2 "I have paid" (Optional)

- Parent taps "I have paid" → enters amount, UPI ref
- Creates a "pending" payment; admin verifies and confirms
- Or: Admin only records (simpler for MVP)

**Recommendation:** Admin-only recording for MVP. Parent sees dues; pays via UPI; informs school; admin records.

---

## 7. API Design

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fees/structure | List fee structure (by class) |
| PUT | /api/fees/structure | Update fee structure |
| GET | /api/fees/students | List students with fee summary (filters) |
| GET | /api/fees/student/:id | Student's month-wise fees |
| POST | /api/fees/payment | Record payment (auto-allocate FIFO) |
| GET | /api/fees/summary | Total due, total collected |
| GET | /api/fees/config | UPI ID, QR URL |
| PUT | /api/fees/config | Update UPI, QR |

### Parent

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fees/my-children | My children's fee summary (total due, per child, per month) |

Same data source → real-time sync.

---

## 8. Academic Year & Month Range

- **Academic year:** e.g. Apr 2025 – Mar 2026
- **Months to show:** From academic year start to current month (or configurable end)
- **Config:** `academic_year_start_month` (default 4 = April)

---

## 9. Decisions (Confirmed)

1. **Academic year start:** April
2. **"I have paid":** Yes — with WhatsApp button linking to admin WhatsApp for instant notification
3. **Late fee:** Optional (on choice)
4. **Receipts:** Yes — PDF receipt after payment
5. **Fee structure:** One base monthly amount + extra columns (Examination Fee, Events Fee, etc.) as per requirement

---

## 10. Implementation Order

1. DB migrations (StudentFee, Payment, FeePaymentAllocation, FeeExtra, SchoolConfig)
2. Backend: fee structure CRUD, fee extras, student fees (on-demand), payment recording
3. Admin: Fee structure, fee extras, student list, record payment, UPI/QR/WhatsApp config
4. Parent API: GET /api/fees/my-children
5. "I have paid" → WhatsApp link to admin (pre-filled message)
6. PDF receipt: GET /api/fees/receipt/:paymentId returns JSON; PDF generation optional

---

## 11. Scalability Notes

- **Indexes:** (studentId, year, month) on StudentFee; (studentId, paidAt) on Payment
- **Pagination:** For admin student list when 1000+ students
- **Caching:** Optional Redis for "total due" if heavy traffic
- **Reports:** Export to Excel for accounting (future)
