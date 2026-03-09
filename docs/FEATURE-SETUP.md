# Feature Implementation — Setup & Run

## 1. Database migrations

Run in **Supabase SQL Editor** (one at a time):

**Password column:**
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
```

**Student & Parent fields:**
```sql
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "busStop" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "profession" TEXT;
```

**Teacher fields:**
```sql
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "fatherHusbandName" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "specialization" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "experience" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "address" TEXT;
```

**Planner & Class Teacher:**
```sql
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "classTeacherId" TEXT REFERENCES "Teacher"("id") ON DELETE SET NULL;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "level" TEXT DEFAULT 'primary';
UPDATE "Class" SET "level" = 'secondary' WHERE "name" IN ('6','7','8','9','10','11','12');

CREATE TABLE IF NOT EXISTS "TimetableSlot" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TimetableSlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE,
    CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TimetableSlot_class_day_period_key" ON "TimetableSlot"("classId", "dayOfWeek", "periodNumber");
```

**Device tokens (push notifications):**
```sql
CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");
```

**Fee Management** (run full migration — fixes "Could not find table FeeExtra" error):
```sql
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "baseAmount" DECIMAL(65,30);
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "examinationFee" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "eventsFee" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "otherFee" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "lateFeePercent" DECIMAL(5,2) DEFAULT 0;
UPDATE "FeeStructure" SET "baseAmount" = "amount" WHERE "baseAmount" IS NULL AND "amount" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "FeeExtra" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "feeType" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    CONSTRAINT "FeeExtra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeeExtra_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StudentFee" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paidAmount" DECIMAL(65,30) DEFAULT 0,
    "dueAmount" DECIMAL(65,30) NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "lateFeeAmount" DECIMAL(65,30) DEFAULT 0,
    CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentFee_student_month_year_key" ON "StudentFee"("studentId", "month", "year");

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "note" TEXT,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "FeePaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "studentFeeId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "FeePaymentAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeePaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE,
    CONSTRAINT "FeePaymentAllocation_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SchoolConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    CONSTRAINT "SchoolConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolConfig_key_key" ON "SchoolConfig"("key");
```

**Bus Management** (run in Supabase SQL Editor):
```sql
CREATE TABLE IF NOT EXISTS "BusDriver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    CONSTRAINT "BusDriver_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BusVehicle" (
    "id" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "registration" TEXT,
    CONSTRAINT "BusVehicle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BusRoute" ADD COLUMN IF NOT EXISTS "driverId" TEXT REFERENCES "BusDriver"("id") ON DELETE SET NULL;
ALTER TABLE "BusRoute" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT REFERENCES "BusVehicle"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "BusStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    CONSTRAINT "BusStop_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE
);

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "busRouteId" TEXT REFERENCES "BusRoute"("id") ON DELETE SET NULL;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pickupStopId" TEXT REFERENCES "BusStop"("id") ON DELETE SET NULL;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "dropStopId" TEXT REFERENCES "BusStop"("id") ON DELETE SET NULL;
```

**Fee Management setup:**
- **Session filter:** Summary and Students tabs show a session dropdown (e.g. 2025-26). Select a session to view fees for that academic year only.
- **Fee Start Year:** In Config (UPI / QR / WhatsApp), set "Fee Start Year" (e.g. 2023) to generate fees from April of that year. This captures previous-year dues.
- **Fee Structure:** Set base monthly fee per class in the Structure tab. If a class (e.g. 5A) has no structure, the system uses the sibling class (e.g. 5B) as fallback. For accurate amounts, set structure for all classes.

**Storage buckets:**
- `student-images` and `teacher-images` — backend auto-creates on first upload. Or create manually: Supabase → Storage → New bucket (Public: Yes).

## 2. Create initial Admin

```cmd
cd backend
node scripts/seed-admin.js
```

Default: `admin@school.com` / `admin123`

## 2b. Seed classes (LKG, UKG, Play–12, A & B)

```cmd
cd /d "d:\SCHOOL ERP\backend"
node scripts/seed-classes.js
```

Creates all classes: LKG A/B, UKG A/B, Play A/B, 1A/1B … 12A/12B.

## 3. Start backend

```cmd
cd backend
npm run dev
```

Or: `node src/index.js` — runs on http://localhost:4000

## 4. Start admin web

```cmd
cd admin-web
npm run dev
```

Login at http://localhost:3000 with admin credentials.

## 5. Deploy backend online (recommended for mobile app)

**Why?** The mobile app on a physical phone cannot reach `localhost`. Deploy the backend to get a public URL.

See **`docs/DEPLOYMENT-RENDER.md`** for step-by-step Render deployment. After deployment, set the API URL on the login screen (e.g. `https://school-erp-api.onrender.com`).

## 6. Run mobile app

**Android emulator** (default API URL `http://10.0.2.2:4000` works):

```cmd
cd mobile_app
flutter run
```

**Physical device** — use your PC's LAN IP (device and PC must be on same Wi‑Fi):

```cmd
flutter run --dart-define=API_URL=http://192.168.1.5:4000
```

Replace `192.168.1.5` with your PC's IP (run `ipconfig` on Windows). For APK:
```cmd
flutter build apk --dart-define=API_URL=http://YOUR_PC_IP:4000
```

