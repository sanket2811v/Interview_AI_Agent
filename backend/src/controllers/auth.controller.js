import db from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAuthTokens, generateRandomToken, hashToken } from '../utils/tokens.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../utils/cookies.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} from '../validators/auth.validator.js';

export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user, profile, and verification token in database transaction
    const rawVerificationToken = generateRandomToken();
    const tokenHash = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_HOURS * 3600 * 1000);

    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          isEmailVerified: false,
          isActive: true
        }
      });

      const newProfile = await tx.userProfile.create({
        data: {
          userId: newUser.id,
          fullName: validatedData.name,
          skills: []
        }
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt: verificationExpiresAt
        }
      });

      return { user: newUser, profile: newProfile };
    });

    // Attempt to dispatch verification email in background (non-blocking)
    try {
      await sendVerificationEmail({
        user: result.user,
        token: rawVerificationToken
      });
    } catch (emailErr) {
      logger.warn('Verification email delivery issue:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          isEmailVerified: result.user.isEmailVerified,
          createdAt: result.user.createdAt
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const issues = err.errors || err.issues || [];
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e) => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), message: e.message })),
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await db.user.findUnique({
      where: { email: validatedData.email },
      include: { profile: true }
    });

    // Generic error message to prevent account enumeration
    const invalidCredentialsResponse = () =>
      res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
        timestamp: new Date().toISOString()
      });

    if (!user) {
      return invalidCredentialsResponse();
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
        timestamp: new Date().toISOString()
      });
    }

    const isMatch = await comparePassword(validatedData.password, user.password);
    if (!isMatch) {
      return invalidCredentialsResponse();
    }

    // Generate JWT access token & cryptographically random refresh token
    const { accessToken, rawRefreshToken, refreshTokenHash, refreshExpiresAt } = generateAuthTokens(user);

    // Save refresh session in database
    const userAgent = req.headers['user-agent'] || 'Unknown client';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';

    await db.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt: refreshExpiresAt
      }
    });

    // Set secure HttpOnly cookie
    setRefreshTokenCookie(res, rawRefreshToken);

    const { password, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        user: safeUser
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const issues = err.errors || err.issues || [];
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e) => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), message: e.message })),
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token cookie missing.',
        timestamp: new Date().toISOString()
      });
    }

    const tokenHash = hashToken(rawRefreshToken);

    // Find session in database
    const session = await db.session.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: { user: { include: { profile: true } } }
    });

    if (!session) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid session or token unrecognized.',
        timestamp: new Date().toISOString()
      });
    }

    // Reuse detection: If session was revoked, revoke ALL sessions for that user for security!
    if (session.revokedAt) {
      logger.warn(`Potential token reuse detected for user ${session.userId}. Revoking all sessions.`);
      await db.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Session has been revoked due to security alert. Please log in again.',
        timestamp: new Date().toISOString()
      });
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      await db.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        timestamp: new Date().toISOString()
      });
    }

    if (!session.user.isActive) {
      clearRefreshTokenCookie(res);
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
        timestamp: new Date().toISOString()
      });
    }

    // Rotate refresh token
    const newRawRefreshToken = generateRandomToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update current session with new rotated hash
    await db.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newRefreshExpiresAt,
        updatedAt: new Date()
      }
    });

    // Issue new access JWT
    const { accessToken } = generateAuthTokens(session.user);

    // Set updated HttpOnly cookie
    setRefreshTokenCookie(res, newRawRefreshToken);

    const { password, ...safeUser } = session.user;

    return res.status(200).json({
      success: true,
      message: 'Session refreshed successfully.',
      data: {
        accessToken,
        user: safeUser
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await db.session.updateMany({
        where: { refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user
    },
    timestamp: new Date().toISOString()
  });
};

export const verifyEmail = async (req, res, next) => {
  try {
    const validatedData = verifyEmailSchema.parse(req.body);
    const tokenHash = hashToken(validatedData.token);

    const record = await db.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email verification link.',
        timestamp: new Date().toISOString()
      });
    }

    await db.$transaction([
      db.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      db.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Email address has been successfully verified! You can now access all platform features.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const validatedData = resendVerificationSchema.parse(req.body);

    const user = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    // Generic response to avoid revealing user existence
    const successMsg = 'If your email is registered and unverified, a verification link has been sent.';

    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: successMsg,
        timestamp: new Date().toISOString()
      });
    }

    // Invalidate old pending tokens
    await db.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_HOURS * 3600 * 1000);

    await db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    try {
      await sendVerificationEmail({ user, token: rawToken });
    } catch (e) {
      logger.warn('Error resending email:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: successMsg,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);

    const user = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    // Always return identical generic message for security
    const genericResponse = () =>
      res.status(200).json({
        success: true,
        message: 'If an account exists for this email, password reset instructions will be sent.',
        timestamp: new Date().toISOString()
      });

    if (!user || !user.isActive) {
      return genericResponse();
    }

    // Invalidate previous reset tokens
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    try {
      await sendPasswordResetEmail({ user, token: rawToken });
    } catch (e) {
      logger.warn('Password reset email transmission error:', e.message);
    }

    return genericResponse();
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(validatedData.token);

    const record = await db.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
        timestamp: new Date().toISOString()
      });
    }

    const hashedPassword = await hashPassword(validatedData.newPassword);

    // In transaction: update password, mark token used, revoke ALL sessions
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword }
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      db.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset. Please log in with your new password.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const issues = err.errors || err.issues || [];
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e) => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), message: e.message })),
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);

    const user = await db.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        timestamp: new Date().toISOString()
      });
    }

    const isMatch = await comparePassword(validatedData.currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
        timestamp: new Date().toISOString()
      });
    }

    const hashedPassword = await hashPassword(validatedData.newPassword);

    // Update password and revoke other sessions
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      // Revoke all sessions for user
      db.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    // Issue fresh session for the current client
    const { rawRefreshToken, refreshTokenHash, refreshExpiresAt } = generateAuthTokens(user);

    await db.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent: req.headers['user-agent'] || 'Unknown client',
        ipAddress: req.ip || req.connection.remoteAddress || 'Unknown IP',
        expiresAt: refreshExpiresAt
      }
    });

    setRefreshTokenCookie(res, rawRefreshToken);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const issues = err.errors || err.issues || [];
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e) => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), message: e.message })),
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const sessions = await db.session.findMany({
      where: {
        userId: req.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const currentRawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const currentHash = currentRawToken ? hashToken(currentRawToken) : null;

    const formatted = sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent || 'Unknown Device',
      ipAddress: s.ipAddress || 'Unknown IP',
      createdAt: s.createdAt,
      lastActive: s.updatedAt,
      isCurrent: s.refreshTokenHash === currentHash
    }));

    return res.status(200).json({
      success: true,
      data: { sessions: formatted },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await db.session.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
        timestamp: new Date().toISOString()
      });
    }

    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    return res.status(200).json({
      success: true,
      message: 'Session revoked successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

export const revokeAllSessions = async (req, res, next) => {
  try {
    await db.session.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'All active sessions have been terminated. Please log in again.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

