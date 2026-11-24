import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllSessions
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter
} from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Email Verification
router.post('/verify-email', emailVerificationRateLimiter, verifyEmail);
router.post('/resend-verification', emailVerificationRateLimiter, resendVerification);

// Password Recovery
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);

// Authenticated Endpoints
router.get('/me', requireAuth, getMe);
router.patch('/change-password', requireAuth, changePassword);

// Session Management
router.get('/sessions', requireAuth, getSessions);
router.delete('/sessions/:id', requireAuth, revokeSession);
router.delete('/sessions', requireAuth, revokeAllSessions);

export default router;

