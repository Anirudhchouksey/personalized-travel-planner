import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const travelPreferencesSchema = z.object({
  travel_vibe: z.string().min(1, 'Travel vibe is required'),
  travel_pace: z.enum(['relaxed', 'moderate', 'fast']).default('moderate'),
  travel_style: z.enum(['budget', 'standard', 'luxury', 'backpacker', 'family']).default('standard'),
  interests: z.array(z.string()).default([]),
  preferred_transportation: z.array(z.string()).default([]),
  dietary_requirements: z.array(z.string()).default([]),
  accessibility_requirements: z.array(z.string()).default([]),
});

const tripFormValidation = (data: {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
}) => {
  const errors: Record<string, string> = {};

  if (!data.destination || data.destination.trim().length === 0) {
    errors.destination = 'Please enter a destination or city.';
  }

  if (!data.startDate || !data.endDate) {
    errors.dates = 'Please select both departure and return dates.';
  } else if (new Date(data.endDate) < new Date(data.startDate)) {
    errors.dates = 'Return date must be on or after departure date.';
  }

  if (data.travelers < 1) {
    errors.travelers = 'Must have at least 1 traveler.';
  }

  if (data.budget < 0) {
    errors.budget = 'Budget cannot be negative.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

describe('Frontend Preferences & Form Validation', () => {
  it('validates a complete travel preference payload', () => {
    const preferences = {
      travel_vibe: 'cultural',
      travel_pace: 'moderate' as const,
      travel_style: 'standard' as const,
      interests: ['Museums', 'Architecture'],
      preferred_transportation: ['Walking', 'Public Transit'],
      dietary_requirements: [],
      accessibility_requirements: [],
    };

    const parsed = travelPreferencesSchema.parse(preferences);
    expect(parsed.travel_vibe).toBe('cultural');
    expect(parsed.travel_style).toBe('standard');
    expect(parsed.interests.length).toBe(2);
  });

  it('validates trip wizard step constraints', () => {
    const valid = tripFormValidation({
      destination: 'Kyoto, Japan',
      startDate: '2026-11-01',
      endDate: '2026-11-06',
      travelers: 2,
      budget: 2500,
    });
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toEqual({});

    const invalidDates = tripFormValidation({
      destination: 'Tokyo',
      startDate: '2026-11-10',
      endDate: '2026-11-05',
      travelers: 1,
      budget: 1000,
    });
    expect(invalidDates.isValid).toBe(false);
    expect(invalidDates.errors.dates).toContain('Return date must be on or after departure date');

    const emptyDestination = tripFormValidation({
      destination: '   ',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      travelers: 1,
      budget: 1000,
    });
    expect(emptyDestination.isValid).toBe(false);
    expect(emptyDestination.errors.destination).toContain('Please enter a destination');
  });

  it('calculates accurate duration in days', () => {
    const start = new Date('2026-11-01');
    const end = new Date('2026-11-07');
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(diffDays).toBe(7);
  });
});
