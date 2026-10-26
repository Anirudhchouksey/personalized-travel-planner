import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { tripRepository } from '../services/db/DatabaseService.js';
import { AppError } from '../middleware/errorHandler.js';
import { TripCreate, TripUpdate } from '../types/index.js';

export const getTrips = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const trips = await tripRepository.getTrips(userId);
    res.json(trips);
  } catch (error) {
    next(error);
  }
};

export const getTripById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const trip = await tripRepository.getTripById(id, userId);

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    res.json(trip);
  } catch (error) {
    next(error);
  }
};

export const createTrip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const tripData: TripCreate = req.body;
    const createdTrip = await tripRepository.createTrip(tripData, userId);

    res.status(201).json(createdTrip);
  } catch (error) {
    next(error);
  }
};

export const updateTrip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates: TripUpdate = req.body;

    const updated = await tripRepository.updateTrip(id, updates, userId);
    if (!updated) {
      throw new AppError('Trip not found or unauthorized to update', 404);
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteTrip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const deleted = await tripRepository.deleteTrip(id, userId);
    if (!deleted) {
      throw new AppError('Trip not found or unauthorized to delete', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
