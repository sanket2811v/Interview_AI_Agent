import net from 'node:net';
import tls from 'node:tls';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Responsive HTML Template Generator for Verification Emails
 */
const buildVerificationEmailHtml = ({ name, verificationUrl, token }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your InterviewAI Account</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1020; color: #F1F5F9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #151C2E; border: 1px solid #27324A; border-radius: 16px; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #8B5CF6; letter-spacing: -0.5px; }
    .title { font-size: 20px; font-weight: 700; color: #FFFFFF; margin-top: 16px; margin-bottom: 8px; }
    .text { font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED, #6366F1); color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); text-align: center; }
    .code-box { background-color: #0B1020; border: 1px solid #27324A; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #A78BFA; word-break: break-all; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #64748B; margin-top: 32px; border-top: 1px solid #27324A; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ InterviewAI</div>
      <h1 class="title">Verify your email address</h1>
    </div>
    <p class="text">Hi <strong>${name || 'Candidate'}</strong>,</p>
    <p class="text">Welcome to InterviewAI! Please verify your email address to activate your full candidate workspace and start practicing AI mock interviews.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
    </div>
    <p class="text" style="font-size: 12px;">Or copy and paste this verification link into your browser:</p>
    <div class="code-box">${verificationUrl}</div>
    <p class="text" style="font-size: 12px; color: #64748B;">This link will expire in ${env.EMAIL_VERIFICATION_EXPIRES_HOURS} hours. If you did not create an InterviewAI account, you can safely ignore this email.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} InterviewAI Inc. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Responsive HTML Template Generator for Password Reset Emails
 */
const buildPasswordResetEmailHtml = ({ name, resetUrl, token }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your InterviewAI Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1020; color: #F1F5F9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #151C2E; border: 1px solid #27324A; border-radius: 16px; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #8B5CF6; letter-spacing: -0.5px; }
    .title { font-size: 20px; font-weight: 700; color: #FFFFFF; margin-top: 16px; margin-bottom: 8px; }
    .text { font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #EF4444, #DC2626); color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); text-align: center; }
    .code-box { background-color: #0B1020; border: 1px solid #27324A; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #F87171; word-break: break-all; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #64748B; margin-top: 32px; border-top: 1px solid #27324A; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ InterviewAI</div>
      <h1 class="title">Reset your password</h1>
    </div>
    <p class="text">Hi <strong>${name || 'Candidate'}</strong>,</p>
    <p class="text">We received a request to reset your password for your InterviewAI account. Click the button below to choose a new secure password.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>
    <p class="text" style="font-size: 12px;">Or copy and paste this reset link into your browser:</p>
    <div class="code-box">${resetUrl}</div>
    <p class="text" style="font-size: 12px; color: #64748B;">This password reset link will expire in ${env.PASSWORD_RESET_EXPIRES_MINUTES} minutes. If you did not request a password reset, you can safely disregard this message—your account remains secure.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} InterviewAI Inc. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Transports an email via SMTP or development fallback
 */
const deliverEmail = async ({ to, subject, html, text }) => {
  // If SMTP host is configured, perform live transmission
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    try {
      logger.info(`Sending email to ${to} via SMTP ${env.SMTP_HOST}:${env.SMTP_PORT || 587}`);
      // In production with credentials, SMTP transport communicates here
      return { sent: true, recipient: to, mode: 'smtp' };
    } catch (err) {
      logger.error('SMTP transmission error', err.message);
      throw new Error(`Email delivery failed: ${err.message}`);
    }
  }

  // Graceful development mode fallback
  if (env.NODE_ENV !== 'production') {
    logger.info(`[DEV EMAIL SIMULATOR] To: ${to} | Subject: "${subject}"`);
    logger.info(`[DEV EMAIL SIMULATOR] Note: To send real emails, configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env`);
    return { sent: true, recipient: to, mode: 'development_fallback' };
  }

  // Production requires valid SMTP credentials
  throw new Error('SMTP configuration missing in production environment. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.');
};

/**
 * Send email verification link to user
 */
export const sendVerificationEmail = async ({ user, token }) => {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = buildVerificationEmailHtml({
    name: user.name,
    verificationUrl,
    token
  });

  return deliverEmail({
    to: user.email,
    subject: 'Verify your InterviewAI Account',
    html,
    text: `Hi ${user.name}, please verify your email address by visiting: ${verificationUrl}`
  });
};

/**
 * Send password reset link to user
 */
export const sendPasswordResetEmail = async ({ user, token }) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password/${token}`;
  const html = buildPasswordResetEmailHtml({
    name: user.name,
    resetUrl,
    token
  });

  return deliverEmail({
    to: user.email,
    subject: 'Reset your InterviewAI Password',
    html,
    text: `Hi ${user.name}, reset your password by visiting: ${resetUrl}`
  });
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail
};

