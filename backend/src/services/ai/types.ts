import {
  DestinationDiscoveryRequest,
  DestinationOption,
  Trip,
  ItineraryDay,
  Activity,
} from '../../types/index.js';
import { z } from 'zod';
import { aiItineraryResponseSchema } from '../../schemas/index.js';

export type GeneratedItineraryData = z.infer<typeof aiItineraryResponseSchema>;

export interface IAIProvider {
  readonly name: string;
  recommendDestinations(request: DestinationDiscoveryRequest): Promise<DestinationOption[]>;
  generateItinerary(trip: Trip): Promise<GeneratedItineraryData>;
  regenerateDay(
    trip: Trip,
    day: ItineraryDay,
    feedback: string,
    preserveActivities: Activity[]
  ): Promise<Activity[]>;
}
