# Push Notifications — Upcoming Classes

## Overview

Teachers receive automatic push notifications before their classes (e.g. 5–15 minutes before).

## Architecture

1. **Device token registration** — Teacher's mobile app sends FCM token to backend.
2. **School timings** — Configurable period start times (e.g. P1=09:00, P2=09:45).
3. **Cron job** — Runs every 5–10 minutes, finds "upcoming" slots, sends push.
4. **Firebase Cloud Messaging** — Sends notifications to Android/iOS.

## Setup

### 1. Firebase

1. Create project at [Firebase Console](https://console.firebase.google.com).
2. Add Android/iOS app, download `google-services.json` (Android) / `GoogleService-Info.plist` (iOS).
3. Project Settings → Service accounts → Generate new private key → save as `firebase-service-account.json`.
4. Add to backend `.env`:
   ```
   FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
   ```

### 2. Database migration

Run in Supabase SQL Editor:

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

### 3. Period timings (optional)

For accurate "upcoming" detection, add start times. Default: P1=09:00, P2=09:45, … (45 min each).

Store in `SchoolConfig` table or env:
```
PERIOD_1_START=09:00
PERIOD_2_START=09:45
...
```

## API

### POST /api/notifications/register

**Auth:** Bearer token (Teacher)

**Body:**
```json
{
  "token": "fcm_device_token_here",
  "platform": "android"
}
```

**Response:** `{ "success": true }`

## Cron job

Run every 5–10 minutes (e.g. via cron, PM2, or cloud scheduler):

```bash
node scripts/send-upcoming-class-notifications.js
```

Logic:
1. Get current time, day of week (1–6 for Mon–Sat).
2. Find slots where teacher has class in next 5–15 minutes.
3. For each: get teacher's User ID → DeviceToken → send FCM.
4. Track sent notifications (e.g. in Redis or DB) to avoid duplicates within same window.

## Notification payload

```json
{
  "title": "Upcoming Class",
  "body": "Mathematics - Class 5A in 5 minutes",
  "data": {
    "type": "upcoming_class",
    "slotId": "...",
    "subject": "Mathematics",
    "className": "5A"
  }
}
```
