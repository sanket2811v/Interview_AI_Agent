import { jwt, JsonWebTokenError, TokenExpiredError } from '../utils/jwt.js';
import { env } from '../config/env.js';
import db from '../config/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware that verifies access JWT
 * Attaches verified user to req.user
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Missing Bearer access token.',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7).trim();

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh session.',
          timestamp: new Date().toISOString()
        });
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid access token signature.',
        timestamp: new Date().toISOString()
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Malformed token claims. User identifier missing.',
        timestamp: new Date().toISOString()
      });
    }

    // Lookup user in database
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.',
        timestamp: new Date().toISOString()
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Contact support.',
        timestamp: new Date().toISOString()
      });
    }

    // Attach authenticated user (without password hash)
    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Optional authentication middleware:
 * Attaches user to req.user if a valid Bearer token is provided.
 * If no token or invalid/expired token is provided, continues without blocking (req.user = null).
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch {
      req.user = null;
      return next();
    }

    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true
      }
    });

    if (user && user.isActive) {
      const { password, ...safeUser } = user;
      req.user = safeUser;
    } else {
      req.user = null;
    }

    next();
  } catch {
    req.user = null;
    next();
  }
};

/**
 * Middleware to require verified email for sensitive operations
 */
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user || !req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email verification is required to perform this action.',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

export default {
  requireAuth,
  requireVerifiedEmail
};

