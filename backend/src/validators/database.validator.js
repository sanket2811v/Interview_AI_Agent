import { z } from 'zod';

export const preparationStatusEnum = z.enum([
  'DRAFT',
  'ANALYZING',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'ARCHIVED'
]);

export const experienceLevelEnum = z.enum([
  'ENTRY',
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'EXECUTIVE'
]);

export const difficultyLevelEnum = z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']);

export const interviewCategoryEnum = z.enum([
  'TECHNICAL',
  'HR',
  'CODING',
  'SYSTEM_DESIGN',
  'SCENARIO',
  'COMPANY_SPECIFIC'
]);

export const interviewTypeEnum = z.enum([
  'TECHNICAL',
  'HR',
  'CODING',
  'SYSTEM_DESIGN',
  'MIXED'
]);

export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const aiUsageOperationEnum = z.enum([
  'JOB_ANALYSIS',
  'QUESTION_GENERATION',
  'ANSWER_EVALUATION',
  'MOCK_INTERVIEW',
  'CODING_REVIEW',
  'IMPROVEMENT_PLAN'
]);

/**
 * Validator for creating a new preparation session with Job Description
 */
export const createPreparationSessionSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  companyName: z.string().trim().min(2, 'Company name is required').max(100),
  jobTitle: z.string().trim().min(2, 'Job title is required').max(100),
  experienceLevel: experienceLevelEnum.default('MID'),
  preferredLanguage: z.string().default('JavaScript'),
  difficulty: difficultyLevelEnum.default('MEDIUM'),
  rawJobDescription: z.string().trim().min(20, 'Job description must be at least 20 characters')
});

/**
 * Validator for question attempt submission
 */
export const submitQuestionAttemptSchema = z.object({
  questionId: z.string().uuid('Invalid question identifier'),
  answer: z.string().trim().min(5, 'Answer cannot be empty'),
  timeTaken: z.number().int().min(0, 'Time taken cannot be negative').optional()
});

/**
 * Validator for code submission
 */
export const submitCodingSolutionSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge identifier'),
  language: z.string().min(1, 'Programming language is required'),
  sourceCode: z.string().min(1, 'Source code cannot be empty')
});

/**
 * Validator for mock interview creation
 */
export const createMockInterviewSchema = z.object({
  preparationSessionId: z.string().uuid('Invalid preparation session ID'),
  interviewType: interviewTypeEnum.default('TECHNICAL'),
  difficulty: difficultyLevelEnum.default('MEDIUM')
});

/**
 * Validator for learning tasks
 */
export const createLearningTaskSchema = z.object({
  improvementPlanId: z.string().uuid('Invalid improvement plan ID'),
  title: z.string().trim().min(3, 'Task title is required').max(150),
  description: z.string().optional(),
  category: z.string().default('General'),
  priority: taskPriorityEnum.default('MEDIUM'),
  estimatedMinutes: z.number().int().min(1, 'Estimated minutes must be greater than zero').default(30),
  dueDate: z.string().datetime().optional()
});

/**
 * Validator for AI usage telemetry
 */
export const logAIUsageSchema = z.object({
  preparationSessionId: z.string().uuid().optional().nullable(),
  operationType: aiUsageOperationEnum,
  provider: z.string().default('Gemini'),
  model: z.string().default('gemini-2.0-flash'),
  promptTokens: z.number().int().min(0, 'Prompt tokens cannot be negative').default(0),
  completionTokens: z.number().int().min(0, 'Completion tokens cannot be negative').default(0),
  totalTokens: z.number().int().min(0, 'Total tokens cannot be negative').default(0),
  estimatedCost: z.number().min(0, 'Estimated cost cannot be negative').default(0),
  durationMs: z.number().int().min(0, 'Duration cannot be negative').default(0)
});

