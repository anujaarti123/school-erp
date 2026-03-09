# Stack Recommendation — One-Page Summary

## For Play Store: Flutter (app) + Node.js (backend)

- **Node.js** = backend only (not published to Play Store). Use for API, auth, business logic.
- **Flutter** = the app you publish to Play Store (and App Store). Recommended for premium, scalable MVP.

---

## Mobile App (Play Store / App Store)

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | **Flutter** | Single codebase Android + iOS; premium UI; splash + app icon |
| Language | **Dart** | Flutter’s native language |
| State | **Provider** / **Riverpod** / **Bloc** | State management, API state |
| Auth (app) | Phone OTP (parents), Email (teacher/admin) | Via backend + Supabase or Firebase Auth |
| Push | **FCM** or **OneSignal** | Push notifications |
| Premium | Custom **app icon**, **splash screen**, theme | Logo + splash + consistent UI |

---

## Backend (Node.js)

| Layer | Technology | Purpose |
|-------|------------|---------|
| API | **Next.js API Routes** (MVP) or **NestJS** (later) | REST or tRPC; same repo or separate |
| Database | **PostgreSQL** | Students, classes, fees, homework, bus — relational |
| ORM | **Prisma** | Type-safe queries, migrations |
| Hosted DB | **Supabase** or **Neon** | PostgreSQL + optional Auth + Storage |
| File storage | **Supabase Storage** or **S3** | Homework attachments, receipts |
| Payments | **Razorpay** / **Stripe** | Fee payments (Phase 2) |

## Environment & Tools

| Purpose | Tool |
|--------|------|
| Version control | Git (GitHub / GitLab) |
| Frontend + API deploy | **Vercel** |
| Database + Auth + Storage | **Supabase** (recommended for MVP) |
| Backend-only (if separate) | Railway, Render |
| Local env | `.env` + `.env.example` |

## Supabase vs Firebase

**Use Supabase:** Relational data (students, classes, fees, bus) fits PostgreSQL. Reports and scaling are easier. Use **FCM** or **OneSignal** for push; optionally **Firebase** only for phone OTP or FCM.

## Parent Login & Children Linking

**Phone OTP** for parents — use **Firebase Auth** (free phone OTP). **Admin** links parent phone to student(s); one parent can see multiple children. Teacher/Admin: **email + password** (Supabase Auth or your API).

## Notifications

**Push** (FCM/OneSignal) — must-have. **WhatsApp** (Business API) — optional complement; same backend events can trigger both.

## Premium + MVP + Scalable

**Premium:** App icon, splash screen, one theme (fonts, colors) from day one. **MVP:** Auth, homework, fees, bus, push. **Scalable:** Flutter + Node + PostgreSQL (Supabase); add features and schools without rewrite.

---

## Best Recommendation in One Line

**Flutter** (Play Store app) + **Node.js** (backend API) + **Supabase** (PostgreSQL, auth, storage) + **FCM/OneSignal** (push) + **Phone OTP** for parents + **app icon & splash** for premium feel — MVP with dedicated Parent / Teacher / Admin dashboards, scalable later.
