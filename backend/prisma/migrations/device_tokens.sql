-- Run in Supabase SQL Editor
-- Device tokens for push notifications (upcoming class reminders)

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
