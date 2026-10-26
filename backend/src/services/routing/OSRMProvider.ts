import { Activity } from '../../types/index.js';
import { Coordinates, IMapsRoutingProvider, RouteLeg } from './types.js';
import { HaversineProvider } from './HaversineProvider.js';

export class OSRMProvider implements IMapsRoutingProvider {
  public readonly name = 'openstreetmap-osrm';
  private baseUrl: string;
  private fallbackProvider: HaversineProvider;

  constructor(baseUrl: string = 'https://router.project-osrm.org') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fallbackProvider = new HaversineProvider();
  }

  public async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<RouteLeg> {
    try {
      const profile = mode === 'walking' ? 'foot' : 'driving';
      const url = `${this.baseUrl}/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        headers: { 'User-Agent': 'WanderAI-TravelPlanner-MVP/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OSRM HTTP error: ${response.status}`);
      }

      const data: any = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(5, Math.round(route.duration / 60));

        return {
          distanceKm,
          durationMinutes,
          mode,
          isEstimate: false,
          provider: this.name,
        };
      }
    } catch (err) {
      // Graceful fallback to Haversine if external OSRM API is rate-limited or unreachable
    }

    return this.fallbackProvider.calculateRoute(origin, destination, mode);
  }

  public async calculateDistanceMatrix(locations: Coordinates[]): Promise<number[][]> {
    return this.fallbackProvider.calculateDistanceMatrix(locations);
  }

  public async optimizeActivityOrder(activities: Activity[]): Promise<Activity[]> {
    return this.fallbackProvider.optimizeActivityOrder(activities);
  }

  public async geocode(locationName: string): Promise<Coordinates | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        locationName
      )}&format=json&limit=1`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        headers: { 'User-Agent': 'WanderAI-TravelPlanner/1.0 (contact: info@wanderai.demo)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data: any = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      }
    } catch {
      // Fallback
    }

    return this.fallbackProvider.geocode(locationName);
  }
}
