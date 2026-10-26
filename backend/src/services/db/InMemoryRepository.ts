import { v4 as uuidv4 } from 'uuid';
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
import { ITripRepository } from './types.js';

export class InMemoryRepository implements ITripRepository {
  public readonly isDemoStore = true;

  private trips: Map<string, Trip> = new Map();
  private itineraries: Map<string, Itinerary> = new Map();
  private shares: Map<string, { tripId: string; ownerId: string; expiresAt?: string; revoked: boolean }> =
    new Map();

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const sampleTripId = '11111111-1111-1111-1111-111111111111';
    const sampleItinId = '22222222-2222-2222-2222-222222222222';
    const sampleDay1Id = '33333333-3333-3333-3333-333333333331';
    const sampleDay2Id = '33333333-3333-3333-3333-333333333332';

    const seedTrip: Trip = {
      id: sampleTripId,
      user_id: demoUserId,
      title: 'Kyoto Cultural Autumn Odyssey',
      origin: 'San Francisco (SFO)',
      destination: 'Kyoto, Japan',
      start_date: '2026-11-10',
      end_date: '2026-11-15',
      traveler_count: 2,
      budget_amount: 3200,
      currency: 'USD',
      travel_preferences: {
        travel_vibe: 'cultural',
        travel_pace: 'moderate',
        travel_style: 'standard',
        interests: ['Historic Temples', 'Tea Ceremonies', 'Zen Gardens', 'Local Gastronomy'],
        preferred_transportation: ['Walking', 'Public Transit'],
        dietary_requirements: ['Pescatarian friendly'],
        accessibility_requirements: [],
        notes: 'Interested in early morning visits to avoid crowds at Fushimi Inari.',
      },
      status: 'planned',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const day1Activities: Activity[] = [
      {
        id: 'act-101',
        itinerary_day_id: sampleDay1Id,
        name: 'Fushimi Inari Taisha Thousand Torii Walk',
        description: 'Iconic mountainside path lined with thousands of vibrant vermilion Shinto shrine gates.',
        category: 'cultural',
        start_time: '07:30',
        end_time: '10:00',
        location_name: 'Fushimi Inari Shrine, Kyoto',
        latitude: 34.9671,
        longitude: 135.7727,
        estimated_cost: 0,
        currency: 'USD',
        estimated_duration_minutes: 150,
        verification_status: 'verified',
        display_order: 1,
        distance_from_previous_km: 0,
        travel_time_from_previous_min: 0,
      },
      {
        id: 'act-102',
        itinerary_day_id: sampleDay1Id,
        name: 'Tofuku-ji Hojo Garden & Maple Valley',
        description: 'Historic Zen temple renowned for checkerboard moss rock gardens and Tsutenkyo Bridge views.',
        category: 'nature',
        start_time: '10:45',
        end_time: '12:30',
        location_name: 'Higashiyama Ward, Kyoto',
        latitude: 34.9813,
        longitude: 135.7744,
        estimated_cost: 10,
        currency: 'USD',
        estimated_duration_minutes: 105,
        verification_status: 'verified',
        display_order: 2,
        distance_from_previous_km: 1.8,
        travel_time_from_previous_min: 15,
      },
      {
        id: 'act-103',
        itinerary_day_id: sampleDay1Id,
        name: 'Traditional Soba Noodles in Gion',
        description: 'Buckwheat soba with dipping broth in an authentic 90-year-old machiya townhouse.',
        category: 'dining',
        start_time: '13:00',
        end_time: '14:15',
        location_name: 'Gion Quarter',
        latitude: 35.0037,
        longitude: 135.7778,
        estimated_cost: 18,
        currency: 'USD',
        estimated_duration_minutes: 75,
        verification_status: 'estimated',
        display_order: 3,
        distance_from_previous_km: 2.6,
        travel_time_from_previous_min: 20,
      },
      {
        id: 'act-104',
        itinerary_day_id: sampleDay1Id,
        name: 'Kiyomizu-dera Wooden Stage at Sunset',
        description: 'Panoramic views over Kyoto city framed by Japanese maple foliage.',
        category: 'sightseeing',
        start_time: '15:30',
        end_time: '17:30',
        location_name: 'Kiyomizu, Higashiyama Ward',
        latitude: 34.9949,
        longitude: 135.785,
        estimated_cost: 4,
        currency: 'USD',
        estimated_duration_minutes: 120,
        verification_status: 'verified',
        display_order: 4,
        distance_from_previous_km: 1.4,
        travel_time_from_previous_min: 18,
      },
    ];

    const day2Activities: Activity[] = [
      {
        id: 'act-201',
        itinerary_day_id: sampleDay2Id,
        name: 'Arashiyama Bamboo Grove Morning Stroll',
        description: 'Towering green stalks rustling in the wind with peaceful morning light before tourist arrivals.',
        category: 'nature',
        start_time: '08:00',
        end_time: '09:45',
        location_name: 'Arashiyama, Ukyo Ward',
        latitude: 35.017,
        longitude: 135.6713,
        estimated_cost: 0,
        currency: 'USD',
        estimated_duration_minutes: 105,
        verification_status: 'verified',
        display_order: 1,
        distance_from_previous_km: 0,
        travel_time_from_previous_min: 0,
      },
      {
        id: 'act-202',
        itinerary_day_id: sampleDay2Id,
        name: 'Tenryu-ji Sogenchi Landscape Pond Garden',
        description: '14th-century pond garden that incorporates the Arashiyama mountains into its design.',
        category: 'cultural',
        start_time: '10:00',
        end_time: '11:45',
        location_name: 'Tenryuji Temple',
        latitude: 35.0158,
        longitude: 135.6775,
        estimated_cost: 6,
        currency: 'USD',
        estimated_duration_minutes: 105,
        verification_status: 'verified',
        display_order: 2,
        distance_from_previous_km: 0.6,
        travel_time_from_previous_min: 8,
      },
    ];

    const seedItinerary: Itinerary = {
      id: sampleItinId,
      trip_id: sampleTripId,
      version: 1,
      generation_provider: 'mock-demo-ai',
      structured_itinerary: {
        trip_title: 'Kyoto Cultural Autumn Odyssey',
        destination: 'Kyoto, Japan',
        overall_summary:
          'A refined, evidence-conscious 6-day cultural journey balancing imperial sanctuaries, Zen contemplative gardens, and world-renowned Kyoto gastronomy.',
        total_estimated_cost: 2150,
        currency: 'USD',
        estimated_budget_breakdown: {
          accommodation: 1100,
          activities: 280,
          food_and_dining: 550,
          local_transit: 120,
          buffer: 100,
          currency: 'USD',
        },
        practical_tips: [
          'Purchase an ICOCA IC card at Kyoto Station for seamless bus and metro tapping.',
          'Dress in easily removable shoes as temples require bare or stocking feet inside halls.',
          'Early mornings (before 08:30) are essential for uncrowded bamboo groves and shrine photography.',
        ],
      },
      days: [
        {
          id: sampleDay1Id,
          itinerary_id: sampleItinId,
          day_number: 1,
          date: '2026-11-10',
          summary: 'Higashiyama heritage, Fushimi Inari Torii gates, and twilight at Kiyomizu-dera.',
          notes: 'Wear supportive walking shoes for the incline stairs.',
          activities: day1Activities,
        },
        {
          id: sampleDay2Id,
          itinerary_id: sampleItinId,
          day_number: 2,
          date: '2026-11-11',
          summary: 'Western Kyoto, bamboo forest sanctuary, and historic Tenryu-ji Zen ponds.',
          notes: 'Catch the Keifuku Electric Railroad tram for a scenic ride.',
          activities: day2Activities,
        },
      ],
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.trips.set(sampleTripId, seedTrip);
    this.itineraries.set(sampleItinId, seedItinerary);
  }

  public async getTrips(userId: string): Promise<Trip[]> {
    return Array.from(this.trips.values())
      .filter((t) => t.user_id === userId || userId.startsWith('00000000'))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getTripById(tripId: string, userId?: string): Promise<Trip | null> {
    const trip = this.trips.get(tripId);
    if (!trip) return null;
    if (userId && !userId.startsWith('00000000') && trip.user_id !== userId) {
      return null;
    }
    return trip;
  }

  public async createTrip(trip: TripCreate, userId: string): Promise<Trip> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newTrip: Trip = {
      ...trip,
      id,
      user_id: userId,
      status: (trip.status as any) || 'planned',
      created_at: now,
      updated_at: now,
    };
    this.trips.set(id, newTrip);
    return newTrip;
  }

  public async updateTrip(
    tripId: string,
    updates: TripUpdate,
    userId?: string
  ): Promise<Trip | null> {
    const trip = await this.getTripById(tripId, userId);
    if (!trip) return null;

    const updated: Trip = {
      ...trip,
      ...updates,
      status: (updates.status || trip.status) as 'draft' | 'planned' | 'ongoing' | 'completed' | 'archived',
      travel_preferences: {
        ...trip.travel_preferences,
        ...(updates.travel_preferences || {}),
      },
      updated_at: new Date().toISOString(),
    };
    this.trips.set(tripId, updated);
    return updated;
  }

  public async deleteTrip(tripId: string, userId?: string): Promise<boolean> {
    const trip = await this.getTripById(tripId, userId);
    if (!trip) return false;

    this.trips.delete(tripId);
    // Delete associated itineraries
    for (const [itinId, itin] of this.itineraries.entries()) {
      if (itin.trip_id === tripId) {
        this.itineraries.delete(itinId);
      }
    }
    return true;
  }

  public async getItinerariesByTripId(tripId: string): Promise<Itinerary[]> {
    return Array.from(this.itineraries.values())
      .filter((itin) => itin.trip_id === tripId)
      .sort((a, b) => b.version - a.version);
  }

  public async getItineraryById(itineraryId: string): Promise<Itinerary | null> {
    return this.itineraries.get(itineraryId) || null;
  }

  public async saveItinerary(itinerary: Itinerary): Promise<Itinerary> {
    const id = itinerary.id || uuidv4();
    const saved: Itinerary = {
      ...itinerary,
      id,
      updated_at: new Date().toISOString(),
    };
    this.itineraries.set(id, saved);
    return saved;
  }

  public async updateActivity(
    itineraryId: string,
    activityId: string,
    updates: ActivityUpdate
  ): Promise<Activity | null> {
    const itin = this.itineraries.get(itineraryId);
    if (!itin) return null;

    for (const day of itin.days) {
      const actIndex = day.activities.findIndex((a) => a.id === activityId);
      if (actIndex !== -1) {
        const updatedAct: Activity = {
          ...day.activities[actIndex],
          ...updates,
        };
        day.activities[actIndex] = updatedAct;
        itin.updated_at = new Date().toISOString();
        return updatedAct;
      }
    }
    return null;
  }

  public async deleteActivity(itineraryId: string, activityId: string): Promise<boolean> {
    const itin = this.itineraries.get(itineraryId);
    if (!itin) return false;

    for (const day of itin.days) {
      const actIndex = day.activities.findIndex((a) => a.id === activityId);
      if (actIndex !== -1) {
        day.activities.splice(actIndex, 1);
        // re-index display orders
        day.activities.forEach((a, idx) => {
          a.display_order = idx + 1;
        });
        itin.updated_at = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  public async saveDayActivities(
    itineraryId: string,
    dayId: string,
    activities: Activity[]
  ): Promise<ItineraryDay | null> {
    const itin = this.itineraries.get(itineraryId);
    if (!itin) return null;

    const day = itin.days.find((d) => d.id === dayId);
    if (!day) return null;

    day.activities = activities.map((act, idx) => ({
      ...act,
      itinerary_day_id: dayId,
      display_order: idx + 1,
    }));
    itin.updated_at = new Date().toISOString();
    return day;
  }

  public async createShare(
    tripId: string,
    ownerId: string,
    expiresInDays: number = 30
  ): Promise<ShareResponse> {
    const token = uuidv4().replace(/-/g, '') + uuidv4().substring(0, 8);
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

    this.shares.set(token, {
      tripId,
      ownerId,
      expiresAt,
      revoked: false,
    });

    const shareUrl = `/share/${token}`;
    return {
      id: uuidv4(),
      trip_id: tripId,
      share_token: token,
      share_url: shareUrl,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
  }

  public async getPublicShare(shareToken: string): Promise<PublicShareView | null> {
    const record = this.shares.get(shareToken);
    if (!record || record.revoked) return null;

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return null;
    }

    const trip = this.trips.get(record.tripId);
    if (!trip) return null;

    const itins = await this.getItinerariesByTripId(record.tripId);
    return {
      trip,
      itinerary: itins[0],
      is_shared_view: true,
    };
  }

  public async revokeShare(shareId: string, ownerId: string): Promise<boolean> {
    for (const [token, share] of this.shares.entries()) {
      if (token === shareId && (share.ownerId === ownerId || ownerId.startsWith('00000000'))) {
        share.revoked = true;
        return true;
      }
    }
    return false;
  }
}
