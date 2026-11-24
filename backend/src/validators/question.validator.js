import { z } from 'zod';

/**
 * Validation schemas for Interview Question Generation and Management
 */

// 1. Client Generation Request Schema
export const generateQuestionsSchema = z.object({
  category: z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'ALL']).default('TECHNICAL'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'MIXED']).default('MEDIUM'),
  count: z.coerce.number().int().min(1, 'Minimum 1 question').max(20, 'Maximum 20 questions per generation batch').default(5),
  targetSkills: z.array(z.string()).default([]),
  language: z.string().default('JavaScript'),
  includeExplanations: z.boolean().default(true),
  includeReferenceAnswers: z.boolean().default(true),
  includeHints: z.boolean().default(true),
  includeFollowUps: z.boolean().default(true),
  focusOnGaps: z.boolean().default(false)
});

// 2. Client Query Schema for Fetching Questions
export const queryQuestionsSchema = z.object({
  category: z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'ALL']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'ALL']).optional(),
  search: z.string().optional(),
  skill: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// 3. Client Question Update Schema
export const updateQuestionSchema = z.object({
  question: z.string().min(5, 'Question text must be at least 5 characters').optional(),
  description: z.string().nullable().optional(),
  referenceAnswer: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).optional()
});

// Helper normalizers to safely handle LLM format variations
const normalizeCategory = (val) => {
  if (typeof val !== 'string') return 'TECHNICAL';
  const clean = val.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'COMPANY_SPECIFIC'].includes(clean)) {
    return clean;
  }
  if (clean.includes('BEHAVIOR') || clean.includes('HR')) return 'HR';
  if (clean.includes('SYSTEM') || clean.includes('DESIGN') || clean.includes('ARCHITECT')) return 'SYSTEM_DESIGN';
  if (clean.includes('CODE') || clean.includes('ALGO') || clean.includes('PROGRAM')) return 'CODING';
  if (clean.includes('SCENARIO') || clean.includes('SITUAT')) return 'SCENARIO';
  return 'TECHNICAL';
};

const normalizeDifficulty = (val) => {
  if (typeof val !== 'string') return 'MEDIUM';
  const clean = val.trim().toUpperCase();
  if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(clean)) {
    return clean;
  }
  if (clean.includes('EASY') || clean.includes('BEGIN') || clean.includes('ENTRY')) return 'EASY';
  if (clean.includes('HARD') || clean.includes('ADVANC') || clean.includes('SENIOR')) return 'HARD';
  if (clean.includes('EXPERT') || clean.includes('LEAD') || clean.includes('PRINCIPAL')) return 'EXPERT';
  return 'MEDIUM';
};

const toStringArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string') return [val.trim()].filter(Boolean);
  return [];
};

const toInteger = (val, defaultVal = 5) => {
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'string') {
    const parsed = parseInt(val.replace(/\D/g, ''), 10);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultVal;
};

