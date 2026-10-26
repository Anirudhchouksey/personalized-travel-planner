import { describe, it, expect } from 'vitest';
import {
  tripCreateSchema,
  travelPreferencesSchema,
  destinationDiscoverySchema,
  activityUpdateSchema,
} from '../src/schemas/index.js';

describe('Validation Schemas (Zod)', () => {
  describe('Travel Preferences Schema', () => {
    it('validates a valid preference set', () => {
      const valid = {
        travel_vibe: 'cultural',
        travel_pace: 'moderate',
        interests: ['Museums', 'Gastronomy'],
        preferred_transportation: ['Walking'],
        dietary_requirements: ['Vegetarian'],
        accessibility_requirements: [],
      };
      const result = travelPreferencesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty travel vibe', () => {
      const invalid = {
        travel_vibe: '',
        travel_pace: 'moderate',
      };
      const result = travelPreferencesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid travel pace option', () => {
      const invalid = {
        travel_vibe: 'adventure',
        travel_pace: 'supersonic',
      };
      const result = travelPreferencesSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Trip Creation Schema', () => {
    it('validates a correct trip payload', () => {
      const payload = {
        title: 'Autumn in Kyoto',
        destination: 'Kyoto, Japan',
        start_date: '2026-11-01',
        end_date: '2026-11-06',
        traveler_count: 2,
        budget_amount: 2500,
        currency: 'USD',
        travel_preferences: {
          travel_vibe: 'cultural',
          travel_pace: 'relaxed',
          interests: ['Gardens'],
          preferred_transportation: ['Transit'],
          dietary_requirements: [],
          accessibility_requirements: [],
        },
      };
      const result = tripCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('fails when end date is earlier than start date', () => {
      const payload = {
        title: 'Invalid Date Trip',
        destination: 'Paris',
        start_date: '2026-11-10',
        end_date: '2026-11-05',
        traveler_count: 1,
        currency: 'USD',
        travel_preferences: {
          travel_vibe: 'cultural',
          travel_pace: 'moderate',
          interests: [],
          preferred_transportation: [],
          dietary_requirements: [],
          accessibility_requirements: [],
        },
      };
      const result = tripCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('End date must be greater than or equal to start date');
      }
    });

    it('fails when destination is empty', () => {
      const payload = {
        title: 'No Destination',
        destination: '',
        start_date: '2026-11-01',
        end_date: '2026-11-05',
      };
      const result = tripCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Destination Discovery Schema', () => {
    it('validates destination discovery filters with defaults', () => {
      const payload = {
        travel_vibe: 'adventure',
        duration_days: 7,
        traveler_count: 2,
        currency: 'EUR',
      };
      const parsed = destinationDiscoverySchema.parse(payload);
      expect(parsed.travel_vibe).toBe('adventure');
      expect(parsed.duration_days).toBe(7);
      expect(parsed.interests).toEqual([]);
    });
  });

  describe('Activity Update Schema', () => {
    it('validates partial activity edits with coordinate ranges', () => {
      const valid = {
        name: 'Updated Museum Tour',
        latitude: 48.8606,
        longitude: 2.3376,
        estimated_cost: 25,
      };
      expect(activityUpdateSchema.safeParse(valid).success).toBe(true);

      const invalidLatitude = {
        latitude: 195, // max is 90
      };
      expect(activityUpdateSchema.safeParse(invalidLatitude).success).toBe(false);
    });
  });
});
