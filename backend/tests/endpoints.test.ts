import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Express API Endpoint Integration Tests', () => {
  describe('System Health & AI Providers', () => {
    it('GET /health returns healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.app).toBeDefined();
    });

    it('GET /api/v1/health/ai returns active AI capabilities', async () => {
      const res = await request(app).get('/api/v1/health/ai');
      expect(res.status).toBe(200);
      expect(res.body.active_provider).toBeDefined();
      expect(res.body.features.budget_estimation).toBe(true);
    });
  });

  describe('Destination Recommendations', () => {
    it('POST /api/v1/recommendations/destinations returns structured recommendations', async () => {
      const res = await request(app)
        .post('/api/v1/recommendations/destinations')
        .send({
          travel_vibe: 'cultural',
          budget_amount: 2500,
          currency: 'USD',
          duration_days: 6,
          traveler_count: 2,
          interests: ['Art', 'Museums', 'History'],
        });

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toBeInstanceOf(Array);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      expect(res.body.recommendations[0].destination).toBeDefined();
      expect(res.body.recommendations[0].match_score).toBeGreaterThan(0);
    });

    it('POST /api/v1/recommendations/destinations returns 422 on invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/recommendations/destinations')
        .send({
          // Missing required travel_vibe
          duration_days: -5,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Trips CRUD Operations', () => {
    let createdTripId: string;

    it('GET /api/v1/trips lists saved trips', async () => {
      const res = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0); // pre-seeded trip
      createdTripId = res.body[0].id;
    });

    it('POST /api/v1/trips creates a new trip successfully', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', 'Bearer demo-token')
        .send({
          title: 'Barcelona Architecture Immersion',
          destination: 'Barcelona, Spain',
          start_date: '2026-11-15',
          end_date: '2026-11-20',
          traveler_count: 2,
          budget_amount: 2800,
          currency: 'EUR',
          travel_preferences: {
            travel_vibe: 'cultural',
            travel_pace: 'moderate',
            interests: ['Gaudí', 'Modernisme', 'Tapas'],
            preferred_transportation: ['Walking', 'Metro'],
            dietary_requirements: [],
            accessibility_requirements: [],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Barcelona Architecture Immersion');
      createdTripId = res.body.id;
    });

    it('GET /api/v1/trips/:id fetches the trip details', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${createdTripId}`)
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdTripId);
      expect(res.body.destination).toBe('Barcelona, Spain');
    });

    it('PATCH /api/v1/trips/:id updates trip details', async () => {
      const res = await request(app)
        .patch(`/api/v1/trips/${createdTripId}`)
        .set('Authorization', 'Bearer demo-token')
        .send({
          title: 'Barcelona & Costa Brava Tour',
          traveler_count: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Barcelona & Costa Brava Tour');
      expect(res.body.traveler_count).toBe(3);
    });

    it('DELETE /api/v1/trips/:id removes the trip', async () => {
      const res = await request(app)
        .delete(`/api/v1/trips/${createdTripId}`)
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(204);

      // Verify it is gone
      const getRes = await request(app)
        .get(`/api/v1/trips/${createdTripId}`)
        .set('Authorization', 'Bearer demo-token');

      expect(getRes.status).toBe(404);
    });
  });

  describe('Itinerary Generation & Export Operations', () => {
    let tripId: string;
    let itinId: string;
    let dayId: string;

    it('generates an itinerary for a trip', async () => {
      // 1. Create a trip
      const tripRes = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', 'Bearer demo-token')
        .send({
          title: 'Paris Art & Culture',
          destination: 'Paris, France',
          start_date: '2026-11-01',
          end_date: '2026-11-03',
          traveler_count: 1,
          currency: 'EUR',
          travel_preferences: {
            travel_vibe: 'cultural',
            travel_pace: 'relaxed',
            interests: ['Louvre', 'Bistros'],
            preferred_transportation: ['Walking'],
            dietary_requirements: [],
            accessibility_requirements: [],
          },
        });
      tripId = tripRes.body.id;

      // 2. Generate itinerary
      const genRes = await request(app)
        .post(`/api/v1/trips/${tripId}/generate`)
        .set('Authorization', 'Bearer demo-token')
        .send({});

      expect(genRes.status).toBe(201);
      expect(genRes.body.days.length).toBe(3);
      itinId = genRes.body.id;
      dayId = genRes.body.days[0].id;

      // Check distance & travel time enrichment
      const day1 = genRes.body.days[0];
      expect(day1.activities[0].display_order).toBe(1);
      expect(day1.activities[0].distance_from_previous_km).toBe(0);
    });

    it('POST /api/v1/itineraries/:id/days/:dayId/regenerate updates single day', async () => {
      const res = await request(app)
        .post(`/api/v1/itineraries/${itinId}/days/${dayId}/regenerate`)
        .set('Authorization', 'Bearer demo-token')
        .send({
          feedback: 'Make it a leisurely culinary exploration with local street food and bistros',
          preserve_activity_ids: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(dayId);
      expect(res.body.activities.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/itineraries/:id/export exports Markdown format', async () => {
      const res = await request(app)
        .post(`/api/v1/itineraries/${itinId}/export?format=markdown`)
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/markdown');
      expect(res.text).toContain('# Paris Art & Culture');
      expect(res.text).toContain('## Day-by-Day Schedule');
    });

    it('POST /api/v1/itineraries/:id/export exports iCalendar (.ics) format', async () => {
      const res = await request(app)
        .post(`/api/v1/itineraries/${itinId}/export?format=ics`)
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('END:VCALENDAR');
    });

    it('POST /api/v1/itineraries/:id/export exports Printable HTML/PDF format', async () => {
      const res = await request(app)
        .post(`/api/v1/itineraries/${itinId}/export?format=pdf`)
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('WanderAI Itinerary Dossier');
    });
  });
});
