-- ==============================================================================
-- Migration: 003_trip_collaborators.sql
-- Description: Adds trip_collaborators table for travel coordination with role permissions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.trip_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_trip_collaborator_email UNIQUE (trip_id, email)
);

CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON public.trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_email ON public.trip_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON public.trip_collaborators(user_id);

-- Row Level Security
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Trip owners can manage all collaborators
CREATE POLICY "Trip owners can manage collaborators"
    ON public.trip_collaborators FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = trip_collaborators.trip_id AND trips.user_id = auth.uid()
    ));

-- Collaborators can view their own collaboration records
CREATE POLICY "Collaborators can view own assignments"
    ON public.trip_collaborators FOR SELECT
    USING (
        user_id = auth.uid() OR
        email = auth.jwt()->>'email'
    );

-- Allow collaborators with viewer or editor role to view the trip
CREATE POLICY "Collaborators can view collaborative trips"
    ON public.trips FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.trip_collaborators
        WHERE trip_collaborators.trip_id = trips.id
          AND (trip_collaborators.user_id = auth.uid() OR trip_collaborators.email = auth.jwt()->>'email')
    ));

-- Allow collaborators with editor role to update collaborative trips
CREATE POLICY "Editors can update collaborative trips"
    ON public.trips FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.trip_collaborators
        WHERE trip_collaborators.trip_id = trips.id
          AND trip_collaborators.role = 'editor'
          AND (trip_collaborators.user_id = auth.uid() OR trip_collaborators.email = auth.jwt()->>'email')
    ));
