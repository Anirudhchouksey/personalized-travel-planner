import { Router } from 'express';
import {
  createShare,
  getPublicShare,
  revokeShare,
} from '../controllers/sharesController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { shareCreateSchema } from '../schemas/index.js';

export const sharesRoutes = Router();

// Public share view endpoint (no auth required)
sharesRoutes.get('/api/v1/shares/:token', getPublicShare);

// Authenticated share management
sharesRoutes.post('/api/v1/shares', authenticate, validateBody(shareCreateSchema), createShare);
sharesRoutes.delete('/api/v1/shares/:id', authenticate, revokeShare);
