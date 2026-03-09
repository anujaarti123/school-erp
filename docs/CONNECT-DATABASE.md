# Connect Backend to Supabase Database

## Step 1: Get Supabase API keys

1. Open **Supabase Dashboard** → your **school-erp** project
2. Go to **Settings** (gear icon) → **API**
3. Copy:
   - **Project URL** (e.g. `https://tmzklezufmvjvnxopxci.supabase.co`)
   - **anon public** key (for client) OR **service_role** key (for backend — has full access, keep secret!)

## Step 2: Add to backend .env

Open `backend/.env` and add:

```
SUPABASE_URL="https://tmzklezufmvjvnxopxci.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key-here"
```

Use the **service_role** key for the backend (not anon key).

## Step 3: Restart backend

```cmd
cd /d "D:\SCHOOL ERP\backend"
npm run dev
```

## Step 4: Test

1. Open `http://localhost:4000/api/students` — should return data from Supabase
2. Open `http://localhost:4000/api/health` — should show `db: connected`
