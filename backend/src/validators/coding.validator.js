import { z } from 'zod';
import { isLanguageSupported } from '../services/codeExecution/languageConfig.js';

export const runCodeSchema = z.object({
  language: z
    .string({ required_error: 'Language is required' })
    .trim()
    .toLowerCase()
    .refine((lang) => isLanguageSupported(lang), {
      message: 'Invalid or unsupported programming language'
    }),
  sourceCode: z
    .string({ required_error: 'Source code is required' })
    .min(1, 'Source code cannot be empty')
    .max(50000, 'Source code cannot exceed 50,000 characters'),
  stdin: z
    .string()
    .max(20000, 'Standard input cannot exceed 20,000 characters')
    .optional()
    .default('')
});

export const standaloneRunSchema = z.object({
  language: z
    .string({ required_error: 'Language is required' })
    .trim()
    .toLowerCase()
    .refine((lang) => isLanguageSupported(lang), {
      message: 'Invalid or unsupported programming language'
    }),
  sourceCode: z
    .string({ required_error: 'Source code is required' })
    .min(1, 'Source code cannot be empty')
    .max(50000, 'Source code cannot exceed 50,000 characters'),
  stdin: z
    .string()
    .max(20000, 'Standard input cannot exceed 20,000 characters')
    .optional()
    .default('')
});

export const submitCodeSchema = z.object({
  language: z
    .string({ required_error: 'Language is required' })
    .trim()
    .toLowerCase()
    .refine((lang) => isLanguageSupported(lang), {
      message: 'Invalid or unsupported programming language'
    }),
  sourceCode: z
    .string({ required_error: 'Source code is required' })
    .min(1, 'Source code cannot be empty')
    .max(50000, 'Source code cannot exceed 50,000 characters'),
  practiceSessionId: z.string().uuid().optional().nullable()
});

export const querySubmissionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});
