import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { db, disconnectPrisma } from './config/prisma.js';
import { ensureSchemaSynchronized } from './config/schemaGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const hasFrontendBuild = fs.existsSync(path.join(frontendDistPath, 'index.html'));

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`===================================================`);
  logger.info(`🚀 InterviewAI Unified Production Server Started`);
  logger.info(`📡 Port: ${PORT}`);
  logger.info(`🌐 Environment: ${env.NODE_ENV}`);
  logger.info(`💻 Single-Port Architecture: ${hasFrontendBuild ? 'Serving React SPA (frontend/dist)' : 'API Mode (Run npm run build for SPA)'}`);
  logger.info(`🔗 Application URL: http://localhost:${PORT}`);
  logger.info(`🔗 API Health: http://localhost:${PORT}/api/health`);
  logger.info(`🗄️ Database Health: http://localhost:${PORT}/api/health/database`);
  logger.info(`🤖 AI Engine: ${env.OPENAI_API_KEY ? 'Configured (' + env.OPENAI_MODEL + ')' : 'Not Configured (Demo Mode)'}`);
  logger.info(`===================================================`);

  // Safe configuration diagnostic (never leaks secrets)
  logger.info('OpenAI configuration status', {
    apiKeyConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrlConfigured: Boolean(env.OPENAI_BASE_URL)
  });

  // Verify and self-heal PostgreSQL schema against pending migrations
  ensureSchemaSynchronized(db).catch((err) => {
    logger.warn('Initial schema synchronization deferred (database may be starting up)', {
      error: err.message
    });
  });
});

// Configure server socket timeouts for long-running generative AI tasks (3 minutes)
server.timeout = 180000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed. Ceasing request processing.');
    try {
      await disconnectPrisma();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }
  });

  // Force shutdown after timeout if hanging connections persist
  setTimeout(() => {
    logger.error('Forceful shutdown triggered after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception occurred:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default server;

