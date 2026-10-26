import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../src/services/ai/MockAIProvider.js';
import { Trip } from '../src/types/index.js';

describe('AI Recommendation Engine', () => {
  const mockAI = new MockAIProvider();

  it('generates high alignment destination recommendations based on vibe', async () => {
    const recommendations = await mockAI.recommendDestinations({
      travel_vibe: 'adventure',
      budget_amount: 3000,
      currency: 'USD',
      duration_days: 7,
      traveler_count: 2,
      interests: ['Hiking', 'Glaciers'],
    });

    expect(recommendations.length).toBeGreaterThanOrEqual(4);
    for (const rec of recommendations) {
      expect(rec.destination).toBeTruthy();
      expect(rec.country).toBeTruthy();
      expect(rec.match_score).toBeGreaterThan(80);
      expect(rec.highlights.length).toBeGreaterThan(0);
      expect(rec.estimated_budget_breakdown).toBeDefined();
      expect(rec.estimated_budget_breakdown?.total_estimated).toBeGreaterThan(0);
    }
  });

  it('generates structured day-wise itinerary with budget breakdown', async () => {
    const sampleTrip: Trip = {
      id: 'test-trip-1',
      user_id: 'user-1',
      title: 'Tokyo Discovery Tour',
      destination: 'Tokyo, Japan',
      start_date: '2026-11-01',
      end_date: '2026-11-04',
      traveler_count: 2,
      currency: 'USD',
      travel_preferences: {
        travel_vibe: 'cultural',
        travel_pace: 'moderate',
        interests: ['Temples', 'Gastronomy'],
        preferred_transportation: ['Transit'],
        dietary_requirements: [],
        accessibility_requirements: [],
      },
      status: 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const itinerary = await mockAI.generateItinerary(sampleTrip);

    expect(itinerary.trip_title).toBe('Tokyo Discovery Tour');
    expect(itinerary.destination).toBe('Tokyo, Japan');
    expect(itinerary.days.length).toBe(4);
    expect(itinerary.total_estimated_cost).toBeGreaterThan(0);
    expect(itinerary.estimated_budget_breakdown).toBeDefined();
    expect(itinerary.estimated_budget_breakdown?.accommodation).toBeGreaterThan(0);
    expect(itinerary.practical_tips.length).toBeGreaterThan(0);

    // Verify activities structure
    const day1 = itinerary.days[0];
    expect(day1.activities.length).toBeGreaterThanOrEqual(2);
    for (const act of day1.activities) {
      expect(act.name).toBeTruthy();
      expect(act.start_time).toBeTruthy();
      expect(act.end_time).toBeTruthy();
      expect(['estimated', 'verified', 'approximate', 'unknown']).toContain(act.verification_status);
    }
  });

  it('regenerates a single day with custom user feedback', async () => {
    const sampleTrip: Trip = {
      id: 'test-trip-1',
      user_id: 'user-1',
      title: 'Paris Art Voyage',
      destination: 'Paris, France',
      start_date: '2026-11-01',
      end_date: '2026-11-03',
      traveler_count: 1,
      currency: 'EUR',
      travel_preferences: {
        travel_vibe: 'cultural',
        travel_pace: 'relaxed',
        interests: ['Art'],
        preferred_transportation: ['Walking'],
        dietary_requirements: [],
        accessibility_requirements: [],
      },
      status: 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existingDay = {
      id: 'day-1',
      itinerary_id: 'itin-1',
      day_number: 1,
      date: '2026-11-01',
      summary: 'Initial day',
      activities: [],
    };

    const regeneratedActivities = await mockAI.regenerateDay(
      sampleTrip,
      existingDay,
      'Focus heavily on artisan bakeries, food markets, and cozy cafes',
      []
    );

    expect(regeneratedActivities.length).toBeGreaterThan(0);
    const hasFoodRelated = regeneratedActivities.some(
      (a) => a.category === 'dining' || a.name.toLowerCase().includes('market') || a.description.toLowerCase().includes('food')
    );
    expect(hasFoodRelated).toBe(true);
  });
});
