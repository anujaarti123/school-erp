-- Run in Supabase SQL Editor
-- Adds fields for premium student management & duplication avoidance

-- Student: address, bus stop, image
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "busStop" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Parent: address (residence)
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "address" TEXT;
