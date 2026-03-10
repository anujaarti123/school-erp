# Deploy Admin Dashboard on Vercel

Simple step-by-step guide to deploy the School ERP Admin Dashboard on Vercel.

---

## Prerequisites

- [Git](https://git-scm.com/) installed
- [Vercel account](https://vercel.com/signup) (free)
- Your admin code in a Git repository (GitHub, GitLab, or Bitbucket)

---

## Step 1: Push Your Code to GitHub

1. Open a terminal in your project folder.
2. Initialize Git (if not already done):
   ```bash
   cd "d:\SCHOOL ERP"
   git init
   ```
3. Create a `.gitignore` in the root if needed (ignore `node_modules`, `.env*`, etc.).
4. Create a new repository on [GitHub](https://github.com/new).
5. Push your code:
   ```bash
   git add .
   git commit -m "Initial commit - School ERP Admin"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## Step 2: Sign In to Vercel

1. Go to [vercel.com](https://vercel.com).
2. Click **Sign Up** or **Log In**.
3. Choose **Continue with GitHub** (recommended) and authorize Vercel.

---

## Step 3: Import Your Project

1. On the Vercel dashboard, click **Add New** → **Project**.
2. Find your repository (e.g. `YOUR_USERNAME/school-erp`).
3. Click **Import** next to it.

---

## Step 4: Configure the Project

1. **Framework Preset**: Vercel should auto-detect **Next.js**. If not, select it.
2. **Root Directory**: Click **Edit** and set:
   ```
   admin-web
   ```
   (Because the admin dashboard is inside the `admin-web` folder.)
3. **Build Command**: Leave as `next build` (default).
4. **Output Directory**: Leave as `.next` (default).

---

## Step 5: Add Environment Variable

1. Expand **Environment Variables**.
2. Add:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://school-erp-06ur.onrender.com`
3. Select **Production**, **Preview**, and **Development**.
4. Click **Add**.

---

## Step 6: Deploy

1. Click **Deploy**.
2. Wait 1–2 minutes for the build to finish.
3. When it’s done, you’ll see a URL like:
   ```
   https://your-project-name.vercel.app
   ```
4. Click the URL to open your admin dashboard.

---

## Step 7: Test the Deployment

1. Open the Vercel URL in your browser.
2. Log in with your admin email and password.
3. Check that data loads from the backend (students, teachers, fees, etc.).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **404 or blank page** | Ensure **Root Directory** is set to `admin-web`. |
| **Login fails / API errors** | Check `NEXT_PUBLIC_API_URL` is set to `https://school-erp-06ur.onrender.com`. |
| **Build fails** | Run `npm run build` inside `admin-web` locally and fix any errors. |
| **CORS errors** | Ensure your backend (Render) allows requests from your Vercel domain. |

---

## Updating the Deployment

1. Push changes to your Git repository:
   ```bash
   git add .
   git commit -m "Update admin dashboard"
   git push
   ```
2. Vercel will automatically redeploy.

---

## Optional: Custom Domain

1. In your Vercel project, go to **Settings** → **Domains**.
2. Add your domain (e.g. `admin.yourschool.com`).
3. Follow the DNS instructions to point your domain to Vercel.
