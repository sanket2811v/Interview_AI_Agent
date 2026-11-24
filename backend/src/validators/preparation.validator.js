import { z } from 'zod';
import { experienceLevelEnum, difficultyLevelEnum, preparationStatusEnum } from './database.validator.js';

export const allowedPreferencesEnum = z.enum([
  'Technical interview',
  'HR interview',
  'Coding assessment',
  'System design',
  'Scenario-based questions',
  'Company-specific preparation'
]);

export const experienceLevelMapping = {
  FRESHER: 'ENTRY',
  ENTRY_LEVEL: 'ENTRY',
  ENTRY: 'ENTRY',
  JUNIOR: 'JUNIOR',
  MID_LEVEL: 'MID',
  MID: 'MID',
  SENIOR: 'SENIOR',
  LEAD: 'LEAD',
  EXECUTIVE: 'EXECUTIVE'
};

export const createPreparationSchema = z.object({
  jobTitle: z.string({ required_error: 'Job title is required' }).trim().min(2, 'Job title must be at least 2 characters').max(100),
  companyName: z.string({ required_error: 'Company name is required' }).trim().min(2, 'Company name must be at least 2 characters').max(100),
  location: z.string().trim().max(100).optional().nullable(),
  experienceLevel: z.string().transform((val) => {
    const normalized = val.toUpperCase().replace(/\s+/g, '_');
    return experienceLevelMapping[normalized] || 'MID';
  }).pipe(experienceLevelEnum).default('MID'),
  yearsOfExperience: z.coerce.number().int().min(0, 'Years of experience cannot be negative').max(50).optional().nullable(),
  preferredLanguage: z.string().trim().min(1).default('JavaScript'),
  difficulty: z.string().toUpperCase().pipe(difficultyLevelEnum).default('MEDIUM'),
  preferences: z.array(z.string()).default([
    'Technical interview',
    'System design'
  ]),
  jobDescription: z.string({ required_error: 'Job description is required' })
    .trim()
    .min(20, 'Job description must be at least 20 characters for meaningful analysis')
    .max(50000, 'Job description exceeds maximum allowable length of 50,000 characters'),
  title: z.string().trim().max(150).optional()
});

export const updatePreparationSchema = z.object({
  jobTitle: z.string().trim().min(2).max(100).optional(),
  companyName: z.string().trim().min(2).max(100).optional(),
  location: z.string().trim().max(100).optional().nullable(),
  experienceLevel: z.string().transform((val) => {
    const normalized = val.toUpperCase().replace(/\s+/g, '_');
    return experienceLevelMapping[normalized] || val;
  }).pipe(experienceLevelEnum).optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(50).optional().nullable(),
  preferredLanguage: z.string().trim().min(1).optional(),
  difficulty: z.string().toUpperCase().pipe(difficultyLevelEnum).optional(),
  preferences: z.array(z.string()).optional(),
  status: preparationStatusEnum.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  title: z.string().trim().max(150).optional(),
  jobDescription: z.string().trim().min(20).max(50000).optional()
});

export const updateJobDescriptionSchema = z.object({
  rawText: z.string({ required_error: 'Job description text is required' })
    .trim()
    .min(20, 'Job description text must be at least 20 characters')
    .max(50000)
});

export const queryPreparationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  experienceLevel: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'companyName', 'progress']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: z.coerce.boolean().default(false)
});

