-- Run in Supabase SQL Editor to add password for Teacher/Admin login
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
