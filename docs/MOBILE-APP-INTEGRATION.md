# Mobile App Integration — Teacher Planner & Push Notifications

## 1. Teacher Dashboard — My Timetable

Teachers must see their weekly schedule in the mobile app dashboard.

### API (already implemented)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/planner/my-timetable` | Teacher (Bearer token) | Returns teacher's weekly slots |

### Response format

```json
{
  "data": [
    {
      "id": "c123...",
      "classId": "c456...",
      "subject": "Mathematics",
      "teacherId": "c789...",
      "dayOfWeek": 1,
      "periodNumber": 1,
      "class": {
        "id": "c456...",
        "name": "5",
        "section": "A"
      }
    }
  ]
}
```

- `dayOfWeek`: 1=Mon, 2=Tue, … 6=Sat
- `periodNumber`: 1–8 (6 for primary, 8 for secondary classes)

### Mobile app usage

1. Teacher logs in via `POST /api/auth/login` (email + password).
2. Store the returned `token` in secure storage.
3. Call `GET /api/planner/my-timetable` with `Authorization: Bearer <token>`.
4. Display timetable:
   - **Weekly view:** Grid (days × periods) or list grouped by day
   - **Today view:** Filter by current day (e.g. Mon=1, Tue=2, …)
   - Show: Subject, Class (e.g. 5A), Period

### Example: Today's schedule

```dart
// Flutter example
final now = DateTime.now();
final dayOfWeek = now.weekday; // 1=Mon, 7=Sun
final dayIndex = dayOfWeek >= 1 && dayOfWeek <= 6 ? dayOfWeek : 0;
final todaySlots = slots.where((s) => s.dayOfWeek == dayIndex).toList();
```

---

## 2. Push Notifications — Upcoming Classes

Automatic reminders before each class (e.g. 5–15 minutes before).

### Flow

1. Teacher registers device token after login.
2. Backend runs a cron job every 5–10 minutes.
3. Cron finds slots starting soon (based on school timings).
4. Sends push to the teacher's device.

### Backend (see `PUSH-NOTIFICATIONS.md`)

- `POST /api/notifications/register` — register FCM/device token
- Cron: `node scripts/send-upcoming-class-notifications.js`

### Mobile app

1. Request notification permission.
2. Get FCM token (Firebase Cloud Messaging).
3. After login, call `POST /api/notifications/register` with `{ token, platform: "android" }`.
4. Handle incoming notifications (e.g. open timetable when tapped).

---

## 3. Parent Fees Tab

### API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/fees/my-children` | Parent (Bearer token) | Children's fee summary, total due, UPI/QR, admin WhatsApp |

### Response

```json
{
  "children": [
    {
      "student": { "id", "name", "rollNo", "class": { "name", "section" } },
      "fees": [ { "month", "year", "amount", "paidAmount", "dueAmount", "status" } ],
      "totalDue": 5000
    }
  ],
  "totalDue": 5000,
  "feeUpiId": "school@upi",
  "feeQrUrl": "https://...",
  "adminWhatsApp": "9876543210"
}
```

### "I have paid" — WhatsApp link

When parent taps "I have paid", open WhatsApp to admin with pre-filled message:

```
https://wa.me/91{adminWhatsApp}?text=I%20have%20paid%20%E2%82%B95000%20for%20Rahul%20Kumar.%20UPI%20Ref%3A%20xxx
```

Parent can add UPI reference before sending. Admin gets instant notification and records payment in admin panel.
