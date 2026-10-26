import {
  Trip,
  TripCreate,
  TripUpdate,
  Itinerary,
  ItineraryDay,
  Activity,
  ActivityUpdate,
  ShareResponse,
  PublicShareView,
} from '../../types/index.js';

export interface ITripRepository {
  readonly isDemoStore: boolean;
  getTrips(userId: string): Promise<Trip[]>;
  getTripById(tripId: string, userId?: string): Promise<Trip | null>;
  createTrip(trip: TripCreate, userId: string): Promise<Trip>;
  updateTrip(tripId: string, updates: TripUpdate, userId?: string): Promise<Trip | null>;
  deleteTrip(tripId: string, userId?: string): Promise<boolean>;

  getItinerariesByTripId(tripId: string): Promise<Itinerary[]>;
  getItineraryById(itineraryId: string): Promise<Itinerary | null>;
  saveItinerary(itinerary: Itinerary): Promise<Itinerary>;

  updateActivity(itineraryId: string, activityId: string, updates: ActivityUpdate): Promise<Activity | null>;
  deleteActivity(itineraryId: string, activityId: string): Promise<boolean>;
  saveDayActivities(itineraryId: string, dayId: string, activities: Activity[]): Promise<ItineraryDay | null>;

  createShare(tripId: string, ownerId: string, expiresInDays: number): Promise<ShareResponse>;
  getPublicShare(shareToken: string): Promise<PublicShareView | null>;
  revokeShare(shareId: string, ownerId: string): Promise<boolean>;
}
