import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { tripRepository } from '../services/db/DatabaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export const createShare = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { trip_id, expires_in_days = 30 } = req.body;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const trip = await tripRepository.getTripById(trip_id, userId);
    if (!trip) {
      throw new AppError('Trip not found or unauthorized to share', 404);
    }

    const share = await tripRepository.createShare(trip_id, userId, expires_in_days);
    res.status(201).json(share);
  } catch (error) {
    next(error);
  }
};

export const getPublicShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const publicView = await tripRepository.getPublicShare(token);

    if (!publicView) {
      throw new AppError('Shared itinerary not found or expired', 404);
    }

    res.json(publicView);
  } catch (error) {
    next(error);
  }
};

export const revokeShare = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const success = await tripRepository.revokeShare(id, userId);
    if (!success) {
      throw new AppError('Share not found or unauthorized to revoke', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
