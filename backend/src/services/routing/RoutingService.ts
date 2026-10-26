import { Activity, ItineraryDay } from '../../types/index.js';
import { Coordinates, IMapsRoutingProvider, RouteLeg } from './types.js';
import { HaversineProvider } from './HaversineProvider.js';
import { OSRMProvider } from './OSRMProvider.js';
import { config } from '../../config/index.js';

export class RoutingService {
  private provider: IMapsRoutingProvider;

  constructor() {
    if (config.routing.provider === 'osrm') {
      this.provider = new OSRMProvider(config.routing.osrmUrl);
    } else {
      this.provider = new HaversineProvider();
    }
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async calculateLeg(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<RouteLeg> {
    return this.provider.calculateRoute(origin, destination, mode);
  }

  /**
   * Annotates an array of activities for a single day:
   * 1. Re-orders activities to minimize travel distance (TSP optimization)
   * 2. Calculates distance and travel time from previous activity
   */
  public async processDayActivities(
    activities: Activity[],
    transportMode: 'driving' | 'walking' = 'driving'
  ): Promise<Activity[]> {
    if (!activities || activities.length === 0) {
      return [];
    }

    // 1. Optimize ordering
    const sorted = await this.provider.optimizeActivityOrder(activities);

    // 2. Compute inter-activity transit metrics
    const annotated: Activity[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const current = { ...sorted[i], display_order: i + 1 };

      if (i === 0) {
        current.distance_from_previous_km = 0;
        current.travel_time_from_previous_min = 0;
      } else {
        const prev = sorted[i - 1];
        if (
          prev.latitude != null &&
          prev.longitude != null &&
          current.latitude != null &&
          current.longitude != null
        ) {
          const leg = await this.provider.calculateRoute(
            { lat: prev.latitude, lng: prev.longitude },
            { lat: current.latitude, lng: current.longitude },
            transportMode
          );
          current.distance_from_previous_km = leg.distanceKm;
          current.travel_time_from_previous_min = leg.durationMinutes;
        } else {
          // Missing coordinates: label estimates conservatively
          current.distance_from_previous_km = 2.5;
          current.travel_time_from_previous_min = 15;
        }
      }
      annotated.push(current);
    }

    return annotated;
  }

  /**
   * Processes all days in an itinerary
   */
  public async enrichDaysWithRouting(days: ItineraryDay[]): Promise<ItineraryDay[]> {
    const enrichedDays: ItineraryDay[] = [];
    for (const day of days) {
      const enrichedActivities = await this.processDayActivities(day.activities);
      enrichedDays.push({
        ...day,
        activities: enrichedActivities,
      });
    }
    return enrichedDays;
  }
}

export const routingService = new RoutingService();
