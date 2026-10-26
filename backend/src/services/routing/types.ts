import { Activity } from '../../types/index.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteLeg {
  distanceKm: number;
  durationMinutes: number;
  mode: 'driving' | 'walking' | 'transit';
  isEstimate: boolean;
  provider: string;
}

export interface IMapsRoutingProvider {
  readonly name: string;
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode?: 'driving' | 'walking'
  ): Promise<RouteLeg>;
  calculateDistanceMatrix(locations: Coordinates[]): Promise<number[][]>;
  optimizeActivityOrder(activities: Activity[]): Promise<Activity[]>;
  geocode(locationName: string): Promise<Coordinates | null>;
}
