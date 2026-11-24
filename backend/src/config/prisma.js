import { PrismaClient } from '../generated/prisma-client/index.js';
import { logger } from '../utils/logger.js';
import { ensureSchemaSynchronized } from './schemaGuard.js';

// Global singleton instance across module reloads
let prisma;

const getPrismaClient = () => {
  if (!prisma) {
    try {
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
      logger.info('Prisma Client initialized');
    } catch (error) {
      logger.error('Failed to initialize Prisma Client', error.message);
      throw error;
    }
  }
  return prisma;
};

export const db = getPrismaClient();

/**
 * Checks PostgreSQL connectivity by executing a raw probe query.
 * Safe error handling without leaking credentials.
 */
export const checkDatabaseHealth = async () => {
  const startTime = Date.now();
  try {
    // 1. Probe database connectivity using a lightweight query
    await db.$queryRaw`SELECT 1`;

    // 2. Ensure schema is synchronized with all project migrations
    await ensureSchemaSynchronized(db);

    // 3. Probe for presence of required core schema tables
    const tableCheck = await db.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'sessions', 'preparation_sessions', 'practice_sessions')
    `;

    const foundTables = Array.isArray(tableCheck) ? tableCheck.map((t) => t.table_name) : [];
    const hasUsersTable = foundTables.includes('users');
    const hasPracticeSessions = foundTables.includes('practice_sessions');
    const responseTimeMs = Date.now() - startTime;

    if (!hasUsersTable || !hasPracticeSessions) {
      return {
        connected: true,
        tablesMigrated: false,
        foundTables,
        responseTimeMs,
        message: 'PostgreSQL connected, but some core tables (users or practice_sessions) are missing. Run npm run prisma:deploy to apply migrations.'
      };
    }

    return {
      connected: true,
      tablesMigrated: true,
      foundTables,
      responseTimeMs,
      message: 'PostgreSQL connection healthy and schema tables verified'
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logger.error('Database connectivity check failed', {
      code: error.code,
      message: error.message
    });

    let friendlyError = 'Database unavailable';
    if (error.code === 'P1000') {
      friendlyError = 'Database authentication failed';
    } else if (error.code === 'P1001') {
      friendlyError = 'Cannot reach database server';
    } else if (error.code === 'P1003') {
      friendlyError = 'Database does not exist';
    } else if (error.code === 'P1017') {
      friendlyError = 'Database server closed connection';
    }

    return {
      connected: false,
      tablesMigrated: false,
      responseTimeMs,
      error: friendlyError
    };
  }
};

/**
 * Gracefully disconnects Prisma Client on server termination.
 */
export const disconnectPrisma = async () => {
  if (prisma) {
    try {
      await prisma.$disconnect();
      logger.info('Prisma Client disconnected cleanly');
    } catch (err) {
      logger.error('Error during Prisma disconnect', err.message);
    }
  }
};

export default db;

