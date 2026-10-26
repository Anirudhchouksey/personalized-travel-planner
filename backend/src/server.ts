import { app } from './app.js';
import { config } from './config/index.js';
import { aiService } from './services/ai/AIService.js';
import { dbService } from './services/db/DatabaseService.js';
import { routingService } from './services/routing/RoutingService.js';

const server = app.listen(config.port, () => {
  console.log('================================================================');
  console.log(`🚀 WanderAI Backend API listening on port ${config.port}`);
  console.log(`🌐 Environment: ${config.env}`);
  console.log(`🤖 AI Provider: ${aiService.getActiveProviderName()}`);
  console.log(`🗺️ Routing Provider: ${routingService.getProviderName()}`);
  console.log(`💾 Data Store: ${dbService.getBackendType()}`);
  console.log(`🔗 Health Check: http://localhost:${config.port}/health`);
  console.log('================================================================');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default server;
