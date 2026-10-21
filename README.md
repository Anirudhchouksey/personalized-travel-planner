# WanderAI — Personalized Travel Itinerary Planner MVP

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-F55036)](https://groq.com)

A production-ready, full-stack AI travel planning SaaS web application that generates personalized, practical, evidence-conscious day-by-day travel itineraries calibrated to your travel pace, budget, dietary needs, mobility, and style.

---

## Key Features

- **Evidence-Conscious AI Generation**: Structured day-by-day itineraries with explicit verification tagging (`Verified Landmark`, `AI Estimated`, `Approximate`).
- **Multi-Provider AI Abstraction**:
  - **Groq Cloud API** (Default hosted provider: Llama 3.3 70B / 3.1 8B)
  - **Hugging Face Inference API** (Alternative hosted router)
  - **Ollama** (Local & offline development support)
  - **Mock LLM Provider** (Zero-cost, deterministic local demo & automated tests)
- **Geographic Grouping & Calibrated Pacing**: Sequence stops to minimize zigzagging; supports Relaxed, Moderate, and Fast pace limits.
- **Granular Day Refinement**: Regenerate any single day with custom instructions (e.g., *"Make it more family friendly with outdoor parks"*) while preserving the rest of the trip.
- **Publication-Grade PDF Export**: One-click server-side generated PDF dossiers built with ReportLab.
- **Secure Public Share Links**: High-entropy 256-bit URL-safe share links with token hashing, expiry, and owner revocation.
- **Supabase PostgreSQL & Auth**: Full Row Level Security (RLS) policies protecting user-owned itineraries with built-in instant Demo Traveler mode for previewing.

---

## Repository Structure

```text
personalized-travel-planner/
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/client.ts         # Typed API client
│   │   ├── components/           # Navbar, Footer, Badge, Modal
│   │   ├── features/auth/        # Supabase Auth & Demo Provider
│   │   ├── pages/                # Landing, Dashboard, Wizard, Itinerary, Discover, Share
│   │   └── types/                # Strict TypeScript contracts
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # FastAPI + Python 3.13 + Pydantic v2
│   ├── app/
│   │   ├── api/routes/           # Health, Trips, Itineraries, Recommendations, Shares
│   │   ├── core/                 # Config & Security
│   │   ├── db/                   # Supabase client & resilient repository pattern
│   │   ├── schemas/              # Pydantic validation models
│   │   ├── services/
│   │   │   ├── ai/               # Groq, HF, Ollama & Mock providers
│   │   │   ├── export/           # ReportLab PDF generator
│   │   │   ├── prompts/          # Evidence-conscious system prompts
│   │   │   └── recommendations/  # Hybrid scoring recommendation engine
│   │   └── main.py
│   ├── tests/                    # Automated Pytest suite
│   ├── requirements.txt
│   └── render.yaml               # Render web service blueprint
├── supabase/
│   ├── schema.sql                # Complete DDL & RLS policies
│   └── migrations/
└── docs/                         # Architecture, API, Database, and Deployment guides
```

---

## Local Development Quickstart

### Prerequisites
- **Python**: 3.11+ (tested on Python 3.13)
- **Node.js**: 18+ (tested on Node v24)
- **Git**

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run automated tests
python -m pytest tests/ -v -p no:asyncio

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### 2. Frontend Setup

In a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
- Application Web UI: [http://localhost:5173](http://localhost:5173)

---

## Configuring AI Providers

Set `AI_PROVIDER` in `backend/.env`:

| Provider | Environment Variables Required | Notes |
| :--- | :--- | :--- |
| **mock** (Default) | *None* | Zero-cost deterministic generator. Works offline immediately. |
| **groq** | `GROQ_API_KEY`, `GROQ_MODEL=llama-3.3-70b-versatile` | Ultra-fast inference with native JSON mode. |
| **huggingface**| `HUGGINGFACE_API_TOKEN`, `HUGGINGFACE_MODEL` | Serverless hosted inference. |
| **ollama** | `OLLAMA_BASE_URL=http://localhost:11434` | Fully local and private. |

---

## Deployment

- **Frontend**: One-click deployment to [Vercel](https://vercel.com) using `frontend/vercel.json`.
- **Backend**: Containerless deployment to [Render](https://render.com) using `backend/render.yaml`.
- **Database**: Run `supabase/schema.sql` inside the [Supabase SQL Editor](https://supabase.com).

For step-by-step guides, consult the [`docs/`](docs/) directory:
- [Architecture & Design](docs/architecture.md)
- [API Reference](docs/api.md)
- [Database Schema & RLS](docs/database.md)
- [Production Deployment](docs/deployment.md)
