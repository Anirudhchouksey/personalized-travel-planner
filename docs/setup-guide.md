# Local Setup & Development Guide

This guide details how to clone, configure, run, and develop **WanderAI** locally on your machine with zero required external paid accounts.

---

## 1. System Prerequisites

Ensure you have the following installed on your operating system:

| Tool | Minimum Version | Recommended Version | Verify Command |
| :--- | :--- | :--- | :--- |
| **Python** | 3.10+ | 3.11 or 3.12 | `python --version` |
| **Node.js** | 18.0+ | 20 LTS or 22 LTS | `node --version` |
| **npm** | 9.0+ | 10.0+ | `npm --version` |
| **Git** | 2.30+ | Latest | `git --version` |
| *(Optional)* **Docker** | 20.10+ | Latest with Compose v2 | `docker compose version` |

---

## 2. Clone the Repository

```bash
git clone https://github.com/Anirudhchouksey/personalized-travel-planner.git
cd personalized-travel-planner
```

---

## 3. Backend Setup (FastAPI + Python)

### 3.1 Create and Activate a Python Virtual Environment

- **On Windows (PowerShell / Command Prompt)**:
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\activate
  ```

- **On macOS / Linux**:
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  ```

### 3.2 Install Backend Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3 Configure Backend Environment Variables

1. Copy the example configuration template:
   - On Windows: `copy .env.example .env`
   - On macOS/Linux: `cp .env.example .env`

2. Generate a secure random 32-byte `SECRET_KEY`:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Copy the output string and set it in your `.env`:
   ```env
   SECRET_KEY=your_generated_secret_key_here
   ```

3. **Choose Your AI Mode**:
   - **Mode A: Zero-Cost Live AI (Recommended)**:
     Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) and configure:
     ```env
     AI_PROVIDER=gemini
     GEMINI_MODEL=gemini-2.5-flash
     GEMINI_API_KEY=AIzaSy...your_actual_key
     ```
   - **Mode B: Zero-Config Offline Mock Mode (Instant Testing)**:
     If you don't have an API key or want to work offline:
     ```env
     AI_PROVIDER=mock
     GEMINI_API_KEY=mock-key
     ```

4. **Database Mode**:
   - If using Supabase, paste your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
   - If you skip Supabase, WanderAI automatically operates in **Resilient In-Memory Mode**, storing trips and itineraries in memory during your development session without errors.

### 3.4 Launch the Backend Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Documentation (Swagger)**: Open [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 4. Frontend Setup (React 18 + Vite + TypeScript)

Open a second terminal window in the project root:

### 4.1 Install Node Dependencies

```bash
cd frontend
npm install
```

### 4.2 Configure Frontend Environment Variables

Create or edit `frontend/.env`:
```env
# URL of your local FastAPI backend
VITE_API_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000

# Supabase Auth Configuration (Leave blank if testing in offline/guest mode)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4.3 Launch the Frontend Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Optional: Supabase PostgreSQL Database Setup

If you want persistent relational database storage across server restarts:

1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new organization and project (e.g., `wanderai-dev`).
3. In the left navigation, open **SQL Editor**.
4. Open the SQL migration files in this repository under `supabase/migrations/` and run them sequentially:
   - Run `001_initial_schema.sql` (Creates `profiles`, `trips`, `itineraries`, `itinerary_days`, `activities`, `shares` tables and RLS policies).
   - Run `002_itinerary_refinements_and_versioning.sql` (Adds versioning columns and snapshot storage).
   - Run `003_trip_collaborators.sql` (Adds multi-user trip sharing and collaborator roles).
5. Go to **Project Settings** > **API**:
   - Copy **Project URL** into `SUPABASE_URL` (backend) & `VITE_SUPABASE_URL` (frontend).
   - Copy **anon public key** into `SUPABASE_ANON_KEY` (backend) & `VITE_SUPABASE_ANON_KEY` (frontend).
   - Copy **service_role secret key** into `SUPABASE_SERVICE_ROLE_KEY` (backend only).

---

## 6. Running Local Verification Tests

### Run Backend Pytest Suite
```bash
cd backend
pytest -v
```
*Expected: 57 tests passing in ~4–6 seconds.*

### Run Frontend Vitest Suite
```bash
cd frontend
npm test
```
*Expected: 14 tests passing across 4 test suites.*

### Verify Production Bundle
```bash
cd frontend
npm run build
```
*Expected: `tsc` check passes with 0 type errors, outputs optimized chunks to `dist/`.*

---

## 7. Docker Quickstart (Alternative)

If you prefer running both services inside Docker containers without local Python or Node environments:

```bash
# From the repository root
docker compose up --build
```

- Frontend will be available at [http://localhost:3000](http://localhost:3000) or [http://localhost:5173](http://localhost:5173).
- Backend will be available at [http://localhost:8000](http://localhost:8000).

---

## 8. Common Troubleshooting Tips

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `npm : File D:\npm.ps1 cannot be loaded` (Windows) | PowerShell execution policy restricted | Run command through `cmd /c "npm run ..."` or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `TypeError: Failed to fetch` | Backend is not running or CORS mismatch | Ensure backend is active on port 8000 and `VITE_API_URL` is set to `http://localhost:8000`. |
| `Gemini API returned error code 400` | Model name format invalid or surrounding quotes | Ensure `GEMINI_MODEL=gemini-2.5-flash` (do not prefix with `models/` or wrap with extra quotation marks). |
| Port 8000 or 5173 already in use | Another service is using the port | Stop the existing process or run Uvicorn on another port: `uvicorn app.main:app --port 8001`. |
