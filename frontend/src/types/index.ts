export interface TravelPreferences {
  travel_vibe: string;
  travel_pace: 'relaxed' | 'moderate' | 'fast';
  travel_style?: 'budget' | 'standard' | 'luxury' | 'backpacker' | 'family';
  interests: string[];
  preferred_transportation: string[];
  dietary_requirements: string[];
  accessibility_requirements: string[];
  accommodation_preference?: string;
  notes?: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  origin?: string;
  destination: string;
  start_date: string;
  end_date: string;
  traveler_count: number;
  budget_amount?: number;
  currency: string;
  travel_preferences: TravelPreferences;
  status: 'draft' | 'planned' | 'ongoing' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface TripCreate {
  title: string;
  origin?: string;
  destination: string;
  start_date: string;
  end_date: string;
  traveler_count: number;
  budget_amount?: number;
  currency: string;
  travel_preferences: TravelPreferences;
  status?: string;
}

export interface TripUpdate {
  title?: string;
  origin?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  traveler_count?: number;
  budget_amount?: number;
  currency?: string;
  travel_preferences?: Partial<TravelPreferences>;
  status?: string;
}

export interface Activity {
  id: string;
  itinerary_day_id: string;
  name: string;
  description: string;
  category: string;
  start_time: string;
  end_time: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  estimated_cost: number;
  currency: string;
  estimated_duration_minutes: number;
  verification_status: 'estimated' | 'verified' | 'approximate' | 'unknown';
  display_order: number;
}

export interface ActivityUpdate {
  name?: string;
  description?: string;
  category?: string;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  estimated_cost?: number;
  currency?: string;
  estimated_duration_minutes?: number;
  verification_status?: 'estimated' | 'verified' | 'approximate' | 'unknown';
  display_order?: number;
}

export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_number: number;
  date: string;
  summary: string;
  notes?: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  trip_id: string;
  version: number;
  structured_itinerary: {
    trip_title?: string;
    destination?: string;
    overall_summary?: string;
    total_estimated_cost?: number;
    currency?: string;
    practical_tips?: string[];
    [key: string]: any;
  };
  generation_provider: string;
  days: ItineraryDay[];
  created_at: string;
  updated_at: string;
}

export interface DestinationOption {
  destination: string;
  country: string;
  match_score: number;
  tagline: string;
  highlights: string[];
  estimated_cost_range: string;
  best_season: string;
  reasoning: string;
  suggested_duration_days: number;
  accessibility_rating: string;
  estimated_budget_breakdown?: {
    daily_accommodation: number;
    daily_food: number;
    daily_activities: number;
    daily_transport: number;
    total_estimated: number;
    currency: string;
  };
}

export interface DestinationDiscoveryRequest {
  origin?: string;
  travel_vibe: string;
  budget_amount?: number;
  currency: string;
  duration_days: number;
  traveler_count: number;
  interests: string[];
  climate_preference?: string;
  mobility_notes?: string;
}

export interface DestinationRecommendationResponse {
  recommendations: DestinationOption[];
  generated_at: string;
  provider_used: string;
}

export interface ShareResponse {
  id: string;
  trip_id: string;
  share_token: string;
  share_url: string;
  expires_at?: string;
  created_at: string;
}

export interface PublicShareView {
  trip: Trip;
  itinerary?: Itinerary;
  is_shared_view: boolean;
}

export interface RefinementMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  summary_of_changes?: string[];
  timestamp: string;
}

export interface RefinementRequest {
  message: string;
  target_day?: number;
  preserve_activity_ids?: string[];
  conversation_history?: { role: string; content: string }[];
}

export interface RefinementResponse {
  itinerary: Itinerary;
  assistant_message: string;
  version: number;
  summary_of_changes: string[];
}

export interface ItineraryVersionItem {
  version: number;
  user_instruction?: string;
  summary?: string;
  created_at: string;
  total_days: number;
  estimated_total_cost: number;
}

export interface ItineraryVersionListResponse {
  trip_id: string;
  current_version: number;
  versions: ItineraryVersionItem[];
}

export interface Collaborator {
  id: string;
  trip_id: string;
  email: string;
  role: 'viewer' | 'editor';
  user_id?: string;
  created_at: string;
}


