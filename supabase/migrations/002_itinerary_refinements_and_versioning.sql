-- ==============================================================================
-- Migration: 002_itinerary_refinements_and_versioning.sql
-- Description: Adds is_current flag, single-current constraint, and itinerary_refinements history table
-- ==============================================================================

-- 1. Extend itineraries table with is_current and refinement_instruction
ALTER TABLE public.itineraries
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS refinement_instruction TEXT;

-- Concurrency-safe unique constraint: only one is_current = TRUE per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_itineraries_single_current 
    ON public.itineraries(trip_id) 
    WHERE is_current = TRUE;

-- 2. Create itinerary_refinements table for conversational refinement tracking
CREATE TABLE IF NOT EXISTS public.itinerary_refinements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instruction TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_itinerary_refinements_trip_id ON public.itinerary_refinements(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_refinements_user_id ON public.itinerary_refinements(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_refinements_created_at ON public.itinerary_refinements(created_at DESC);

-- 3. Row Level Security for itinerary_refinements
ALTER TABLE public.itinerary_refinements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itinerary refinements"
    ON public.itinerary_refinements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own itinerary refinements"
    ON public.itinerary_refinements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own itinerary refinements"
    ON public.itinerary_refinements FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Atomic function to switch the active (is_current) itinerary version for a trip
CREATE OR REPLACE FUNCTION public.set_current_itinerary(
    p_trip_id UUID,
    p_itinerary_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Set all itineraries for this trip to false
    UPDATE public.itineraries
    SET is_current = FALSE, updated_at = NOW()
    WHERE trip_id = p_trip_id;

    -- Set target itinerary to current
    UPDATE public.itineraries
    SET is_current = TRUE, updated_at = NOW()
    WHERE id = p_itinerary_id AND trip_id = p_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
