import { describe, it, expect } from 'vitest';

describe('Trip Creation & Wizard Validation Engine', () => {
  const validateTripForm = (data: {
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
    } else {
      const s = new Date(data.startDate);
      const e = new Date(data.endDate);
      if (e < s) {
        errors.dates = 'Return date must be on or after departure date.';
      }
    }

    if (data.travelers < 1 || data.travelers > 50) {
      errors.travelers = 'Travelers must be between 1 and 50.';
    }

    if (data.budget < 0) {
      errors.budget = 'Budget cannot be negative.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  it('rejects empty destinations and negative budgets', () => {
    const res = validateTripForm({
      destination: '',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      travelers: 1,
      budget: -100,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.destination).toBe('Please enter a destination or city.');
    expect(res.errors.budget).toBe('Budget cannot be negative.');
  });

  it('rejects end dates occurring before start dates', () => {
    const res = validateTripForm({
      destination: 'Tokyo',
      startDate: '2026-11-10',
      endDate: '2026-11-02',
      travelers: 2,
      budget: 1500,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.dates).toBe('Return date must be on or after departure date.');
  });

  it('validates party sizes beyond allowed limits', () => {
    const resUnder = validateTripForm({
      destination: 'Rome',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      travelers: 0,
      budget: 1000,
    });
    expect(resUnder.isValid).toBe(false);
    expect(resUnder.errors.travelers).toBe('Travelers must be between 1 and 50.');

    const resOver = validateTripForm({
      destination: 'Rome',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      travelers: 55,
      budget: 1000,
    });
    expect(resOver.isValid).toBe(false);
    expect(resOver.errors.travelers).toBe('Travelers must be between 1 and 50.');
  });

  it('simulates rapid duplicate submission guard', async () => {
    let callCount = 0;
    let isSubmitting = false;

    const mockApiSubmit = async () => {
      if (isSubmitting) {
        return; // Guard against rapid clicks
      }
      isSubmitting = true;
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      isSubmitting = false;
    };

    // User rapidly clicks 3 times consecutively
    await Promise.all([mockApiSubmit(), mockApiSubmit(), mockApiSubmit()]);

    // Only 1 API call should have been initiated
    expect(callCount).toBe(1);
  });
});
