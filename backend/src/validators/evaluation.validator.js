import { z } from 'zod';

export const queryEvaluationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sourceType: z.enum(['MOCK_INTERVIEW', 'PRACTICE_ANSWER', 'CODING_SUBMISSION']).optional(),
  preparationSessionId: z.string().uuid().optional()
});

export const generateReportSchema = z.object({
  preparationSessionId: z.string().uuid().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  reportType: z.enum(['COMPREHENSIVE', 'MOCK_INTERVIEW', 'CODING', 'PRACTICE']).default('COMPREHENSIVE'),
  title: z.string().min(3).max(200).optional().or(z.literal('')).transform((v) => (v ? v : undefined))
});

export const acceptRecommendationSchema = z.object({
  targetDate: z.string().datetime().optional()
});

// ==========================================
// AI Output Zod Schemas for Runtime Validation
// ==========================================

export const aiAnswerEvaluationOutputSchema = z.object({
  criterionScores: z.array(
    z.object({
      criterion: z.string().min(1),
      score: z.coerce.number().min(0).max(100),
      explanation: z.string().default(''),
      supportingEvidence: z.string().default('')
    })
  ).default([]),
  technicalAccuracySummary: z.string().optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missingConcepts: z.array(z.string()).default([]),
  improvementSuggestions: z.array(z.string()).default([]),
  improvedAnswer: z.string().default(''),
  detailedFeedback: z.string().default(''),
  confidence: z.coerce.number().min(0).max(1).default(0.85)
});

export const aiCodingEvaluationOutputSchema = z.object({
  timeComplexity: z.string().default('O(n)'),
  spaceComplexity: z.string().default('O(1)'),
  complexityExplanation: z.string().default(''),
  codeQualityScore: z.coerce.number().min(0).max(100).default(75),
  algorithmicEfficiencyScore: z.coerce.number().min(0).max(100).default(75),
  edgeCaseHandlingScore: z.coerce.number().min(0).max(100).default(70),
  readabilityScore: z.coerce.number().min(0).max(100).default(80),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  improvementSuggestions: z.array(z.string()).default([]),
  alternativeApproaches: z.array(z.string()).default([]),
  detailedFeedback: z.string().default(''),
  confidence: z.coerce.number().min(0).max(1).default(0.9)
});

export const aiMockInterviewEvaluationOutputSchema = z.object({
  criterionScores: z.array(
    z.object({
      criterion: z.string().min(1),
      score: z.coerce.number().min(0).max(100),
      explanation: z.string().default(''),
      supportingEvidence: z.string().default('')
    })
  ).default([]),
  questionEvaluations: z.array(
    z.object({
      questionNumber: z.coerce.number().int().default(1),
      topic: z.string().default('General'),
      score: z.coerce.number().min(0).max(100).default(75),
      strengths: z.array(z.string()).default([]),
      weaknesses: z.array(z.string()).default([]),
      feedback: z.string().default('')
    })
  ).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  technicalAccuracyScore: z.coerce.number().min(0).max(100).default(75),
  communicationScore: z.coerce.number().min(0).max(100).default(75),
  problemSolvingScore: z.coerce.number().min(0).max(100).default(75),
  completenessScore: z.coerce.number().min(0).max(100).default(75),
  summary: z.string().default(''),
  recommendations: z.array(z.string()).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0.85)
});

