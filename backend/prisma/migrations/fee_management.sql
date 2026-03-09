-- Run in Supabase SQL Editor
-- Fee Management: Student-wise, month-wise, payments, extras

-- 1. Extend FeeStructure: baseAmount, examinationFee, eventsFee, otherFee, lateFeePercent
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "baseAmount" DECIMAL(65,30);
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "examinationFee" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "eventsFee" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "otherFee" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "lateFeePercent" DECIMAL(5,2) DEFAULT 0;
UPDATE "FeeStructure" SET "baseAmount" = "amount" WHERE "baseAmount" IS NULL AND "amount" IS NOT NULL;

-- 2. FeeExtra: one-off extras per class per month (examination, events, etc.)
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

-- 3. StudentFee: per student per month
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

-- 4. Payment: each payment record
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

-- 5. FeePaymentAllocation: links payment to months
CREATE TABLE IF NOT EXISTS "FeePaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "studentFeeId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "FeePaymentAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeePaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE,
    CONSTRAINT "FeePaymentAllocation_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE
);

-- 6. SchoolConfig: UPI, QR, WhatsApp
CREATE TABLE IF NOT EXISTS "SchoolConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    CONSTRAINT "SchoolConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolConfig_key_key" ON "SchoolConfig"("key");
