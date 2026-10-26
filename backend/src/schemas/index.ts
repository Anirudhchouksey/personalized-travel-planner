import { z } from 'zod';

export const travelPreferencesSchema = z.object({
  travel_vibe: z.string().min(1, 'Travel vibe is required'),
  travel_pace: z.enum(['relaxed', 'moderate', 'fast']).default('moderate'),
  travel_style: z.enum(['budget', 'standard', 'luxury', 'backpacker', 'family']).optional(),
  interests: z.array(z.string()).default([]),
  preferred_transportation: z.array(z.string()).default([]),
  dietary_requirements: z.array(z.string()).default([]),
  accessibility_requirements: z.array(z.string()).default([]),
  accommodation_preference: z.string().optional(),
  notes: z.string().optional(),
});

export const tripCreateSchema = z.object({
  title: z.string().min(1, 'Trip title is required').max(200),
  origin: z.string().optional(),
  destination: z.string().min(1, 'Destination is required').max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  traveler_count: z.number().int().min(1, 'Traveler count must be at least 1').default(1),
  budget_amount: z.number().positive('Budget amount must be positive').optional(),
  currency: z.string().length(3).default('USD'),
  travel_preferences: travelPreferencesSchema.default({
    travel_vibe: 'cultural',
    travel_pace: 'moderate',
    interests: [],
    preferred_transportation: [],
    dietary_requirements: [],
    accessibility_requirements: [],
  }),
  status: z.enum(['draft', 'planned', 'ongoing', 'completed', 'archived']).default('planned'),
}).refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'End date must be greater than or equal to start date',
  path: ['end_date'],
});

export const tripUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  origin: z.string().optional(),
  destination: z.string().min(1).max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  traveler_count: z.number().int().min(1).optional(),
  budget_amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  travel_preferences: travelPreferencesSchema.partial().optional(),
  status: z.enum(['draft', 'planned', 'ongoing', 'completed', 'archived']).optional(),
});

export const activityUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location_name: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  estimated_cost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  estimated_duration_minutes: z.number().int().min(0).optional(),
  verification_status: z.enum(['estimated', 'verified', 'approximate', 'unknown']).optional(),
  display_order: z.number().int().min(0).optional(),
});

export const destinationDiscoverySchema = z.object({
  origin: z.string().optional(),
  travel_vibe: z.string().min(1, 'Travel vibe is required'),
  travel_style: z.string().optional(),
  budget_amount: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  duration_days: z.number().int().min(1).max(30).default(7),
  traveler_count: z.number().int().min(1).default(1),
  interests: z.array(z.string()).default([]),
  climate_preference: z.string().optional(),
  mobility_notes: z.string().optional(),
});

export const regenerateDaySchema = z.object({
  feedback: z.string().min(1, 'Feedback instructions are required'),
  preserve_activity_ids: z.array(z.string()).default([]),
});

export const shareCreateSchema = z.object({
  trip_id: z.string().uuid('Valid trip UUID is required'),
  expires_in_days: z.number().int().min(1).max(365).default(30),
});

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'markdown', 'ics', 'pdf']).default('pdf'),
});

// Zod schemas for AI response parsing & validation
export const aiDestinationItemSchema = z.object({
  destination: z.string(),
  country: z.string(),
  match_score: z.number().min(0).max(100),
  tagline: z.string(),
  highlights: z.array(z.string()),
  estimated_cost_range: z.string(),
  best_season: z.string(),
  reasoning: z.string(),
  suggested_duration_days: z.number(),
  accessibility_rating: z.string(),
  estimated_budget_breakdown: z.object({
    daily_accommodation: z.number(),
    daily_food: z.number(),
    daily_activities: z.number(),
    daily_transport: z.number(),
    total_estimated: z.number(),
    currency: z.string(),
  }).optional(),
});

export const aiDestinationsResponseSchema = z.object({
  recommendations: z.array(aiDestinationItemSchema),
});

export const aiActivityItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string().default('sightseeing'),
  start_time: z.string(),
  end_time: z.string(),
  location_name: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  estimated_cost: z.number().default(0),
  currency: z.string().default('USD'),
  estimated_duration_minutes: z.number().default(60),
  verification_status: z.enum(['estimated', 'verified', 'approximate', 'unknown']).default('estimated'),
});

export const aiDayItemSchema = z.object({
  day_number: z.number(),
  date: z.string(),
  summary: z.string(),
  notes: z.string().optional(),
  activities: z.array(aiActivityItemSchema),
});

export const aiItineraryResponseSchema = z.object({
  trip_title: z.string(),
  destination: z.string(),
  overall_summary: z.string(),
  total_estimated_cost: z.number(),
  currency: z.string().default('USD'),
  estimated_budget_breakdown: z.object({
    accommodation: z.number(),
    activities: z.number(),
    food_and_dining: z.number(),
    local_transit: z.number(),
    buffer: z.number(),
    currency: z.string(),
  }).optional(),
  practical_tips: z.array(z.string()).default([]),
  days: z.array(aiDayItemSchema),
});
