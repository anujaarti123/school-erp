# School ERP — Premium MVP

A school management app with **mobile app** (Parents & Teachers) and **Admin web dashboard**.

## Project structure

```
school-erp/
├── mobile_app/     # Flutter — Parents & Teachers (Play Store)
├── admin-web/      # Next.js — Admin dashboard (browser)
├── backend/        # Node.js + Prisma — API
└── docs/           # Proposal, summary, design guide
```

## Quick start

### 1. Mobile app (Flutter)

```bash
cd mobile_app
flutter pub get
flutter run
```

- **Login:** Parent (phone OTP) or Teacher (email/password)
- **Screens:** Login, Parent dashboard, Teacher dashboard
- **Theme:** Premium (Plus Jakarta Sans, Source Sans 3, deep teal palette)

### 2. Admin web (Next.js)

```bash
cd admin-web
npm install
npm run dev
```

Open http://localhost:3000 — Admin login and dashboard with sidebar.

### 3. Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL (Supabase PostgreSQL)
npx prisma generate
npm run dev
```

API runs on http://localhost:4000

## Design

- **Fonts:** Plus Jakarta Sans (headings), Source Sans 3 (body)
- **Colors:** Primary #0F766E, background #F8FAFC, text #1E293B
- **Splash:** Deep teal (#0F766E)

See `DESIGN-GUIDE-PREMIUM.md` for full specs.
