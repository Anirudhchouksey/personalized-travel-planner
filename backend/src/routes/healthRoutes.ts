import { Router } from 'express';
import { getHealth, getAiHealth } from '../controllers/healthController.js';

export const healthRoutes = Router();

healthRoutes.get('/health', getHealth);
healthRoutes.get('/api/v1/health', getHealth);
healthRoutes.get('/api/v1/health/ai', getAiHealth);
