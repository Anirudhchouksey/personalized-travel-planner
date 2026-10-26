import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { tripRepository } from '../services/db/DatabaseService.js';
import { aiService } from '../services/ai/AIService.js';
import { routingService } from '../services/routing/RoutingService.js';
import { exportService } from '../services/export/ExportService.js';
import { AppError } from '../middleware/errorHandler.js';
import { Itinerary, ItineraryDay, ActivityUpdate } from '../types/index.js';

export const generateItinerary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tripId = req.params.tripId || req.body.trip_id;
    if (!tripId) {
      throw new AppError('Field trip_id is required', 400);
    }
    const userId = req.user?.id;
    const trip = await tripRepository.getTripById(tripId, userId);

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    // 1. Generate structured itinerary via AI Service
    const aiData = await aiService.generateItinerary(trip);

    // 2. Format days and activities with UUIDs
    const itinId = uuidv4();
    const formattedDays: ItineraryDay[] = aiData.days.map((dayData, dIdx) => {
      const dayId = uuidv4();
      return {
        id: dayId,
        itinerary_id: itinId,
        day_number: dayData.day_number,
        date: dayData.date,
        summary: dayData.summary,
        notes: dayData.notes,
        activities: dayData.activities.map((act, aIdx) => ({
          id: uuidv4(),
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
          currency: act.currency || trip.currency,
          estimated_duration_minutes: act.estimated_duration_minutes,
          verification_status: act.verification_status,
          display_order: aIdx + 1,
        })),
      };
    });

    // 3. Enrich days with Routing calculations & order optimization
    const enrichedDays = await routingService.enrichDaysWithRouting(formattedDays);

    // 4. Save to repository
    const existingItins = await tripRepository.getItinerariesByTripId(tripId);
    const nextVersion = existingItins.length > 0 ? existingItins[0].version + 1 : 1;

    const fullItinerary: Itinerary = {
      id: itinId,
      trip_id: tripId,
      version: nextVersion,
      structured_itinerary: {
        trip_title: aiData.trip_title,
        destination: aiData.destination,
        overall_summary: aiData.overall_summary,
        total_estimated_cost: aiData.total_estimated_cost,
        currency: aiData.currency,
        estimated_budget_breakdown: aiData.estimated_budget_breakdown,
        practical_tips: aiData.practical_tips,
      },
      generation_provider: aiService.getActiveProviderName(),
      days: enrichedDays,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await tripRepository.saveItinerary(fullItinerary);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

export const getTripItineraries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = req.params;
    const itins = await tripRepository.getItinerariesByTripId(tripId);
    res.json(itins);
  } catch (error) {
    next(error);
  }
};

export const getItineraryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const itin = await tripRepository.getItineraryById(id);

    if (!itin) {
      throw new AppError('Itinerary not found', 404);
    }

    res.json(itin);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, activityId } = req.params;
    const updates: ActivityUpdate = req.body;

    const updated = await tripRepository.updateActivity(id, activityId, updates);
    if (!updated) {
      throw new AppError('Activity not found', 404);
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, activityId } = req.params;
    const deleted = await tripRepository.deleteActivity(id, activityId);

    if (!deleted) {
      throw new AppError('Activity not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const regenerateDay = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, dayId } = req.params;
    const { feedback, preserve_activity_ids = [] } = req.body;

    const itin = await tripRepository.getItineraryById(id);
    if (!itin) {
      throw new AppError('Itinerary not found', 404);
    }

    const trip = await tripRepository.getTripById(itin.trip_id);
    if (!trip) {
      throw new AppError('Associated trip not found', 404);
    }

    const targetDay = itin.days.find((d) => d.id === dayId);
    if (!targetDay) {
      throw new AppError('Itinerary day not found', 404);
    }

    const preserved = targetDay.activities.filter((a) => preserve_activity_ids.includes(a.id));

    // 1. Regenerate activities using AI Service
    const regeneratedRaw = await aiService.regenerateDay(trip, targetDay, feedback, preserved);

    // 2. Enrich with routing calculations
    const enrichedActivities = await routingService.processDayActivities(regeneratedRaw);

    // 3. Save to repository
    const updatedDay = await tripRepository.saveDayActivities(id, dayId, enrichedActivities);
    if (!updatedDay) {
      throw new AppError('Failed to save regenerated day', 500);
    }

    res.json(updatedDay);
  } catch (error) {
    next(error);
  }
};

export const exportItinerary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || req.body.format || 'pdf';

    const itin = await tripRepository.getItineraryById(id);
    if (!itin) {
      throw new AppError('Itinerary not found', 404);
    }

    const trip = await tripRepository.getTripById(itin.trip_id);
    if (!trip) {
      throw new AppError('Associated trip not found', 404);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${trip.destination}-itinerary.json"`);
      return res.json({ trip, itinerary: itin });
    }

    if (format === 'markdown' || format === 'md') {
      const md = exportService.generateMarkdown(trip, itin);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${trip.destination}-itinerary.md"`);
      return res.send(md);
    }

    if (format === 'ics') {
      const ics = exportService.generateIcs(trip, itin);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${trip.destination}-itinerary.ics"`);
      return res.send(ics);
    }

    // Default: Printable HTML formatted for PDF download / browser print
    const html = exportService.generatePrintableHtml(trip, itin);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${trip.destination}-itinerary.html"`);
    return res.send(html);
  } catch (error) {
    next(error);
  }
};

export const updateItinerary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    let itin = await tripRepository.getItineraryById(id);
    if (!itin) {
      const itins = await tripRepository.getItinerariesByTripId(id);
      if (itins.length > 0) itin = itins[0];
    }
    if (!itin) {
      throw new AppError('Itinerary not found', 404);
    }
    const trip = await tripRepository.getTripById(itin.trip_id, userId);
    if (!trip) {
      throw new AppError('Access denied', 403);
    }
    const updated = await tripRepository.saveItinerary({
      ...itin,
      structured_itinerary: req.body.structured_itinerary || itin.structured_itinerary,
      updated_at: new Date().toISOString(),
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
