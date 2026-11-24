import { z } from 'zod';

export const dateRangeEnum = z.enum(['7d', '30d', '90d', '6m', 'all']);

export const analyticsFilterSchema = z.object({
  dateRange: dateRangeEnum.optional().default('all'),
  preparationSessionId: z.string().uuid().or(z.string()).optional(),
  category: z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'MIXED', 'MOCK_INTERVIEW', 'ALL']).optional().default('ALL'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const createImprovementPlanSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().max(1000).optional(),
  preparationSessionId: z.string().uuid().or(z.string()).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  targetDate: z.string().datetime().or(z.string()).optional().nullable(),
  targetSkills: z.array(z.string()).optional().default([]),
  identifiedWeaknesses: z.array(z.string()).optional().default([])
});

export const updateImprovementPlanSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  targetDate: z.string().datetime().or(z.string()).optional().nullable(),
  targetSkills: z.array(z.string()).optional(),
  identifiedWeaknesses: z.array(z.string()).optional(),
  completionPercentage: z.number().int().min(0).max(100).optional()
});

export const createLearningTaskSchema = z.object({
  improvementPlanId: z.string().uuid().or(z.string()),
  title: z.string().min(3, 'Task title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  skillName: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional().default('General'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).optional().default('PENDING'),
  estimatedMinutes: z.number().int().min(5).max(480).optional().default(30),
  dueDate: z.string().datetime().or(z.string()).optional().nullable(),
  resourceUrl: z.string().url().or(z.string().max(500)).optional().nullable()
});

export const updateLearningTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  skillName: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).optional(),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
  dueDate: z.string().datetime().or(z.string()).optional().nullable(),
  resourceUrl: z.string().url().or(z.string().max(500)).optional().nullable()
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'])
});

export const queryLearningTasksSchema = z.object({
  improvementPlanId: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'ALL']).optional().default('ALL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'ALL']).optional().default('ALL'),
  category: z.string().optional(),
  skillName: z.string().optional(),
  search: z.string().optional(),
  overdueOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  page: z.preprocess((val) => Number(val) || 1, z.number().int().min(1)).optional().default(1),
  limit: z.preprocess((val) => Number(val) || 20, z.number().int().min(1).max(100)).optional().default(20)
});

export const aiPlanGenerationSchema = z.object({
  preparationSessionId: z.string().uuid().or(z.string()).optional().nullable(),
  focusAreas: z.array(z.string()).optional(),
  durationWeeks: z.number().int().min(1).max(12).optional().default(4),
  customGoal: z.string().max(500).optional()
});

