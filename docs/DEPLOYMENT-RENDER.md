# Deploy School ERP Backend on Render

> **Why deploy online?** The mobile app runs on a physical phone. Your backend runs on your PC. The phone cannot reach `localhost` or `10.0.2.2` unless it's an emulator. Deploying online gives you a public URL (e.g. `https://school-erp-api.onrender.com`) that the phone can reach from anywhere.

---

## Why the mobile app wasn't working

| Setup | What happens |
|-------|--------------|
| **Emulator + PC backend** | `10.0.2.2:4000` works — emulator has special access to host |
| **Physical phone + PC backend** | Phone must use PC's LAN IP (e.g. `192.168.1.5:4000`). Same Wi‑Fi required. Firewall/router can block. |
| **Physical phone + online backend** | Phone uses `https://your-api.onrender.com` — works from anywhere |

---

## Step 1: Push code to GitHub

1. Create a GitHub account if you don't have one: https://github.com
2. Create a new repository (e.g. `school-erp`)
3. In your project folder:
   ```powershell
   cd "d:\SCHOOL ERP"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/school-erp.git
   git push -u origin main
   ```

---

## Step 2: Create Render account

1. Go to https://render.com
2. Sign up (free) with GitHub

---

## Step 3: Create Web Service on Render

1. **Dashboard** → **New** → **Web Service**
2. **Connect repository**: Select your `school-erp` repo (or connect GitHub first)
3. **Configure:**
   - **Name:** `school-erp-api`
   - **Root Directory:** `backend` (important — your API is in the backend folder)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. **Environment Variables** (Add these — **do not commit .env**):

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
   | `SUPABASE_SERVICE_KEY` | Your Supabase service role key (Settings → API) |
   | `JWT_SECRET` | A random secret string (e.g. `my-super-secret-key-change-in-prod-123`) |

5. Click **Create Web Service**

---

## Step 4: Get your API URL

After deployment (2–5 minutes), Render gives you a URL like:
```
https://school-erp-api.onrender.com
```

Test it: open `https://school-erp-api.onrender.com/api/health` in a browser. You should see `{"status":"ok",...}`.

---

## Step 5: Update mobile app

On the login screen, set **Server URL** to:
```
https://school-erp-api.onrender.com
```

(No port, no `http://` — use `https://`)

---

## Render free tier notes

- **Cold start:** First request after ~15 min idle may take 30–60 seconds. Subsequent requests are fast.
- **Spins down:** Free services sleep after inactivity. First login after sleep will be slow.
- **750 hours/month** free — enough for a school app.

---

## Alternative platforms

| Platform | Pros | Cons |
|----------|------|-----|
| **Render** | Simple, free tier, good docs | Cold starts on free |
| **Railway** | Easy, $5 credit/month | Credit runs out |
| **Fly.io** | Fast, global | Slightly more setup |
| **Vercel** | Great for frontend | Backend needs serverless adaptation |
| **Heroku** | Mature | No free tier anymore |

**Recommendation:** Render is the simplest for a Node/Express backend.
