-- Run in Supabase SQL Editor
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "profession" TEXT;
