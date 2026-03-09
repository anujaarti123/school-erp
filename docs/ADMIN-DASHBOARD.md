# Admin Dashboard — How to Open & Deploy

The admin dashboard is a **Next.js web app** that manages students, teachers, fees, bus, etc. It connects to your backend API.

---

## Option 1: Run Locally (Quick Start)

1. **Set the API URL** (so it uses your deployed backend):
   ```powershell
   cd "d:\SCHOOL ERP\admin-web"
   echo NEXT_PUBLIC_API_URL=https://school-erp-06ur.onrender.com > .env.local
   ```

2. **Install and run:**
   ```powershell
   npm install
   npm run dev
   ```

3. **Open in browser:** http://localhost:3000

4. **Login** with admin email + password (e.g. from seed-admin script)

---

## Option 2: Deploy Admin on Vercel (Free)

1. Go to https://vercel.com and sign up with GitHub.

2. **New Project** → Import `anujaarti123/school-erp`.

3. **Configure:**
   - **Root Directory:** `admin-web`
   - **Framework:** Next.js (auto-detected)
   - **Environment Variable:**
     - Key: `NEXT_PUBLIC_API_URL`
     - Value: `https://school-erp-06ur.onrender.com`

4. **Deploy** — Vercel gives you a URL like `https://school-erp-admin.vercel.app`.

5. Open that URL and login with admin credentials.

---

## Login Credentials

- **Admin:** Use the email/password from your seed script (`backend/scripts/seed-admin.js`).
- If not seeded, run:
  ```powershell
  cd backend
  node scripts/seed-admin.js
  ```
  (Requires `.env` with Supabase credentials.)

---

## Summary

| Component      | Status   | URL                                      |
|----------------|----------|------------------------------------------|
| **Backend API**| Deployed | https://school-erp-06ur.onrender.com     |
| **Admin**      | Local or Vercel | http://localhost:3000 or your Vercel URL |
| **Mobile App** | APK      | Installed on phone                       |
