# Database Architecture & Supabase PostgreSQL Guide

## Overview

WanderAI utilizes **Supabase PostgreSQL** with full **Row Level Security (RLS)** to protect user data while providing high-performance relational queries. When Supabase is not yet configured, the backend seamlessly falls back to a built-in in-memory resilient store for instant evaluation.

---

## 1. Relational Schema Architecture

```
auth.users (Supabase Auth)
  │
  ├── 1:1 ── profiles (display_name, preferred_currency, default_preferences)
  │
  ├── 1:N ── trips (title, origin, destination, start_date, end_date, budget, status)
  │            │
  │            ├── 1:N ── itineraries (version, structured_itinerary, provider)
  │            │            │
  │            │            └── 1:N ── itinerary_days (day_number, date, summary, notes)
  │            │                         │
  │            │                         └── 1:N ── activities (name, times, location, coordinates, cost, status, order)
  │            │
  │            └── 1:N ── shares (token_hash, expires_at, revoked_at)
  │
  └── 1:N ── saved_places (user favorites)
```

---

## 2. Table Specifications & Constraints

### `profiles`
- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `display_name TEXT`
- `preferred_currency TEXT DEFAULT 'USD'`
- `default_preferences JSONB`
- `created_at / updated_at TIMESTAMPTZ`

### `trips`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`
- `origin TEXT`
- `destination TEXT NOT NULL`
- `start_date DATE NOT NULL`
- `end_date DATE NOT NULL`
- `traveler_count INTEGER NOT NULL DEFAULT 1 CHECK (traveler_count >= 1)`
- `budget_amount NUMERIC(12, 2) CHECK (budget_amount >= 0)`
- `currency TEXT DEFAULT 'USD'`
- `travel_preferences JSONB NOT NULL DEFAULT '{}'`
- `status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'ongoing', 'completed', 'archived'))`
- `CONSTRAINT valid_dates CHECK (end_date >= start_date)`

### `itineraries`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE`
- `version INTEGER NOT NULL DEFAULT 1`
- `is_current BOOLEAN DEFAULT TRUE`
- `refinement_instruction TEXT`
- `structured_itinerary JSONB NOT NULL DEFAULT '{}'`
- `generation_provider TEXT DEFAULT 'mock'`
- `CONSTRAINT idx_itineraries_single_current UNIQUE (trip_id) WHERE is_current = TRUE`

### `itinerary_refinements`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE`
- `itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE SET NULL`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `instruction TEXT NOT NULL`
- `summary TEXT`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

### `itinerary_days`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE`
- `day_number INTEGER NOT NULL CHECK (day_number >= 1)`
- `date DATE NOT NULL`
- `summary TEXT`
- `notes TEXT`
- `CONSTRAINT unique_itinerary_day UNIQUE(itinerary_id, day_number)`

### `activities`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `itinerary_day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `description TEXT`
- `category TEXT DEFAULT 'sightseeing'`
- `start_time TEXT`
- `end_time TEXT`
- `location_name TEXT`
- `latitude DOUBLE PRECISION`
- `longitude DOUBLE PRECISION`
- `estimated_cost NUMERIC(10, 2) DEFAULT 0.00`
- `currency TEXT DEFAULT 'USD'`
- `estimated_duration_minutes INTEGER DEFAULT 60`
- `verification_status TEXT DEFAULT 'estimated' CHECK (verification_status IN ('estimated', 'verified', 'approximate', 'unknown'))`
- `display_order INTEGER DEFAULT 0`

### `shares`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE`
- `owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `token_hash TEXT NOT NULL UNIQUE`
- `expires_at TIMESTAMPTZ`
- `revoked_at TIMESTAMPTZ`

---

## 3. Row Level Security (RLS) Policies

All tables have RLS enabled:
1. **User Isolation**:
   - `trips`: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.
   - `itineraries`: Cascades through `trips.user_id = auth.uid()`.
   - `itinerary_days`: Cascades through `trips.user_id = auth.uid()`.
   - `activities`: Cascades through `trips.user_id = auth.uid()`.
2. **Public Share Links**:
   - Anyone holding an active, unrevoked `token_hash` can read the shared trip and its associated itinerary (`public.shares.revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`).

---

## 4. Setup Instructions

1. Create a free Supabase project at [https://supabase.com](https://supabase.com).
2. Open the **SQL Editor** tab in the Supabase Dashboard.
3. Paste and run `supabase/migrations/001_initial_schema.sql` to initialize tables, indexes, triggers, and Row Level Security.
4. Next, execute `supabase/migrations/002_itinerary_refinements_and_versioning.sql` to add version history support and the `itinerary_refinements` table.
5. Copy your `Project URL`, `anon key`, and `service_role key` into your backend `.env`:
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
