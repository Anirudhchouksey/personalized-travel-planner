import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authenticate } from '../middleware/auth.js';
import { tripRepository } from '../services/db/DatabaseService.js';

export const historyRoutes = Router();

historyRoutes.use(authenticate);

historyRoutes.get('/api/v1/history', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const trips = await tripRepository.getTrips(userId);
    const historyItems: any[] = [];
    for (const t of trips) {
      historyItems.push({
        id: t.id,
        user_id: userId,
        record_type: 'trip',
        title: t.title,
        destination: t.destination,
        created_at: t.created_at,
        summary: `Trip planned for ${t.destination} (${t.start_date} to ${t.end_date})`,
        details: t,
      });
      const itins = await tripRepository.getItinerariesByTripId(t.id);
      for (const itin of itins) {
        historyItems.push({
          id: itin.id,
          user_id: userId,
          record_type: 'itinerary',
          title: `Itinerary for ${t.title}`,
          destination: t.destination,
          created_at: itin.created_at,
          summary: `Structured ${itin.days?.length || 0}-day schedule (v${itin.version})`,
          details: itin.structured_itinerary,
        });
      }
    }
    historyItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({
      history: historyItems,
      total_count: historyItems.length,
    });
  } catch (error) {
    next(error);
  }
});

historyRoutes.get('/api/v1/history/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const { id } = req.params;
    const trip = await tripRepository.getTripById(id, userId);
    if (trip) {
      return res.json({
        id: trip.id,
        user_id: userId,
        record_type: 'trip',
        title: trip.title,
        destination: trip.destination,
        created_at: trip.created_at,
        summary: `Trip planned for ${trip.destination}`,
        details: trip,
      });
    }
    const itin = await tripRepository.getItineraryById(id);
    if (itin) {
      const parentTrip = await tripRepository.getTripById(itin.trip_id, userId);
      if (parentTrip) {
        return res.json({
          id: itin.id,
          user_id: userId,
          record_type: 'itinerary',
          title: `Itinerary for ${parentTrip.title}`,
          destination: parentTrip.destination,
          created_at: itin.created_at,
          summary: `Structured ${itin.days?.length || 0}-day schedule`,
          details: itin.structured_itinerary,
        });
      }
    }
    res.status(404).json({ error: 'History record not found' });
  } catch (error) {
    next(error);
  }
});
