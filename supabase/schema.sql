-- ==============================================================================
-- PERSONALIZED TRAVEL ITINERARY PLANNER - SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    preferred_currency TEXT DEFAULT 'USD',
    default_preferences JSONB DEFAULT '{
        "travel_vibe": "cultural",
        "travel_pace": "moderate",
        "dietary_requirements": [],
        "accessibility_requirements": []
    }'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Automatically create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, preferred_currency)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'USD'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. TRIPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    origin TEXT,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    traveler_count INTEGER NOT NULL DEFAULT 1 CHECK (traveler_count >= 1),
    budget_amount NUMERIC(12, 2) CHECK (budget_amount >= 0),
    currency TEXT DEFAULT 'USD',
    travel_preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'ongoing', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.trips(created_at DESC);

CREATE TRIGGER handle_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ITINERARIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    structured_itinerary JSONB NOT NULL DEFAULT '{}'::JSONB,
    generation_provider TEXT DEFAULT 'groq',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON public.itineraries(trip_id);

CREATE TRIGGER handle_itineraries_updated_at
    BEFORE UPDATE ON public.itineraries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. ITINERARY_DAYS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1),
    date DATE NOT NULL,
    summary TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_itinerary_day UNIQUE(itinerary_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON public.itinerary_days(itinerary_id);

CREATE TRIGGER handle_itinerary_days_updated_at
    BEFORE UPDATE ON public.itinerary_days
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. ACTIVITIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'sightseeing',
    start_time TEXT,
    end_time TEXT,
    location_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    estimated_duration_minutes INTEGER DEFAULT 60,
    verification_status TEXT DEFAULT 'estimated' CHECK (verification_status IN ('estimated', 'verified', 'approximate', 'unknown')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_day_order ON public.activities(itinerary_day_id, display_order);

CREATE TRIGGER handle_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. SAVED_PLACES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    place_data JSONB DEFAULT '{}'::JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);

-- ------------------------------------------------------------------------------
-- 7. SHARES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_token_hash ON public.shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_shares_trip_id ON public.shares(trip_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Trips Policies
CREATE POLICY "Users can view own trips"
    ON public.trips FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
    ON public.trips FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
    ON public.trips FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Itineraries Policies
CREATE POLICY "Users can view own itineraries"
    ON public.itineraries FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = itineraries.trip_id AND trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own itineraries"
    ON public.itineraries FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = itineraries.trip_id AND trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own itineraries"
    ON public.itineraries FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = itineraries.trip_id AND trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own itineraries"
    ON public.itineraries FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = itineraries.trip_id AND trips.user_id = auth.uid()
    ));

-- 4. Itinerary Days Policies
CREATE POLICY "Users can view own itinerary days"
    ON public.itinerary_days FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.itineraries
        JOIN public.trips ON trips.id = itineraries.trip_id
        WHERE itineraries.id = itinerary_days.itinerary_id AND trips.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own itinerary days"
    ON public.itinerary_days FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.itineraries
        JOIN public.trips ON trips.id = itineraries.trip_id
        WHERE itineraries.id = itinerary_days.itinerary_id AND trips.user_id = auth.uid()
    ));

-- 5. Activities Policies
CREATE POLICY "Users can manage own activities"
    ON public.activities FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.itinerary_days
        JOIN public.itineraries ON itineraries.id = itinerary_days.itinerary_id
        JOIN public.trips ON trips.id = itineraries.trip_id
        WHERE itinerary_days.id = activities.itinerary_day_id AND trips.user_id = auth.uid()
    ));

-- 6. Saved Places Policies
CREATE POLICY "Users can manage own saved places"
    ON public.saved_places FOR ALL
    USING (auth.uid() = user_id);

-- 7. Shares Policies
CREATE POLICY "Owners can manage trip shares"
    ON public.shares FOR ALL
    USING (auth.uid() = owner_id);

CREATE POLICY "Public read active shares by hash"
    ON public.shares FOR SELECT
    USING (revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()));

-- Allow public read of trip and itinerary if an active share token exists
CREATE POLICY "Public read shared trip"
    ON public.trips FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.shares
        WHERE shares.trip_id = trips.id
          AND shares.revoked_at IS NULL
          AND (shares.expires_at IS NULL OR shares.expires_at > NOW())
    ));

CREATE POLICY "Public read shared itinerary"
    ON public.itineraries FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.shares
        WHERE shares.trip_id = itineraries.trip_id
          AND shares.revoked_at IS NULL
          AND (shares.expires_at IS NULL OR shares.expires_at > NOW())
    ));
