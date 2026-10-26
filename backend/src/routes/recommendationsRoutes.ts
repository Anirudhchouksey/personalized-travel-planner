import { Router } from 'express';
import {
  getDestinationRecommendations,
  recommendActivities,
  refineRecommendations,
} from '../controllers/recommendationsController.js';
import { validateBody } from '../middleware/validate.js';
import { destinationDiscoverySchema } from '../schemas/index.js';

export const recommendationsRoutes = Router();

recommendationsRoutes.post(
  '/api/v1/recommendations/destinations',
  validateBody(destinationDiscoverySchema),
  getDestinationRecommendations
);

recommendationsRoutes.post(
  '/api/v1/recommendations/activities',
  recommendActivities
);

recommendationsRoutes.post(
  '/api/v1/recommendations/refine',
  refineRecommendations
);
