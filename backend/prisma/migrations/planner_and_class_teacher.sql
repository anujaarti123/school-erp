-- Run in Supabase SQL Editor
-- Planner & Class Teacher: configurable periods (6 primary, 8 secondary), Mon-Sat

-- 1. Add classTeacherId and level to Class
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "classTeacherId" TEXT REFERENCES "Teacher"("id") ON DELETE SET NULL;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "level" TEXT DEFAULT 'primary'; -- 'primary' (6 periods) or 'secondary' (8 periods)

-- Set level for existing classes: 6-12 = secondary
UPDATE "Class" SET "level" = 'secondary' WHERE "name" IN ('6','7','8','9','10','11','12');

-- 2. Create TimetableSlot table
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

CREATE UNIQUE INDEX IF NOT EXISTS "TimetableSlot_class_day_period_key"
    ON "TimetableSlot"("classId", "dayOfWeek", "periodNumber");
