import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseRepository implements ITripRepository {
  public readonly isDemoStore = false;
  private client: SupabaseClient;

  constructor(supabaseUrl: string, serviceKeyOrAnon: string) {
    this.client = createClient(supabaseUrl, serviceKeyOrAnon, {
      auth: { persistSession: false },
    });
  }

  public async getTrips(userId: string): Promise<Trip[]> {
    const { data, error } = await this.client
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }
    return (data as Trip[]) || [];
  }

  public async getTripById(tripId: string, userId?: string): Promise<Trip | null> {
    let query = this.client.from('trips').select('*').eq('id', tripId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.single();
    if (error || !data) return null;
    return data as Trip;
  }

  public async createTrip(trip: TripCreate, userId: string): Promise<Trip> {
    const id = uuidv4();
    const payload = {
      ...trip,
      id,
      user_id: userId,
      status: trip.status || 'planned',
    };
    const { data, error } = await this.client.from('trips').insert(payload).select().single();
    if (error) {
      throw new Error(`Failed to create trip in Supabase: ${error.message}`);
    }
    return data as Trip;
  }

  public async updateTrip(
    tripId: string,
    updates: TripUpdate,
    userId?: string
  ): Promise<Trip | null> {
    let query = this.client
      .from('trips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tripId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select().single();
    if (error || !data) return null;
    return data as Trip;
  }

  public async deleteTrip(tripId: string, userId?: string): Promise<boolean> {
    let query = this.client.from('trips').delete().eq('id', tripId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;
    return !error;
  }

  public async getItinerariesByTripId(tripId: string): Promise<Itinerary[]> {
    const { data: itins, error: itinError } = await this.client
      .from('itineraries')
      .select('*, days:itinerary_days(*, activities(*))')
      .eq('trip_id', tripId)
      .order('version', { ascending: false });

    if (itinError) {
      throw new Error(`Failed to fetch itineraries: ${itinError.message}`);
    }

    return (itins || []).map((itin: any) => ({
      id: itin.id,
      trip_id: itin.trip_id,
      version: itin.version,
      structured_itinerary: itin.structured_itinerary,
      generation_provider: itin.generation_provider,
      created_at: itin.created_at,
      updated_at: itin.updated_at,
      days: (itin.days || [])
        .sort((a: any, b: any) => a.day_number - b.day_number)
        .map((d: any) => ({
          ...d,
          activities: (d.activities || []).sort(
            (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
          ),
        })),
    }));
  }

  public async getItineraryById(itineraryId: string): Promise<Itinerary | null> {
    const { data, error } = await this.client
      .from('itineraries')
      .select('*, days:itinerary_days(*, activities(*))')
      .eq('id', itineraryId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      trip_id: data.trip_id,
      version: data.version,
      structured_itinerary: data.structured_itinerary,
      generation_provider: data.generation_provider,
      created_at: data.created_at,
      updated_at: data.updated_at,
      days: (data.days || [])
        .sort((a: any, b: any) => a.day_number - b.day_number)
        .map((d: any) => ({
          ...d,
          activities: (d.activities || []).sort(
            (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
          ),
        })),
    };
  }

  public async saveItinerary(itinerary: Itinerary): Promise<Itinerary> {
    const itinId = itinerary.id || uuidv4();

    // 1. Insert/Update itinerary record
    const { error: itinErr } = await this.client.from('itineraries').upsert({
      id: itinId,
      trip_id: itinerary.trip_id,
      version: itinerary.version || 1,
      structured_itinerary: itinerary.structured_itinerary,
      generation_provider: itinerary.generation_provider,
      updated_at: new Date().toISOString(),
    });

    if (itinErr) throw itinErr;

    // 2. Batch upsert days
    if (itinerary.days && itinerary.days.length > 0) {
      const daysToUpsert = itinerary.days.map((day) => ({
        id: day.id || uuidv4(),
        itinerary_id: itinId,
        day_number: day.day_number,
        date: day.date,
        summary: day.summary,
        notes: day.notes,
      }));

      const { error: daysErr } = await this.client
        .from('itinerary_days')
        .upsert(daysToUpsert, { onConflict: 'itinerary_id,day_number' });
      if (daysErr) throw daysErr;

      // 3. Batch upsert activities
      const activitiesToUpsert: any[] = [];
      for (const day of itinerary.days) {
        if (day.activities && day.activities.length > 0) {
          for (const act of day.activities) {
            activitiesToUpsert.push({
              id: act.id || uuidv4(),
              itinerary_day_id: day.id,
              name: act.name,
              description: act.description,
              category: act.category,
              start_time: act.start_time,
              end_time: act.end_time,
              location_name: act.location_name,
              latitude: act.latitude,
              longitude: act.longitude,
              estimated_cost: act.estimated_cost,
              currency: act.currency,
              estimated_duration_minutes: act.estimated_duration_minutes,
              verification_status: act.verification_status,
              display_order: act.display_order,
            });
          }
        }
      }

      if (activitiesToUpsert.length > 0) {
        const { error: actErr } = await this.client
          .from('activities')
          .upsert(activitiesToUpsert, { onConflict: 'id' });
        if (actErr) throw actErr;
      }
    }

    return (await this.getItineraryById(itinId)) || itinerary;
  }

  public async updateActivity(
    itineraryId: string,
    activityId: string,
    updates: ActivityUpdate
  ): Promise<Activity | null> {
    const { data, error } = await this.client
      .from('activities')
      .update(updates)
      .eq('id', activityId)
      .select()
      .single();

    if (error || !data) return null;
    return data as Activity;
  }

  public async deleteActivity(itineraryId: string, activityId: string): Promise<boolean> {
    const { error } = await this.client.from('activities').delete().eq('id', activityId);
    return !error;
  }

  public async saveDayActivities(
    itineraryId: string,
    dayId: string,
    activities: Activity[]
  ): Promise<ItineraryDay | null> {
    // Delete existing activities for this day and insert updated ones
    await this.client.from('activities').delete().eq('itinerary_day_id', dayId);

    const rows = activities.map((act, idx) => ({
      id: act.id && !act.id.startsWith('gen-') ? act.id : uuidv4(),
      itinerary_day_id: dayId,
      name: act.name,
      description: act.description,
      category: act.category,
      start_time: act.start_time,
      end_time: act.end_time,
      location_name: act.location_name,
      latitude: act.latitude,
      longitude: act.longitude,
      estimated_cost: act.estimated_cost,
      currency: act.currency,
      estimated_duration_minutes: act.estimated_duration_minutes,
      verification_status: act.verification_status,
      display_order: idx + 1,
    }));

    const { error } = await this.client.from('activities').insert(rows);
    if (error) {
      throw new Error(`Failed to save day activities: ${error.message}`);
    }

    const { data: dayData } = await this.client
      .from('itinerary_days')
      .select('*, activities(*)')
      .eq('id', dayId)
      .single();

    return dayData as ItineraryDay;
  }

  public async createShare(
    tripId: string,
    ownerId: string,
    expiresInDays: number = 30
  ): Promise<ShareResponse> {
    const id = uuidv4();
    const token = uuidv4().replace(/-/g, '') + uuidv4().substring(0, 8);
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

    const { error } = await this.client.from('shares').insert({
      id,
      trip_id: tripId,
      owner_id: ownerId,
      token_hash: token,
      expires_at: expiresAt,
    });

    if (error) {
      throw new Error(`Failed to create public share: ${error.message}`);
    }

    return {
      id,
      trip_id: tripId,
      share_token: token,
      share_url: `/share/${token}`,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
  }

  public async getPublicShare(shareToken: string): Promise<PublicShareView | null> {
    const { data: share, error } = await this.client
      .from('shares')
      .select('*, trip:trips(*)')
      .eq('token_hash', shareToken)
      .is('revoked_at', null)
      .single();

    if (error || !share || !share.trip) return null;

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return null;
    }

    const itins = await this.getItinerariesByTripId(share.trip_id);

    return {
      trip: share.trip as Trip,
      itinerary: itins[0],
      is_shared_view: true,
    };
  }

  public async revokeShare(shareId: string, ownerId: string): Promise<boolean> {
    const { error } = await this.client
      .from('shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', shareId)
      .eq('owner_id', ownerId);

    return !error;
  }
}
