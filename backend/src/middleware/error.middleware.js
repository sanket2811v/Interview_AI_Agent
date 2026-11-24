import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { db } from '../config/prisma.js';
import { ensureSchemaSynchronized } from '../config/schemaGuard.js';

/**
 * Centralized Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled API Error', {
    name: err.name,
    message: err.message,
    code: err.code,
    meta: err.meta,
    path: req.originalUrl,
    method: req.method
  });

  // Handle malformed JSON request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload',
      timestamp: new Date().toISOString()
    });
  }

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError || err.name === 'ZodError') {
    const issues = err.errors || err.issues || [];
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues.map((e) => ({
        path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
        message: e.message
      })),
      timestamp: new Date().toISOString()
    });
  }

  // Handle Prisma Known Request Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // P2002: Unique constraint failed
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || 'field');
      const isEmail = typeof target === 'string' && target.toLowerCase().includes('email');
      return res.status(409).json({
        success: false,
        message: isEmail
          ? 'An account with this email address already exists.'
          : `A record with this ${target} already exists.`,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2021: Table does not exist in current database
    if (err.code === 'P2021') {
      const tableName = err.meta?.table || 'required table';
      const isDev = process.env.NODE_ENV !== 'production';

      // Automatically trigger schema synchronization in background
      ensureSchemaSynchronized(db).catch((syncErr) => {
        logger.error('Auto schema-sync failed following P2021', { error: syncErr.message });
      });

      return res.status(500).json({
        success: false,
        message: isDev
          ? `Database table ${tableName} does not exist. Initializing schema synchronization. Please retry or run 'npm run prisma:deploy'.`
          : 'Database service configuration error. Please contact system administrator.',
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: err.meta?.cause || 'The requested resource was not found.',
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2022: Column does not exist in current database
    if (err.code === 'P2022') {
      const column = err.meta?.column || 'required column';

      // Automatically trigger schema synchronization in background
      ensureSchemaSynchronized(db).catch((syncErr) => {
        logger.error('Auto schema-sync failed following P2022', { error: syncErr.message });
      });

      return res.status(500).json({
        success: false,
        message: `Database column ${column} does not exist. Synchronizing schema. Please retry or run 'npm run prisma:deploy'.`,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2011: Null constraint violation
    if (err.code === 'P2011') {
      const constraint = err.meta?.constraint || 'field';
      return res.status(400).json({
        success: false,
        message: `Null constraint violation on ${constraint}.`,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2012: Missing required value
    if (err.code === 'P2012') {
      const path = err.meta?.path || 'field';
      return res.status(400).json({
        success: false,
        message: `Missing required database value for ${path}.`,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2000: Value too long
    if (err.code === 'P2000') {
      const column = err.meta?.column_name || 'column';
      return res.status(400).json({
        success: false,
        message: `Provided value is too long for column ${column}.`,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2003: Foreign key constraint failed
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reference to a related record.',
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2028: Transaction API error
    if (err.code === 'P2028') {
      return res.status(500).json({
        success: false,
        message: 'Database transaction could not be completed. Please retry your request.',
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // P2024: Connection timed out
    if (err.code === 'P2024') {
      return res.status(503).json({
        success: false,
        message: 'Database connection pool timed out. Please retry your request.',
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // Extract cleanest descriptive message from Prisma error if cause is not present
    let causeMsg = err.meta?.cause;
    if (!causeMsg && err.message) {
      const cleanLines = err.message
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('Invalid') && !l.startsWith('-->') && !l.startsWith('('));
      if (cleanLines.length > 0) {
        causeMsg = cleanLines[cleanLines.length - 1];
      }
    }

    return res.status(400).json({
      success: false,
      message: causeMsg || (err.code ? `Database operation error (${err.code}). Please verify database status or run 'npm run prisma:deploy'.` : 'Database operation failed'),
      code: err.code,
      meta: err.meta,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Prisma Initialization Errors
  if (err.name === 'PrismaClientInitializationError') {
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please verify PostgreSQL is running.',
      timestamp: new Date().toISOString()
    });
  }

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  return res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

export default errorHandler;

