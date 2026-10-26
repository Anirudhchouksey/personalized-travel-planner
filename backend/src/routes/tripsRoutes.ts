import { Router } from 'express';
import {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
} from '../controllers/tripsController.js';
import {
  generateItinerary,
  getTripItineraries,
} from '../controllers/itinerariesController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { tripCreateSchema, tripUpdateSchema } from '../schemas/index.js';

export const tripsRoutes = Router();

tripsRoutes.use(authenticate);

tripsRoutes.get('/api/v1/trips', getTrips);
tripsRoutes.post('/api/v1/trips', validateBody(tripCreateSchema), createTrip);
tripsRoutes.get('/api/v1/trips/:id', getTripById);
tripsRoutes.put('/api/v1/trips/:id', validateBody(tripUpdateSchema), updateTrip);
tripsRoutes.patch('/api/v1/trips/:id', validateBody(tripUpdateSchema), updateTrip);
tripsRoutes.delete('/api/v1/trips/:id', deleteTrip);

// Trip Itinerary operations
tripsRoutes.post('/api/v1/trips/:tripId/generate', generateItinerary);
tripsRoutes.get('/api/v1/trips/:tripId/itineraries', getTripItineraries);
