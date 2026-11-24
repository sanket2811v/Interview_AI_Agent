import { z } from 'zod';

export const healthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  environment: z.string(),
  timestamp: z.string()
});

export const databaseHealthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  database: z.string(),
  responseTimeMs: z.number().optional(),
  timestamp: z.string()
});

