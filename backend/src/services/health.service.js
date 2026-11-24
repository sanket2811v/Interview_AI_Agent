import { checkDatabaseHealth } from '../config/prisma.js';
import { env } from '../config/env.js';

/**
 * Service for system and database health checks
 */
export const getSystemHealth = () => {
  return {
    success: true,
    message: 'InterviewAI API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
};

export const getDatabaseHealthStatus = async () => {
  const result = await checkDatabaseHealth();
  if (result.connected && result.tablesMigrated) {
    return {
      status: 200,
      data: {
        success: true,
        message: 'PostgreSQL database is connected and schema tables are verified',
        database: 'connected',
        tablesVerified: true,
        responseTimeMs: result.responseTimeMs,
        timestamp: new Date().toISOString()
      }
    };
  }

  if (result.connected && !result.tablesMigrated) {
    return {
      status: 503,
      data: {
        success: false,
        message: result.message,
        database: 'migrations_pending',
        tablesVerified: false,
        actionRequired: "Execute 'npm run prisma:deploy' to apply pending database migrations",
        responseTimeMs: result.responseTimeMs,
        timestamp: new Date().toISOString()
      }
    };
  }

  return {
    status: 503,
    data: {
      success: false,
      message: 'Database connection failed',
      database: 'disconnected',
      error: result.error,
      responseTimeMs: result.responseTimeMs,
      timestamp: new Date().toISOString()
    }
  };
};

