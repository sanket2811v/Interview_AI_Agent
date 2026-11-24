import { z } from 'zod';
import {
  normalizeCategory,
  normalizeDifficulty,
  normalizeScope
} from '../utils/practiceNormalization.js';

/**
 * Validation schemas for Phase 8: Interview Practice Engine
 */

// 1. Start Practice Session Schema
export const createPracticeSessionSchema = z.object({
  category: z.preprocess(
    (val) => normalizeCategory(val),
    z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'ALL']).default('ALL')
  ),
  selectedCategories: z.array(
    z.preprocess(
      (val) => normalizeCategory(val),
      z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO'])
    )
  ).optional(),
  difficulty: z.preprocess(
    (val) => normalizeDifficulty(val),
    z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'MIXED']).default('MEDIUM')
  ),
  count: z.coerce.number().int().min(1, 'Minimum 1 question').max(50, 'Maximum 50 questions per session').default(10),
  skills: z.array(z.string()).default([]),
  filter: z.preprocess(
    (val) => normalizeScope(val),
    z.enum(['ALL', 'UNATTEMPTED', 'ATTEMPTED', 'NEEDS_REVIEW', 'BOOKMARKED']).default('ALL')
  ),
  allowPartial: z.boolean().default(false)
});

// 2. Save Answer Draft Schema
export const saveDraftSchema = z.object({
  answer: z.string().max(20000, 'Draft answer cannot exceed 20,000 characters').default(''),
  answerFormat: z.enum(['TEXT', 'CODE', 'SYSTEM_DESIGN_STRUCTURED']).default('TEXT'),
  revealedHints: z.array(z.number().int()).default([])
});

// 3. Submit Answer Attempt Schema
export const submitAttemptSchema = z.object({
  answer: z.string().min(1, 'Answer cannot be empty').max(20000, 'Answer cannot exceed 20,000 characters'),
  answerFormat: z.enum(['TEXT', 'CODE', 'SYSTEM_DESIGN_STRUCTURED']).default('TEXT'),
  timeTaken: z.number().int().min(0).max(7200).optional(), // in seconds
  revealedHints: z.array(z.number().int()).default([])
});

// 4. Update Question Review / Self-Assessment Schema
export const updateReviewSchema = z.object({
  isBookmarked: z.boolean().optional(),
  needsReview: z.boolean().optional(),
  selfRating: z.number().int().min(1).max(5).nullable().optional(),
  personalNotes: z.string().max(5000, 'Personal notes cannot exceed 5,000 characters').nullable().optional()
});

// 5. Query Practice Sessions Schema
export const queryPracticeSessionsSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'ALL']).optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// 6. Query Practice History Schema
export const queryHistorySchema = z.object({
  preparationId: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

