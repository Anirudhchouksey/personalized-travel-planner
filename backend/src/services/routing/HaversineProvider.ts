import { Activity } from '../../types/index.js';
import { Coordinates, IMapsRoutingProvider, RouteLeg } from './types.js';

export class HaversineProvider implements IMapsRoutingProvider {
  public readonly name = 'haversine-local';

  /**
   * Calculates the great-circle distance between two coordinates in kilometers
   */
  public calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
    const lat1 = (c1.lat * Math.PI) / 180;
    const lat2 = (c2.lat * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Apply urban detour factor (~1.3x for grid/city street winding)
    return Math.round(distance * 1.3 * 10) / 10;
  }

  public async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<RouteLeg> {
    const distanceKm = this.calculateDistanceKm(origin, destination);
    // Walking ~4.5 km/h, city driving ~25 km/h (including traffic/signals)
    const speedKmh = mode === 'walking' ? 4.5 : 25;
    const durationMinutes = Math.max(5, Math.round((distanceKm / speedKmh) * 60));

    return {
      distanceKm,
      durationMinutes,
      mode,
      isEstimate: true,
      provider: this.name,
    };
  }

  public async calculateDistanceMatrix(locations: Coordinates[]): Promise<number[][]> {
    const matrix: number[][] = [];
    for (let i = 0; i < locations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < locations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = this.calculateDistanceKm(locations[i], locations[j]);
        }
      }
    }
    return matrix;
  }

  /**
   * Optimizes route order using a Greedy Nearest Neighbor TSP heuristic
   * to prevent zigzagging and reduce total travel time.
   */
  public async optimizeActivityOrder(activities: Activity[]): Promise<Activity[]> {
    if (activities.length <= 2) {
      return activities.map((act, idx) => ({ ...act, display_order: idx + 1 }));
    }

    const hasCoords = activities.every((a) => a.latitude != null && a.longitude != null);
    if (!hasCoords) {
      return activities.map((act, idx) => ({ ...act, display_order: idx + 1 }));
    }

    // Preserve the first activity (e.g. morning starting location or hotel departure)
    const unvisited = [...activities];
    const ordered: Activity[] = [unvisited.shift()!];

    while (unvisited.length > 0) {
      const current = ordered[ordered.length - 1];
      const currentCoords: Coordinates = { lat: current.latitude!, lng: current.longitude! };

      let bestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const candidateCoords: Coordinates = { lat: candidate.latitude!, lng: candidate.longitude! };
        const dist = this.calculateDistanceKm(currentCoords, candidateCoords);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        }
      }

      const next = unvisited.splice(bestIndex, 1)[0];
      ordered.push(next);
    }

    return ordered.map((act, idx) => ({
      ...act,
      display_order: idx + 1,
    }));
  }

  public async geocode(locationName: string): Promise<Coordinates | null> {
    // Known landmark reference lookup table for offline/demo deterministic precision
    const knownLandmarks: Record<string, Coordinates> = {
      paris: { lat: 48.8566, lng: 2.3522 },
      'eiffel tower': { lat: 48.8584, lng: 2.2945 },
      louvre: { lat: 48.8606, lng: 2.3376 },
      tokyo: { lat: 35.6762, lng: 139.6503 },
      shibuya: { lat: 35.6595, lng: 139.7004 },
      asakusa: { lat: 35.7148, lng: 139.7967 },
      kyoto: { lat: 35.0116, lng: 135.7681 },
      rome: { lat: 41.9028, lng: 12.4964 },
      colosseum: { lat: 41.8902, lng: 12.4922 },
      barcelona: { lat: 41.3879, lng: 2.1699 },
      sagrada: { lat: 41.4036, lng: 2.1744 },
      london: { lat: 51.5074, lng: -0.1278 },
      'big ben': { lat: 51.5007, lng: -0.1246 },
      'new york': { lat: 40.7128, lng: -74.006 },
      'central park': { lat: 40.785091, lng: -73.968285 },
    };

    const key = locationName.toLowerCase().trim();
    for (const [name, coords] of Object.entries(knownLandmarks)) {
      if (key.includes(name)) {
        return coords;
      }
    }

    return null;
  }
}
