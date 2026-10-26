import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { routes } from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  // Basic Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Allow any local dev port
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }
        callback(null, true); // Dev-friendly permissive CORS
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger (in non-test environment)
  if (config.env !== 'test') {
    app.use(requestLogger);
  }

  // API Routes
  app.use(routes);

  // 404 & Global Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