// 4. AI Structured Response Question Item Schema
export const questionItemSchema = z.object({
  question: z.string().min(5, 'Question text must be at least 5 characters'),
  category: z.preprocess(normalizeCategory, z.enum(['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'COMPANY_SPECIFIC'])).default('TECHNICAL'),
  subcategory: z.preprocess((v) => (v ? String(v).trim() : 'General'), z.string()).default('General'),
  difficulty: z.preprocess(normalizeDifficulty, z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT'])).default('MEDIUM'),
  relatedSkills: z.preprocess(toStringArray, z.array(z.string())).default([]),
  description: z.preprocess((v) => (v ? String(v).trim() : null), z.string().nullable()).default(null),
  expectedConcepts: z.preprocess(toStringArray, z.array(z.string())).default([]),
  hints: z.preprocess(toStringArray, z.array(z.string())).default([]),
  referenceAnswer: z.preprocess((v) => (v ? String(v).trim() : null), z.string().nullable()).default(null),
  explanation: z.preprocess((v) => (v ? String(v).trim() : null), z.string().nullable()).default(null),
  evaluationCriteria: z.preprocess(toStringArray, z.array(z.string())).default([]),
  followUpQuestions: z.preprocess(toStringArray, z.array(z.string())).default([]),
  estimatedTime: z.preprocess((v) => toInteger(v, 5), z.number().int().min(1).max(60)).default(5),
  tags: z.preprocess(toStringArray, z.array(z.string())).default([])
});

// 5. Coding Test Case Schema
export const codingTestCaseSchema = z.object({
  input: z.preprocess((v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')), z.string()).default(''),
  expectedOutput: z.preprocess((v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')), z.string()).default(''),
  isHidden: z.preprocess((v) => Boolean(v), z.boolean()).default(false),
  displayOrder: z.preprocess((v) => toInteger(v, 0), z.number().int()).default(0)
});

// 6. Coding Challenge Item Schema
export const codingChallengeItemSchema = z.object({
  title: z.string().min(3, 'Coding challenge title is required'),
  description: z.string().min(10, 'Coding challenge description is required'),
  category: z.preprocess((v) => (v ? String(v).trim() : 'Algorithms'), z.string()).default('Algorithms'),
  difficulty: z.preprocess(normalizeDifficulty, z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT'])).default('MEDIUM'),
  supportedLanguages: z.preprocess(toStringArray, z.array(z.string())).default(['javascript', 'python', 'java', 'cpp']),
  constraints: z.preprocess(toStringArray, z.array(z.string())).default([]),
  inputFormat: z.preprocess((v) => (v ? String(v) : ''), z.string()).default(''),
  outputFormat: z.preprocess((v) => (v ? String(v) : ''), z.string()).default(''),
  sampleInput: z.preprocess((v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')), z.string()).default(''),
  sampleOutput: z.preprocess((v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')), z.string()).default(''),
  explanation: z.preprocess((v) => (v ? String(v) : null), z.string().nullable()).default(null),
  hints: z.preprocess(toStringArray, z.array(z.string())).default([]),
  expectedTimeComplexity: z.preprocess((v) => (v ? String(v) : null), z.string().nullable()).default(null),
  expectedSpaceComplexity: z.preprocess((v) => (v ? String(v) : null), z.string().nullable()).default(null),
  timeLimit: z.preprocess((v) => toInteger(v, 2000), z.number().int()).default(2000),
  memoryLimit: z.preprocess((v) => toInteger(v, 128), z.number().int()).default(128),
  testCases: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(codingTestCaseSchema)).default([])
});

// 7. Full Root Schema for AI Question Generation Output
export const generatedQuestionsOutputSchema = z.object({
  questions: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(questionItemSchema)).default([]),
  codingChallenges: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(codingChallengeItemSchema)).default([])
});

/**
 * Validates raw AI output against structured question schemas
 *
 * @param {unknown} data - Raw parsed JSON from AI response
 * @returns {object} Validated questions and challenges
 */
export function validateGeneratedQuestionsOutput(data) {
  const normalized = {
    questions: Array.isArray(data?.questions)
      ? data.questions
      : (Array.isArray(data?.interviewQuestions) ? data.interviewQuestions : (Array.isArray(data?.items) ? data.items : [])),
    codingChallenges: Array.isArray(data?.codingChallenges)
      ? data.codingChallenges
      : (Array.isArray(data?.challenges) ? data.challenges : [])
  };

  const result = generatedQuestionsOutputSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    const errorDetails = Array.isArray(issues) && issues.length > 0
      ? issues.map(e => `${(e.path || []).join('.')}: ${e.message}`).join('; ')
      : result.error?.message || 'Schema validation failed';
    const err = new Error(`Invalid structured question response from AI provider: ${errorDetails}`);
    err.status = 502;
    err.details = typeof result.error?.format === 'function' ? result.error.format() : issues;
    throw err;
  }
  return result.data;
}

