# Architecture & System Design: WanderAI Personalized Travel Planner

## 1. Executive Summary

WanderAI is a high-availability, full-stack AI travel planning web application designed to eliminate itinerary planning fatigue. Unlike generic chatbots that return wall-of-text itineraries with geographic backtracking and unrealistic travel schedules, WanderAI combines deterministic heuristic geographic routing with LLM structured inference to generate practical, evidence-grounded, day-by-day travel schedules with verifiable landmarks and realistic transit times.

---

## 2. System Architecture Diagram

```mermaid
graph TD
    User([End User / Traveler])

    subgraph Frontend["Frontend Client Layer (Vite + React 18 + TypeScript + Tailwind CSS)"]
        UI_Landing["Landing Page (Hero & Discovery Preview)"]
        UI_Discover["Destination Discovery Engine (/discover)"]
        UI_Wizard["Multi-Step Preferences Wizard (/wizard)"]
        UI_Dashboard["My Trips Dashboard (/dashboard)"]
        UI_Details["Interactive Trip Details & Schedule (/trips/:id)"]
        UI_Collab["Companion Collaboration Manager Modal"]
        UI_Refine["Conversational Refinement Panel"]
        UI_Share["Public Read-Only Share View (/share/:token)"]
        UI_Auth["Authentication Context (Supabase Auth & Guest Mode)"]
        ClientAPI["Typed Fetch API Client with CORS & Timeout Handling"]
    end

    subgraph Backend["Backend API Layer (Python 3.11+ / FastAPI / Uvicorn / Pydantic v2)"]
        FastAPI_App["FastAPI Core Application (app.main:app)"]
        CORS_Middleware["CORS Middleware with Wildcard Error Headers"]
        Timing_Middleware["Request Process Time Middleware"]
        Security["Auth Security Layer (Bearer JWT / Supabase / Demo Fallback)"]

        subgraph Routers["API v1 Routers"]
            R_Health["/health & /api/v1/health/ai"]
            R_Auth["/api/v1/auth (Register, Login, Me)"]
            R_Trips["/api/v1/trips (CRUD & Trip Lifecycle)"]
            R_Itineraries["/api/v1/itineraries (Generation, Refinement, Versions)"]
            R_Recs["/api/v1/recommendations (Destinations & Activities)"]
            R_Shares["/api/v1/shares (High-Entropy URL Tokens)"]
            R_History["/api/v1/history"]
            R_Routes["/api/v1/routes (TSP & Route Optimization)"]
        end

        subgraph Services["Core Business Services"]
            TripService["Trip Service (Lifecycle & Validation)"]
            ItineraryService["Itinerary Service (Day/Activity Orchestration)"]
            RecEngine["Recommendation Engine (Discovery & Filtering)"]
            RouteOptimizer["Route Optimizer (Haversine & OSRM Routing)"]
            ExportService["Multi-Format Exporter (PDF/HTML, Markdown, iCal, JSON)"]
        end
    end

    subgraph AI["AI Orchestration Layer (google-genai SDK)"]
        AIFactory["AI Provider Factory"]
        Gemini["Google Gemini Flash (gemini-2.5-flash / gemini-1.5-flash)"]
        MockLLM["Deterministic High-Fidelity Mock AI (Zero-Cost / Offline)"]
    end

    subgraph Storage["Data Persistence & Security"]
        Supabase["Supabase PostgreSQL (Tables: trips, itineraries, activities, shares)"]
        RLS["PostgreSQL Row Level Security (RLS)"]
        MemoryStore["Resilient In-Memory Fallback Repository"]
    end

    User --> Frontend
    Frontend --> ClientAPI
    ClientAPI --> FastAPI_App
    FastAPI_App --> CORS_Middleware
    CORS_Middleware --> Timing_Middleware
    Timing_Middleware --> Security
    Security --> Routers
    Routers --> Services
    Services --> AIFactory
    AIFactory --> Gemini
    AIFactory --> MockLLM
    Services --> RouteOptimizer
    Services --> ExportService
    Services --> Storage
    Storage --> Supabase
    Supabase --> RLS
    Storage --> MemoryStore
```

---

## 3. Technology Stack & Key Decisions

