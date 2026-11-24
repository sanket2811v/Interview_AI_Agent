import { z } from 'zod';

export const createMockInterviewSchema = z.object({
  preparationSessionId: z.string().uuid({ message: 'Valid preparationSessionId UUID is required' }),
  interviewType: z
    .enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'MIXED'])
    .default('TECHNICAL'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM'),
  experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).default('MID'),
  durationMinutes: z.coerce.number().int().min(10).max(90).default(30),
  questionLimit: z.coerce.number().int().min(3).max(20).default(5),
  interviewerPersonality: z
    .enum(['Professional', 'Friendly', 'Strict', 'Supportive', 'Challenging'])
    .default('Professional'),
  language: z.string().min(2).max(50).default('English'),
  preferences: z
    .object({
      allowHints: z.boolean().default(true),
      allowClarification: z.boolean().default(true),
      allowSkip: z.boolean().default(true)
    })
    .default({
      allowHints: true,
      allowClarification: true,
      allowSkip: true
    })
});

export const submitAnswerSchema = z.object({
  content: z
    .string({ required_error: 'Answer content is required' })
    .trim()
    .min(1, 'Answer cannot be empty')
    .max(10000, 'Answer cannot exceed 10,000 characters')
});

export const actionSchema = z.object({
  actionType: z.enum(['CLARIFY', 'HINT', 'SKIP'], {
    required_error: 'Valid actionType (CLARIFY, HINT, SKIP) is required'
  })
});

export const queryInterviewsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['CREATED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ABANDONED', 'FAILED']).optional(),
  interviewType: z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'MIXED']).optional()
});
