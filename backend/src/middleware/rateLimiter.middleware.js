/**
 * In-memory sliding window rate limiter middleware.
 * Zero external dependencies, thread-safe for Node.js event loop.
 */
export class MemoryRateLimiter {
  constructor({ windowMs = 15 * 60 * 1000, max = 5, message = 'Too many requests, please try again later.' }) {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    this.hits = new Map();

    // Periodically sweep expired entries every 5 minutes to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter((t) => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, valid);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  middleware() {
    return (req, res, next) => {
      // In test mode, bypass rate limits for deterministic tests
      if (process.env.NODE_ENV === 'test') {
        return next();
      }

      const ip = req.ip || req.connection.remoteAddress || 'unknown-client';
      const now = Date.now();
      const timestamps = this.hits.get(ip) || [];

      // Filter timestamps within current window
      const recent = timestamps.filter((t) => now - t < this.windowMs);

      if (recent.length >= this.max) {
        const oldest = recent[0];
        const retryAfterSec = Math.ceil((this.windowMs - (now - oldest)) / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          success: false,
          message: this.message,
          retryAfter: retryAfterSec,
          timestamp: new Date().toISOString()
        });
      }

      recent.push(now);
      this.hits.set(ip, recent);
      next();
    };
  }
}

export const loginRateLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again after 15 minutes.'
}).middleware();

export const registerRateLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts from this address. Please try again later.'
}).middleware();

export const passwordResetRateLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please check your inbox or wait 15 minutes.'
}).middleware();

export const emailVerificationRateLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts. Please try again later.'
}).middleware();

export default {
  MemoryRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter
};

