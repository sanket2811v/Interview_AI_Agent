import crypto from 'node:crypto';
import { jwt } from './jwt.js';
import { env } from '../config/env.js';

/**
 * Generate a cryptographically secure random token (64 hex characters)
 */
export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a token with SHA-256 before database storage
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Creates access and refresh token pair for a user
 */
export const generateAuthTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    isEmailVerified: user.isEmailVerified
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN
  });

  const rawRefreshToken = generateRandomToken();
  const refreshTokenHash = hashToken(rawRefreshToken);

  // Calculate refresh token expiry (default 7 days)
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    accessToken,
    rawRefreshToken,
    refreshTokenHash,
    refreshExpiresAt
  };
};

export default {
  generateRandomToken,
  hashToken,
  generateAuthTokens
};

