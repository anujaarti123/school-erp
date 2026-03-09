# Teacher Assignment & Planner — Strategy Document

> **Purpose:** Align Admin Web and Mobile App on how teachers are assigned to classes. Discuss before implementing.

---

## 1. Current State vs Requirements

| Aspect | Current | Required |
|--------|---------|----------|
| Teacher–Class link | `TeacherClassAssignment` (teacher ↔ class, no subject) | Subject-based: Teacher teaches **Subject X** to **Class Y** |
| Class Teacher | None | Each class has one **Class Teacher** (homeroom) |
| Planner | None | Weekly/Monthly timetable; admin assigns teachers per subject per period |
| One teacher, many classes | Supported (many rows in TeacherClassAssignment) | Same; but per **subject** and **period** |

---

## 2. Proposed Model

### 2.1 Two Types of Assignment

| Type | Purpose | Who | Example |
|------|---------|-----|---------|
| **Class Teacher** | Homeroom teacher for a class | One per class | Mrs. Sharma is Class Teacher of 5A |
| **Timetable Slot** | Subject teaching in a specific period | Many per teacher | Mr. Kumar teaches Math to 5A (Mon P1), 6B (Tue P2) |

### 2.2 Class Teacher

- Add `classTeacherId` (nullable) to `Class` table.
- Admin assigns one Class Teacher per class.
- Class Teacher = primary contact, attendance, general class matters.
- **API:** Update Class (PUT) to accept `classTeacherId`. New endpoint: `GET /api/classes?withClassTeacher=true` to list classes with their class teacher.

### 2.3 Timetable / Planner

**New table: `TimetableSlot`**

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | PK |
| classId | TEXT | FK → Class |
| subject | TEXT | e.g. "Mathematics", "Science", "English" |
| teacherId | TEXT | FK → Teacher |
| dayOfWeek | INT | 1=Mon, 2=Tue, … 6=Sat |
| periodNumber | INT | 1, 2, 3, … (e.g. 8 periods/day) |
| startTime | TEXT? | Optional: "09:00" |
| endTime | TEXT? | Optional: "09:45" |

**Unique constraint:** `(classId, dayOfWeek, periodNumber)` — one slot per class per period per day.

**Subjects:** Use same list as teacher specializations (Mathematics, Science, English, Hindi, etc.). No separate Subject table for MVP.

**Weekly vs Monthly:**  
- **Weekly** = same pattern every week (Mon–Sat).  
- **Monthly** = same weekly pattern; no separate monthly table for MVP.  
- Future: add `termId` or `sessionId` if different timetables per term.

---

## 3. What Happens to TeacherClassAssignment?

**Option A — Keep both**  
- `TeacherClassAssignment` = “teacher is linked to class” (legacy / quick filter).  
- `TimetableSlot` = actual teaching schedule.  
- Teacher’s “my classes” = from TimetableSlot.

**Option B — Replace with TimetableSlot**  
- Remove `TeacherClassAssignment`.  
- Teacher’s “my classes” = distinct (classId, subject) from TimetableSlot.  
- Cleaner, single source of truth.

**Recommendation:** **Option B** — use only TimetableSlot. Migration: for each existing TeacherClassAssignment, create placeholder TimetableSlot(s) if needed, or drop and rebuild from planner.

---

## 4. Admin Workflow (Premium, Easy to Use)

### Step 1: Assign Class Teacher (per class)

- **Where:** Classes page or dedicated “Class Teachers” section.
- **UI:** Table of classes; each row has a dropdown to select Class Teacher.
- **Bulk:** “Assign Class Teachers” page: list all classes, assign in one go.

### Step 2: Build Timetable (Planner)

**View options:**

1. **By Class** — Select class → grid (rows = periods, cols = days) → fill each cell with Subject + Teacher.
2. **By Teacher** — Select teacher → see their slots; add/edit/remove.
3. **Master grid** — All classes, filter by class/teacher.

