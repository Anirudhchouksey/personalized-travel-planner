import { Router } from 'express';
import { healthRoutes } from './healthRoutes.js';
import { recommendationsRoutes } from './recommendationsRoutes.js';
import { tripsRoutes } from './tripsRoutes.js';
import { itinerariesRoutes } from './itinerariesRoutes.js';
import { sharesRoutes } from './sharesRoutes.js';
import { historyRoutes } from './historyRoutes.js';

export const routes = Router();

routes.use(healthRoutes);
routes.use(recommendationsRoutes);
routes.use(tripsRoutes);
routes.use(itinerariesRoutes);
routes.use(sharesRoutes);
routes.use(historyRoutes);
