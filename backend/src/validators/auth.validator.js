import { z } from 'zod';
import { validatePasswordStrength } from '../utils/password.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').superRefine((val, ctx) => {
    const check = validatePasswordStrength(val);
    if (!check.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.message
      });
    }
  }),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions to register'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').superRefine((val, ctx) => {
    const check = validatePasswordStrength(val);
    if (!check.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.message
      });
    }
  }),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').superRefine((val, ctx) => {
    const check = validatePasswordStrength(val);
    if (!check.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.message
      });
    }
  }),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password cannot be the same as your current password',
  path: ['newPassword']
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required')
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address')
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  headline: z.string().trim().max(150).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  currentRole: z.string().trim().max(100).optional().nullable(),
  experience: z.string().trim().max(50).optional().nullable(),
  skills: z.array(z.string().trim().max(50)).max(50).optional(),
  preferredJobRole: z.string().trim().max(100).optional().nullable()
});

export default {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateProfileSchema
};