**Recommended default:** **By Class** — most schools plan class-wise.

**Grid UX (by class):**

```
Class: 5A
         Mon    Tue    Wed    Thu    Fri    Sat
P1    [Math ] [Sci  ] [Eng  ] [Math ] [Hindi] [—    ]
P2    [Sci  ] [Math ] [Math ] [Eng  ] [Sci  ] [—    ]
P3    [Hindi] [Eng  ] [Sci  ] [Hindi] [Math ] [—    ]
...
```

- Each cell: dropdown Subject + dropdown Teacher.
- Conflict check: same teacher, same period, different class → warning.
- Optional: suggest teachers by specialization.

**Periods:**  
- Configurable (e.g. 6–8 periods).  
- MVP: fixed 8 periods. Future: `Period` table with start/end times.

---

## 5. Mobile App Alignment

### Teacher App

| Need | API | Response |
|------|-----|----------|
| My weekly timetable | `GET /api/planner/my-timetable` | Slots for logged-in teacher |
| My classes (for homework, etc.) | `GET /api/planner/my-classes` | Distinct (classId, class name, subject) from timetable |
| Today’s schedule | Client filters `my-timetable` by today’s dayOfWeek | — |

### Admin Web

| Need | API | Response |
|------|-----|----------|
| Full timetable for a class | `GET /api/planner/class/:classId` | All slots for that class |
| Full timetable for a teacher | `GET /api/planner/teacher/:teacherId` | All slots for that teacher |
| Create/update/delete slot | `POST/PUT/DELETE /api/planner/slots` | — |

### Shared

- Same `TimetableSlot` model for both.
- Teacher sees only their slots; admin sees all.

---

## 6. API Summary (Proposed)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/planner/my-timetable | Teacher | Logged-in teacher’s weekly slots |
| GET | /api/planner/my-classes | Teacher | Distinct classes+subjects from timetable |
| GET | /api/planner/class/:classId | Admin/Teacher | Full timetable for a class |
| GET | /api/planner/teacher/:teacherId | Admin | Full timetable for a teacher |
| GET | /api/planner/slots | Admin | List slots (filter by classId, teacherId) |
| POST | /api/planner/slots | Admin | Create slot |
| PUT | /api/planner/slots/:id | Admin | Update slot |
| DELETE | /api/planner/slots/:id | Admin | Delete slot |
| PUT | /api/classes/:id | Admin | Update class (incl. classTeacherId) |

**Deprecate (if Option B):**

- `GET /api/teachers/assignments/list`
- `POST /api/teachers/assignments`
- `DELETE /api/teachers/assignments/:id`

**Replace with:** Planner APIs above.

---

## 7. Migration Path

1. Add `classTeacherId` to Class.
2. Create `TimetableSlot` table.
3. Migrate: for each `TeacherClassAssignment`, optionally create one generic TimetableSlot (e.g. “General” subject, Mon P1) or ask admin to rebuild via planner.
4. Update Classes API to support classTeacherId.
5. Add Planner routes and admin UI.
6. Update Teacher “my classes” to use planner.
7. Remove TeacherClassAssignment usage (and table if desired).

---

## 8. Decisions (Confirmed)

1. **Periods:** Configurable — 6 for primary, 8 for secondary
2. **Days:** Mon–Sat only
3. **Class Teacher:** Separate "Assign Class Teachers" page
4. **Planner view:** Both By Class and By Teacher with toggle
5. **Migration:** Teacher "my classes" uses TimetableSlot first, falls back to TeacherClassAssignment

---

## 9. Next Step

Once you confirm the strategy (and answers to the open questions), implementation order:

1. DB migrations (Class.classTeacherId, TimetableSlot).
2. Backend: planner routes, classes update.
3. Admin: Class Teacher assignment UI.
4. Admin: Timetable/Planner UI (grid by class).
5. Update teacher “my classes” to use planner.
6. Mobile: use `/api/planner/my-timetable` and `/api/planner/my-classes`.
