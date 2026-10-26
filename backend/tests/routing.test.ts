import { describe, it, expect } from 'vitest';
import { HaversineProvider } from '../src/services/routing/HaversineProvider.js';
import { RoutingService } from '../src/services/routing/RoutingService.js';
import { Activity } from '../src/types/index.js';

describe('Maps & Routing Provider Abstraction', () => {
  const haversine = new HaversineProvider();
  const routingService = new RoutingService();

  it('calculates realistic distance between Paris landmarks', () => {
    // Eiffel Tower to Louvre
    const eiffel = { lat: 48.8584, lng: 2.2945 };
    const louvre = { lat: 48.8606, lng: 2.3376 };

    const distanceKm = haversine.calculateDistanceKm(eiffel, louvre);
    // Real straight-line distance is ~3.2km, urban factor brings it to ~4.1km
    expect(distanceKm).toBeGreaterThan(3.0);
    expect(distanceKm).toBeLessThan(5.5);
  });

  it('computes realistic walking vs driving travel times', async () => {
    const p1 = { lat: 48.8584, lng: 2.2945 };
    const p2 = { lat: 48.8606, lng: 2.3376 };

    const walkingRoute = await haversine.calculateRoute(p1, p2, 'walking');
    const drivingRoute = await haversine.calculateRoute(p1, p2, 'driving');

    expect(walkingRoute.durationMinutes).toBeGreaterThan(drivingRoute.durationMinutes);
    expect(walkingRoute.isEstimate).toBe(true);
    expect(walkingRoute.mode).toBe('walking');
  });

  it('optimizes activity order to minimize distance using TSP heuristic', async () => {
    // Create 3 activities out of order geographically
    // Start at A, then C is closer to A, B is furthest
    const actA: Activity = {
      id: '1',
      itinerary_day_id: 'day-1',
      name: 'Start Point',
      description: 'Morning origin',
      category: 'sightseeing',
      start_time: '09:00',
      end_time: '10:00',
      location_name: 'Origin',
      latitude: 48.8584,
      longitude: 2.2945,
      estimated_cost: 0,
      currency: 'USD',
      estimated_duration_minutes: 60,
      verification_status: 'verified',
      display_order: 1,
    };

    const actFar: Activity = {
      id: '2',
      itinerary_day_id: 'day-1',
      name: 'Far Point (Versailles)',
      description: 'Out of town',
      category: 'sightseeing',
      start_time: '10:30',
      end_time: '12:00',
      location_name: 'Versailles',
      latitude: 48.8049,
      longitude: 2.1204,
      estimated_cost: 15,
      currency: 'USD',
      estimated_duration_minutes: 90,
      verification_status: 'verified',
      display_order: 2,
    };

    const actNear: Activity = {
      id: '3',
      itinerary_day_id: 'day-1',
      name: 'Near Point (Champ de Mars)',
      description: 'Right next to origin',
      category: 'nature',
      start_time: '13:00',
      end_time: '14:00',
      location_name: 'Champ de Mars',
      latitude: 48.8566,
      longitude: 2.2982,
      estimated_cost: 0,
      currency: 'USD',
      estimated_duration_minutes: 60,
      verification_status: 'verified',
      display_order: 3,
    };

    const unoptimized = [actA, actFar, actNear];
    const optimized = await haversine.optimizeActivityOrder(unoptimized);

    // Origin should be first, near should be second, far should be last
    expect(optimized[0].id).toBe('1');
    expect(optimized[1].id).toBe('3');
    expect(optimized[2].id).toBe('2');
  });

  it('annotates day activities with inter-stop distance and travel time', async () => {
    const sampleActivities: Activity[] = [
      {
        id: '1',
        itinerary_day_id: 'day-1',
        name: 'Spot 1',
        description: 'First stop',
        category: 'sightseeing',
        start_time: '09:00',
        end_time: '10:30',
        location_name: 'Loc 1',
        latitude: 48.8584,
        longitude: 2.2945,
        estimated_cost: 0,
        currency: 'USD',
        estimated_duration_minutes: 90,
        verification_status: 'verified',
        display_order: 1,
      },
      {
        id: '2',
        itinerary_day_id: 'day-1',
        name: 'Spot 2',
        description: 'Second stop',
        category: 'sightseeing',
        start_time: '11:00',
        end_time: '12:30',
        location_name: 'Loc 2',
        latitude: 48.8606,
        longitude: 2.3376,
        estimated_cost: 20,
        currency: 'USD',
        estimated_duration_minutes: 90,
        verification_status: 'verified',
        display_order: 2,
      },
    ];

    const processed = await routingService.processDayActivities(sampleActivities);
    expect(processed[0].distance_from_previous_km).toBe(0);
    expect(processed[0].travel_time_from_previous_min).toBe(0);

    expect(processed[1].distance_from_previous_km).toBeGreaterThan(0);
    expect(processed[1].travel_time_from_previous_min).toBeGreaterThan(0);
  });
});
