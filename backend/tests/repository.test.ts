import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../src/services/db/InMemoryRepository.js';
import { TripCreate } from '../src/types/index.js';

describe('Database & Repository Access Rules', () => {
  let repo: InMemoryRepository;
  const userA = 'user-uuid-1111';
  const userB = 'user-uuid-2222';

  beforeEach(() => {
    repo = new InMemoryRepository();
  });

  it('creates and retrieves a trip for a specific user', async () => {
    const tripData: TripCreate = {
      title: 'Rome Odyssey',
      destination: 'Rome, Italy',
      start_date: '2026-12-01',
      end_date: '2026-12-05',
      traveler_count: 2,
      budget_amount: 1800,
      currency: 'EUR',
      travel_preferences: {
        travel_vibe: 'romantic',
        travel_pace: 'relaxed',
        interests: ['Piazzas', 'Gelato'],
        preferred_transportation: ['Walking'],
        dietary_requirements: [],
        accessibility_requirements: [],
      },
    };

    const created = await repo.createTrip(tripData, userA);
    expect(created.id).toBeDefined();
    expect(created.user_id).toBe(userA);
    expect(created.title).toBe('Rome Odyssey');

    const fetched = await repo.getTripById(created.id, userA);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Rome Odyssey');
  });

  it('enforces isolation: user B cannot access or delete user A private trip', async () => {
    const created = await repo.createTrip(
      {
        title: 'Secret Trip',
        destination: 'Venice',
        start_date: '2026-12-01',
        end_date: '2026-12-03',
        traveler_count: 1,
        currency: 'EUR',
        travel_preferences: {
          travel_vibe: 'cultural',
          travel_pace: 'moderate',
          interests: [],
          preferred_transportation: [],
          dietary_requirements: [],
          accessibility_requirements: [],
        },
      },
      userA
    );

    // User B tries to get it
    const unauthorizedGet = await repo.getTripById(created.id, userB);
    expect(unauthorizedGet).toBeNull();

    // User B tries to delete it
    const unauthorizedDelete = await repo.deleteTrip(created.id, userB);
    expect(unauthorizedDelete).toBe(false);

    // Trip still exists for User A
    const original = await repo.getTripById(created.id, userA);
    expect(original).not.toBeNull();
  });

  it('updates trip properties and preferences correctly', async () => {
    const created = await repo.createTrip(
      {
        title: 'Original Title',
        destination: 'London',
        start_date: '2026-11-01',
        end_date: '2026-11-04',
        traveler_count: 1,
        currency: 'GBP',
        travel_preferences: {
          travel_vibe: 'cultural',
          travel_pace: 'moderate',
          interests: ['Museums'],
          preferred_transportation: [],
          dietary_requirements: [],
          accessibility_requirements: [],
        },
      },
      userA
    );

    const updated = await repo.updateTrip(
      created.id,
      {
        title: 'Updated London Exploration',
        budget_amount: 1500,
      },
      userA
    );

    expect(updated?.title).toBe('Updated London Exploration');
    expect(updated?.budget_amount).toBe(1500);
  });

  it('supports public share generation and retrieval without credentials', async () => {
    const created = await repo.createTrip(
      {
        title: 'Shared Trip to Kyoto',
        destination: 'Kyoto, Japan',
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        traveler_count: 2,
        currency: 'USD',
        travel_preferences: {
          travel_vibe: 'cultural',
          travel_pace: 'moderate',
          interests: ['Gardens'],
          preferred_transportation: ['Transit'],
          dietary_requirements: [],
          accessibility_requirements: [],
        },
      },
      userA
    );

    const share = await repo.createShare(created.id, userA, 30);
    expect(share.share_token).toBeDefined();
    expect(share.share_url).toContain('/share/');

    const publicView = await repo.getPublicShare(share.share_token);
    expect(publicView).not.toBeNull();
    expect(publicView?.trip.id).toBe(created.id);
    expect(publicView?.is_shared_view).toBe(true);
  });
});
