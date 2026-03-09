# Supabase Configuration — Step-by-Step Guide

Follow these steps to connect your School ERP backend to Supabase.

---

## Step 1: Create a Supabase account

1. Go to **[supabase.com](https://supabase.com)**
2. Click **"Start your project"**
3. Sign up with **GitHub** or **Email**
4. Verify your email if required

---

## Step 2: Create a new project

1. After login, click **"New Project"**
2. Choose your **Organization** (or create one)
3. Fill in:
   - **Project name:** `school-erp` (or any name)
   - **Database password:** Create a strong password and **save it** (you'll need it for `DATABASE_URL`)
   - **Region:** Choose closest to your users (e.g. `Mumbai` for India)
4. Click **"Create new project"**
5. Wait 1–2 minutes for the project to be ready

---

## Step 3: Get your Database URL

1. In your Supabase project, go to **Settings** (gear icon in the left sidebar)
2. Click **"Database"** in the left menu
3. Scroll to **"Connection string"**
4. Select the **"URI"** tab
5. Copy the connection string. It looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
6. **Replace `[YOUR-PASSWORD]`** with the database password you set in Step 2
7. Add `?pgbouncer=true` at the end for connection pooling (recommended for serverless):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

## Step 4: Configure the backend

1. Open `backend/.env` in your project
2. Replace the `DATABASE_URL` with your Supabase connection string:

   ```
   DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   PORT=4000
   ```

3. Save the file

---

## Step 5: Push the database schema

1. Open a terminal in the project root
2. Run:

   ```bash
   cd backend
   npx prisma db push
   ```

3. When prompted, confirm with **Y** (if asked)
4. You should see: `Your database is now in sync with your schema`

---

## Step 6: Verify the connection

1. Run Prisma Studio to view your tables:

   ```bash
   cd backend
   npx prisma studio
   ```

2. A browser window opens at `http://localhost:5555`
3. You should see your tables: `User`, `Parent`, `Teacher`, `Admin`, `Student`, `Class`, `Homework`, etc.
4. Close Prisma Studio when done (Ctrl+C in terminal)

---

## Step 7 (Optional): Supabase Auth — for later

When you add Firebase for phone OTP (parents), you may still use Supabase for:

- **Teacher & Admin login** — Supabase Auth (email + password)
- **Row Level Security (RLS)** — restrict data by user

To enable Supabase Auth later:

1. Go to **Authentication** in Supabase dashboard
2. Enable **Email** provider
3. Add your custom logic in the backend to verify tokens

---

## Step 8 (Optional): Supabase Storage — for file uploads

For homework attachments and receipts:

1. Go to **Storage** in Supabase dashboard
2. Create a bucket (e.g. `homework` or `attachments`)
3. Set bucket to **Public** or **Private** (private + signed URLs is safer)
4. Use Supabase Storage API in your backend to upload files

---

## Quick reference

| Item | Where to find |
|------|----------------|
| **Project URL** | Supabase Dashboard → Settings → API |
| **Database URL** | Settings → Database → Connection string (URI) |
| **Anon key** | Settings → API → Project API keys |
| **Service role key** | Settings → API → Project API keys (keep secret) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **P1000 Authentication failed** | 1) Reset database password in Supabase (Settings → Database). 2) Use a simple password (letters + numbers only). 3) Fix `.env` syntax: use `=` not `-` |
| **P1001 Can't reach database server** | 1) Check if Supabase project is **paused** — restore it in the dashboard. 2) Try port **6543** (Transaction pooler) instead of 5432. 3) Disable VPN/firewall temporarily. 4) Try another network. |
| `Connection refused` | Check that your password has no special characters; if it does, URL-encode them (`@` → `%40`) |
| **Wrong .env syntax** | Must use equals sign: `DATABASE_URL="..."` and `PORT=4000`. Hyphen (`-`) will break parsing. |
| Password wrong | Reset in Supabase: Settings → Database → Reset database password |

---

## Summary checklist

- [ ] Create Supabase account
- [ ] Create new project
- [ ] Copy Database URL and replace `[YOUR-PASSWORD]`
- [ ] Add `DATABASE_URL` to `backend/.env`
- [ ] Run `npx prisma db push`
- [ ] Run `npx prisma studio` to verify tables

---

## Add password column (for Teacher/Admin login)

Run in Supabase SQL Editor:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
```

Then create initial admin:

```cmd
cd backend
node scripts/seed-admin.js
```

Default: `admin@school.com` / `admin123`

---

## Workaround: If `prisma db push` keeps failing (P1000/P1001/P1013)

Your network or firewall may block the connection. Apply the schema directly in Supabase:

1. Open **Supabase Dashboard** → **SQL Editor** → **New query**
2. Open `backend/prisma/schema.sql` in your project
3. **Copy all** the SQL
4. **Paste** into the Supabase SQL Editor
5. Click **Run**
6. Tables will be created. Then run locally: `npx prisma generate` (no DB connection needed)

---

## Copy-paste commands (Command Prompt)

```cmd
cd /d "D:\SCHOOL ERP\backend"
npx prisma db push
```

To verify tables (optional):

```cmd
cd /d "D:\SCHOOL ERP\backend"
npx prisma studio
```
