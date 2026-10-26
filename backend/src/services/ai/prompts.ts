import { DestinationDiscoveryRequest, Trip, ItineraryDay, Activity } from '../../types/index.js';

export const buildDestinationDiscoveryPrompt = (req: DestinationDiscoveryRequest): string => {
  return `You are WanderAI, an expert travel planning system.
Given the following traveler profile, recommend exactly 4 destination options that best align with their desires.

TRAVELER PREFERENCES:
- Origin: ${req.origin || 'Not specified'}
- Desired Travel Vibe: ${req.travel_vibe}
- Travel Style: ${req.travel_style || 'standard'}
- Budget: ${req.budget_amount ? `${req.currency} ${req.budget_amount}` : 'Flexible'}
- Duration: ${req.duration_days} days
- Travelers: ${req.traveler_count}
- Interests: ${req.interests.join(', ') || 'General exploration'}
- Climate: ${req.climate_preference || 'Any'}
- Notes: ${req.mobility_notes || 'None'}

REQUIREMENTS:
1. Return purely valid JSON (no markdown fences, no explanatory preamble).
2. The JSON must match this structure:
{
  "recommendations": [
    {
      "destination": "City or Region name",
      "country": "Country name",
      "match_score": 95,
      "tagline": "Compelling 1-line description",
      "highlights": ["Key sight 1", "Key sight 2", "Key sight 3"],
      "estimated_cost_range": "e.g. $1,800 - $2,400",
      "best_season": "e.g. Spring (March - May)",
      "reasoning": "Explicit explanation of why this matches their vibe, budget, and interests.",
      "suggested_duration_days": 7,
      "accessibility_rating": "High / Moderate / Challenging",
      "estimated_budget_breakdown": {
        "daily_accommodation": 120,
        "daily_food": 60,
        "daily_activities": 40,
        "daily_transport": 20,
        "total_estimated": 1680,
        "currency": "${req.currency}"
      }
    }
  ]
}
Do not invent live flight prices or guarantee room availability. All monetary amounts must be clearly labeled estimated averages.`;
};

export const buildItineraryGenerationPrompt = (trip: Trip, daysCount: number): string => {
  return `You are WanderAI, a world-class travel planner.
Generate a structured, evidence-grounded day-by-day travel itinerary.

TRIP DETAILS:
- Title: ${trip.title}
- Destination: ${trip.destination}
- Origin: ${trip.origin || 'Not specified'}
- Start Date: ${trip.start_date}
- End Date: ${trip.end_date}
- Duration: ${daysCount} days
- Travelers: ${trip.traveler_count}
- Budget: ${trip.budget_amount ? `${trip.currency} ${trip.budget_amount}` : 'Flexible'}
- Travel Vibe: ${trip.travel_preferences.travel_vibe}
- Pace: ${trip.travel_preferences.travel_pace}
- Travel Style: ${trip.travel_preferences.travel_style || 'standard'}
- Interests: ${trip.travel_preferences.interests.join(', ') || 'Sightseeing'}
- Preferred Transportation: ${trip.travel_preferences.preferred_transportation.join(', ') || 'Walking, Transit'}
- Dietary: ${trip.travel_preferences.dietary_requirements.join(', ') || 'None'}
- Accessibility: ${trip.travel_preferences.accessibility_requirements.join(', ') || 'None'}
- Special Notes: ${trip.travel_preferences.notes || 'None'}

REQUIREMENTS:
1. Provide a realistic schedule for each day with 2 to 4 activities based on the pace (${trip.travel_preferences.travel_pace}).
2. Do not invent exact live prices or real-time ticket availability. Use realistic estimates and tag well-known landmarks as "verified", and generic activities/meals as "estimated".
3. Return purely valid JSON with no markdown fences, matching this structure:
{
  "trip_title": "${trip.title}",
  "destination": "${trip.destination}",
  "overall_summary": "2-3 sentences summarizing the journey experience.",
  "total_estimated_cost": 1500,
  "currency": "${trip.currency}",
  "estimated_budget_breakdown": {
    "accommodation": 700,
    "activities": 350,
    "food_and_dining": 300,
    "local_transit": 100,
    "buffer": 50,
    "currency": "${trip.currency}"
  },
  "practical_tips": [
    "Tip 1 regarding local transport or passes",
    "Tip 2 regarding customs or dining"
  ],
  "days": [
    {
      "day_number": 1,
      "date": "${trip.start_date}",
      "summary": "Morning arrival, orientation, and iconic landmark visit.",
      "notes": "Remember to validate transit pass at station.",
      "activities": [
        {
          "name": "Activity Name",
          "description": "Engaging description with practical context.",
          "category": "sightseeing",
          "start_time": "09:30",
          "end_time": "11:30",
          "location_name": "Specific landmark or neighborhood",
          "latitude": 48.8584,
          "longitude": 2.2945,
          "estimated_cost": 25.00,
          "currency": "${trip.currency}",
          "estimated_duration_minutes": 120,
          "verification_status": "verified"
        }
      ]
    }
  ]
}`;
};

export const buildDayRegenerationPrompt = (
  trip: Trip,
  day: ItineraryDay,
  feedback: string,
  preservedActivities: Activity[]
): string => {
  return `You are WanderAI. The traveler wants to regenerate Day ${day.day_number} (${day.date}) in ${trip.destination}.

FEEDBACK / REQUEST:
"${feedback}"

PRESERVED ACTIVITIES (Must keep these in the day's plan):
${JSON.stringify(preservedActivities, null, 2)}

Return purely valid JSON array of activities for Day ${day.day_number}:
[
  {
    "name": "Activity Name",
    "description": "Engaging description",
    "category": "sightseeing",
    "start_time": "10:00",
    "end_time": "12:00",
    "location_name": "Location Name",
    "latitude": 0.0,
    "longitude": 0.0,
    "estimated_cost": 20,
    "currency": "${trip.currency}",
    "estimated_duration_minutes": 90,
    "verification_status": "estimated"
  }
]`;
};
