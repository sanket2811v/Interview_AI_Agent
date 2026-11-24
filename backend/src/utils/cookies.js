import { env } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'interviewai_refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Lightweight cookie parsing middleware compatible with Express
 */
export const cookieParser = (req, res, next) => {
  const header = req.headers.cookie;
  req.cookies = {};

  if (header) {
    const pairs = header.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const key = pair.substring(0, idx).trim();
        const val = pair.substring(idx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch {
          req.cookies[key] = val;
        }
      }
    }
  }

  next();
};

/**
 * Sets secure HttpOnly cookie for refresh token
 */
export const setRefreshTokenCookie = (res, refreshToken) => {
  const isHttps = Boolean(res.req && (res.req.secure || res.req.headers?.['x-forwarded-proto'] === 'https'));
  const secure = env.COOKIE_SECURE || isHttps;

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: env.COOKIE_SAME_SITE || 'lax',
    path: '/api/auth',
    maxAge: SEVEN_DAYS_MS
  });
};

/**
 * Clears the refresh token cookie
 */
export const clearRefreshTokenCookie = (res) => {
  const isHttps = Boolean(res.req && (res.req.secure || res.req.headers?.['x-forwarded-proto'] === 'https'));
  const secure = env.COOKIE_SECURE || isHttps;

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: env.COOKIE_SAME_SITE || 'lax',
    path: '/api/auth'
  });
};

export { REFRESH_COOKIE_NAME };

