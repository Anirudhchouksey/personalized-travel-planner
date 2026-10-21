# Architecture & System Design: Personalized Travel Itinerary Planner

## 1. Executive Summary

WanderAI is a high-availability, full-stack travel SaaS application designed to eliminate planning fatigue. Unlike typical chatbot interfaces that output unstructured text itineraries with impossible back-to-back schedules and geographic backtracking, WanderAI combines deterministic heuristic scoring with LLM structured inference to generate practical, evidence-grounded, day-by-day travel schedules.

---

## 2. Component Architecture

```mermaid
graph TD
    User([End User / Traveler])

    subgraph Frontend["Frontend Layer (Vite + React 18 + TypeScript + Tailwind)"]
        UI_Landing["Landing Page"]
        UI_Discover["Destination Discovery Engine"]
        UI_Wizard["Multi-Step Preference Wizard"]
        UI_Dashboard["Saved Trips Dashboard"]
        UI_Itinerary["Interactive Timeline & Schedule View"]
        UI_Shared["Public Read-Only Share View"]
        ClientAPI["Typed API Client & Supabase SDK"]
    end

    subgraph Backend["Backend Layer (FastAPI + Python 3.13 + Uvicorn)"]
        CORS["CORS & Request Latency Middleware"]
        AuthMiddleware["JWT Token & Dev Authenticator"]
        Router_Trips["/api/v1/trips"]
        Router_Itineraries["/api/v1/itineraries"]
        Router_Recs["/api/v1/recommendations"]
        Router_Shares["/api/v1/shares"]
        Router_Health["/health & /api/v1/health/ai"]

        Repo["Hybrid Repository Layer"]
        PromptBuilder["Evidence-Conscious Prompt Builder"]
        PDFGen["ReportLab PDF Dossier Generator"]
    end

    subgraph AI["Multi-Provider AI Abstraction"]
        LLMFactory["LLMProvider Factory"]
        Groq["Groq Cloud (Llama 3.3 70B / 3.1 8B)"]
        HF["Hugging Face Router (Inference API)"]
        Ollama["Local Ollama Daemon"]
        MockLLM["Deterministic High-Fidelity Mock"]
    end

    subgraph Database["Data & Security Layer"]
        SupabaseAuth["Supabase GoTrue Auth"]
        Postgres["Supabase PostgreSQL (RLS Enforced)"]
        InMemory["Resilient Store (Fallback / CI)"]
    end

    User -->|Browser HTTPS| Frontend
    Frontend --> ClientAPI
    ClientAPI -->|HTTP REST + Bearer Token| Backend
    Backend --> CORS --> AuthMiddleware

    AuthMiddleware --> Router_Trips
    AuthMiddleware --> Router_Itineraries
    AuthMiddleware --> Router_Recs
    AuthMiddleware --> Router_Shares
    AuthMiddleware --> Router_Health

    Router_Trips --> PromptBuilder
    Router_Itineraries --> PromptBuilder
    PromptBuilder --> LLMFactory

    LLMFactory --> Groq
    LLMFactory --> HF
    LLMFactory --> Ollama
    LLMFactory --> MockLLM

    Router_Itineraries --> PDFGen
    Router_Trips --> Repo
    Router_Itineraries --> Repo
    Router_Shares --> Repo

    Repo -->|PostgREST| Postgres
    Repo -.->|Fallback| InMemory
    ClientAPI -->|Session Management| SupabaseAuth
```

---

## 3. Core Architectural Decisions

### 3.1 Multi-Provider AI Strategy
- The application implements the `LLMProvider` abstract base class defining `generate_structured()` and `check_health()`.
- **Groq API**: Primary hosted provider offering sub-second response times using JSON object mode.
- **Hugging Face**: Alternative hosted serverless endpoint with JSON-constrained prompts.
- **Ollama**: Local, offline-capable inference targeting local models like `llama3.2`.
- **Mock Provider**: Zero-cost, high-reliability provider for automated test suites and seamless demonstrations without requiring API keys.

### 3.2 Evidence-Conscious Prompting & Grounding
- Pacing calibrator assigns 2–3 stops/day for **Relaxed**, 3–4 for **Moderate**, and 4–5 for **Fast**.
- Hard constraints (dietary requirements, wheelchair accessibility) are strictly injected into prompts.
- Explicit verification tagging distinguishes well-known landmarks (`verified`) from approximate districts (`approximate`) and plausible suggestions (`estimated`).

### 3.3 Security & Zero-Trust Architecture
- All user-owned data is guarded by Row Level Security (RLS) in PostgreSQL.
- Authenticated endpoints derive identity directly from validated Bearer JWT tokens.
- Public sharing links rely on high-entropy 256-bit URL-safe tokens stored as SHA-256 hashes with revocation timestamps and optional expiration.
