# Deployment Guide: Vercel, Render & Supabase

## 1. Backend Deployment on Render

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository containing `personalized-travel-planner`.
4. Configure the service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
5. Configure Environment Variables in Render:
   - `APP_ENV`: `production`
   - `AI_PROVIDER`: `groq` (or `huggingface`)
   - `GROQ_API_KEY`: Your Groq Cloud API Key (`gsk_...`)
   - `GROQ_MODEL`: `llama-3.3-70b-versatile`
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app`
   - `SECRET_KEY`: A strong 32-byte hex key (generate with `openssl rand -hex 32`)
6. Click **Create Web Service**. Note your public URL (e.g., `https://travel-planner-api.onrender.com`).

---

## 2. Frontend Deployment on Vercel

1. Create an account on [Vercel.com](https://vercel.com).
2. Click **Add New Project** and import the repository.
3. Configure the build parameters:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: Your Render backend URL (`https://travel-planner-api.onrender.com`)
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key
5. Deploy. Once deployed, verify SPA routing (provided by `frontend/vercel.json`).
6. Update the `FRONTEND_URL` and `CORS_ORIGINS` in your Render backend settings with the assigned Vercel URL.

---

## 3. Supabase Hosted Setup

1. Create a new Supabase project in your chosen geographic region.
2. In **SQL Editor**, paste and run `supabase/schema.sql`.
3. In **Authentication &rarr; URL Configuration**:
   - Set **Site URL** to your Vercel frontend URL.
   - Add your Vercel URL and `http://localhost:5173` to **Redirect URLs**.
4. In **Project Settings &rarr; API**:
   - Copy `Project URL` and `anon public` key to Vercel and Render.
   - Copy `service_role secret` key to Render backend only.