**Login troubleshooting:**
- **Parent:** Phone must be registered. Parents are created when a student is added with that parent phone. Add a student in Admin → Students with parent phone 8116296268, then parent can login.
- **Teacher:** Email + password. Admin must add teacher first; password set via seed or admin.
- **Authorization error:** Usually wrong API URL. On physical device, use PC's LAN IP, not 10.0.2.2.

## 7. Bulk import

**Students:** Admin → Students → Bulk Import (template + upload).

**Timetable:** Admin → Timetable Planner → Bulk Import. Download template (Class, Day, Period, Subject, Teacher Email), fill Excel, upload. Option: Replace existing timetable.

## 8. Fee Management

1. Run fee migration (see `docs/FEE-MANAGEMENT-STRATEGY.md` or `backend/prisma/migrations/fee_management.sql`)
2. Admin → Fees → Set fee structure per class (base, exam, events, other, late %)
3. Admin → Fees → Config: UPI ID, QR URL, Admin WhatsApp
4. Parents: "I have paid" opens WhatsApp to admin with pre-filled message
5. Admin records payment → auto-allocates to oldest pending months (FIFO)

## 9. Push notifications (upcoming classes)

1. Run DeviceToken migration (see `docs/PUSH-NOTIFICATIONS.md`).
2. Teachers register FCM token via `POST /api/notifications/register` from mobile app.
3. Run cron every 5–10 min: `node scripts/send-upcoming-class-notifications.js`.
4. Requires Firebase (optional): add `FIREBASE_SERVICE_ACCOUNT` to .env.

## 10. Bulk import students

1. Admin → Students → **Bulk Import**
2. **Download Template** (fixed columns: Roll No, Student Name, Class, Section, Blood Group, Parent Name, Parent Phone, Parent Profession, Address, Bus Stop)
3. Fill Excel, save
4. **Upload & Import** — same parent phone auto-links; duplicates skipped

## 11. Create test data

1. **Admin web** → Classes → Run seed-classes.js if empty, or add manually
2. **Admin web** → Teachers → Add Teacher — or use **Bulk Import**
3. **Admin web** → Assign Class Teachers → Assign one homeroom teacher per class
4. **Admin web** → Timetable Planner → Build weekly timetable (By Class or By Teacher)
5. **Admin web** → Students → Add Student (roll no, name, class, parent name, parent phone, address, bus stop, image URL)
6. **Parent**: When adding a student, parent is auto-created/linked. Parent can login via mobile with phone.
7. **Teacher**: Teachers added in admin get a User login (email + password). They can login on the mobile app with the same credentials via `POST /api/auth/login`.

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | — | Teacher/Admin login |
| POST | /api/auth/register | — | Create Teacher/Admin |
| POST | /api/auth/parent | — | Parent login (phone lookup) |
| GET | /api/students | ✓ | List students |
| GET | /api/students/parent-lookup | ✓ | Lookup parent by phone |
| GET | /api/students/template | ✓ Admin | Download Excel template |
| POST | /api/students | ✓ Admin | Create student |
| POST | /api/students/bulk-upload | ✓ Admin | Bulk import from Excel |
| GET | /api/classes | ✓ | List classes |
| POST | /api/classes | ✓ Admin | Create class |
| GET | /api/homework | ✓ | List homework |
| POST | /api/homework | ✓ Teacher | Create homework |
| GET | /api/teachers | ✓ Admin | List teachers |
| GET | /api/teachers/:id | ✓ Admin | Get teacher |
| POST | /api/teachers | ✓ Admin | Create teacher (full profile + login) |
| PUT | /api/teachers/:id | ✓ Admin | Update teacher |
| DELETE | /api/teachers/:id | ✓ Admin | Delete teacher |
| GET | /api/teachers/template | ✓ Admin | Download bulk import template |
| POST | /api/teachers/bulk-upload | ✓ Admin | Bulk import teachers |
| GET | /api/teachers/assignments/list | ✓ | List assignments |
| POST | /api/teachers/assignments | ✓ Admin | Assign teacher to class |
| DELETE | /api/teachers/assignments/:id | ✓ Admin | Remove assignment |
| POST | /api/upload/teacher-image | ✓ Admin | Upload teacher photo |
| GET | /api/planner/config | ✓ | Subjects, days, periods |
| GET | /api/planner/my-timetable | Teacher | Teacher's weekly slots |
| GET | /api/planner/my-classes | Teacher | Teacher's classes from timetable |
| GET | /api/planner/class/:classId | ✓ | Timetable for a class |
| GET | /api/planner/teacher/:teacherId | Admin | Timetable for a teacher |
| GET | /api/planner/slots | Admin | List slots (filter by classId/teacherId) |
| POST | /api/planner/slots | Admin | Create slot |
| PUT | /api/planner/slots/:id | Admin | Update slot |
| DELETE | /api/planner/slots/:id | Admin | Delete slot |
| GET | /api/planner/template | Admin | Download planner import template |
| POST | /api/planner/bulk-upload | Admin | Bulk import timetable from Excel |
| POST | /api/notifications/register | Teacher | Register FCM token for push |