### 3.1 Frontend Client Layer
- **Framework**: React 18 with TypeScript 5.5, bundled via Vite.
- **Styling**: Tailwind CSS with an earthy sand and forest-green color palette, responsive layout breakpoints, and dark text for readability.
- **UI & Animations**: Framer Motion for stepper transitions and Lucide React for consistent iconography.
- **Client Routing**: React Router v6 with lazy-loaded route chunking for minimal initial bundle size (< 120 kB gzip).
- **Client Validation**: Strong TypeScript interface contracts matching backend Pydantic schemas.
- **Testing**: Vitest + React Testing Library for component isolation and auth flow verification.

### 3.2 Backend Service Layer
- **Framework**: FastAPI (Python 3.11+), asynchronous request processing using Uvicorn ASGI.
- **Data Validation**: Pydantic v2 schemas for all request payloads, query parameters, and outgoing JSON responses.
- **Authentication**: Dual-mode auth supporting Supabase Bearer JWT tokens, local backend auth JWTs, and an explicit demo mode with zero friction.
- **Error Handling**: Unified global exception handling with automatic CORS header preservation on 4xx/5xx responses.
- **Testing**: Pytest with `httpx` async TestClient, 57 automated backend unit and integration tests.

### 3.3 AI Orchestration Layer
- **Primary Provider**: Google Gemini Flash (using the official `google-genai` SDK).
- **Model Sanitization**: Automatic stripping of surrounding quotes, whitespace, and legacy `models/` prefixes from environment configuration.
- **Structured JSON Output**: System prompts enforce strict JSON schema compliance. Markdown code fences are stripped before schema parsing.
- **Timeout & Fallback Protection**: 18-second timeout guard on live AI calls with automatic failover to the high-fidelity `MockProvider` to prevent user-facing hangs during upstream Gemini rate limits.

### 3.4 Data & Storage Layer
- **Primary Database**: Supabase PostgreSQL (free-tier 500 MB capacity) with Row Level Security (RLS) policies enforcing multi-tenant isolation.
- **Offline / Zero-Config Fallback**: Resilient In-Memory Repository allowing local testing and CI test suites to pass without live external database credentials.
- **Sharing Architecture**: Cryptographically secure URL-safe tokens (32 bytes entropy), hashed via SHA-256 before database storage to eliminate token enumeration attacks.

---

## 4. End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Traveler as Traveler (Browser)
    participant Client as React Client (Vite)
    participant API as FastAPI Backend
    participant AI as Google Gemini / Mock AI
    participant Optimizer as Route Optimizer
    participant DB as Supabase PostgreSQL

    Traveler->>Client: Selects destination, dates, vibe, budget in Wizard
    Client->>API: POST /api/v1/trips (TripCreate payload)
    API->>DB: Persist trip record (status: 'planned')
    DB-->>API: Saved trip (trip_id)
    API-->>Client: 201 Created (trip_id)

    Client->>API: POST /api/v1/trips/{id}/generate
    API->>AI: Generate structured itinerary prompt with preferences
    alt Gemini Active & Healthy
        AI-->>API: Valid JSON daily activities & coordinates
    else Gemini Timeout or Rate Limit (429/503)
        API->>AI: Fallback to MockProvider
        AI-->>API: Deterministic realistic itinerary
    end

    API->>Optimizer: Order stops by geographic proximity (TSP / Haversine)
    Optimizer-->>API: Optimized chronological schedule
    API->>DB: Persist itinerary, days, and activities
    API-->>Client: 200 OK (Full structured itinerary)
    Client-->>Traveler: Render interactive day-by-day itinerary view
```

---

## 5. Security Architecture

1. **Strict Secret Isolation**:
   - Environment secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SECRET_KEY`) are stored in server-side environment variables and never baked into client bundles.
   - Frontend only accesses public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

2. **Row Level Security (RLS)**:
   - All trips, itineraries, activities, and collaborator tables enforce PostgreSQL RLS policies ensuring users can only read and mutate records they own or have been explicitly granted collaborator permissions on.

3. **Safe Public Sharing**:
   - Sharing links use `secrets.token_urlsafe(32)`. Only the SHA-256 hash of the token is stored in the database.
   - Public share endpoints deliver a sanitized, read-only view of the itinerary that excludes traveler IDs, account emails, and sensitive user profile fields.

4. **Defensive CORS Configuration**:
   - Explicit whitelist origin parsing supporting local development (`http://localhost:5173`, `http://localhost:3000`), production Vercel domains (`https://*.vercel.app`), and Render backends (`https://*.onrender.com`).
   - Exception handlers explicitly attach CORS response headers so cross-origin browsers receive clean JSON errors rather than opaque `TypeError: Failed to fetch`.
