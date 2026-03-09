-- School ERP - Run this in Supabase SQL Editor if prisma db push fails
-- Supabase Dashboard → SQL Editor → New query → Paste → Run

CREATE TYPE "Role" AS ENUM ('PARENT', 'TEACHER', 'ADMIN');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherClassAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    CONSTRAINT "TeacherClassAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherClassAssignment_teacherId_classId_key" ON "TeacherClassAssignment"("teacherId", "classId");

CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentParent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    CONSTRAINT "StudentParent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentParent_studentId_parentId_key" ON "StudentParent"("studentId", "parentId");

CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "attachmentUrl" TEXT,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "term" TEXT NOT NULL,
    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeStructure_classId_key" ON "FeeStructure"("classId");

CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stops" JSONB NOT NULL,
    "driver" TEXT,
    "vehicle" TEXT,
    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "exam" TEXT NOT NULL,
    "marks" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentParent" ADD CONSTRAINT "StudentParent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentParent" ADD CONSTRAINT "StudentParent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
