import { z } from 'zod';

/**
 * Zod validation schema for the AI-generated Job Description Analysis response.
 * Strictly verifies types, enums, numeric ranges, and structural contracts.
 */

export const jobOverviewSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  standardizedTitle: z.string().default('Software Professional'),
  alternativeTitles: z.array(z.string()).default([]),
  companyName: z.string().nullable().default(null),
  department: z.string().nullable().default(null),
  seniorityLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE', 'UNKNOWN']).default('UNKNOWN'),
  employmentType: z.string().nullable().default(null),
  workArrangement: z.enum(['ONSITE', 'REMOTE', 'HYBRID', 'UNKNOWN']).default('UNKNOWN'),
  location: z.string().nullable().default(null),
  summary: z.string().min(1, 'Role summary is required'),
  primaryPurpose: z.string().nullable().default(null)
});

export const experienceAnalysisSchema = z.object({
  minimumYears: z.number().nullable().default(null),
  maximumYears: z.number().nullable().default(null),
  experienceLevel: z.enum(['FRESHER', 'ENTRY_LEVEL', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD', 'UNKNOWN']).default('UNKNOWN'),
  freshGraduateEligible: z.boolean().nullable().default(null),
  explicitRequirements: z.array(z.string()).default([]),
  inferredExpectations: z.array(z.string()).default([]),
  leadershipRequired: z.boolean().nullable().default(null)
});

export const technicalSkillItemSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  category: z.enum([
    'PROGRAMMING_LANGUAGES',
    'FRONTEND',
    'BACKEND',
    'DATABASES',
    'CLOUD_DEVOPS',
    'TOOLS_PLATFORMS',
    'AI_DATA',
    'OTHER'
  ]).default('OTHER'),
  requirementType: z.enum(['REQUIRED', 'PREFERRED', 'OPTIONAL']).default('REQUIRED'),
  importance: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  evidence: z.string().default(''),
  isExplicit: z.boolean().default(true)
});

export const softSkillItemSchema = z.object({
  name: z.string().min(1, 'Soft skill name is required'),
  importance: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  evidence: z.string().default(''),
  isExplicit: z.boolean().default(true)
});

export const responsibilityItemSchema = z.object({
  title: z.string().min(1, 'Responsibility title is required'),
  description: z.string().default(''),
  category: z.string().default('General'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  evidence: z.string().default('')
});

export const qualificationItemSchema = z.object({
  type: z.enum(['EDUCATION', 'CERTIFICATION', 'TECHNICAL', 'DOMAIN', 'EXPERIENCE', 'OTHER']).default('OTHER'),
  requirement: z.string().min(1, 'Requirement description is required'),
  isMandatory: z.boolean().default(true),
  evidence: z.string().default('')
});

export const technologyStackSchema = z.object({
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  databases: z.array(z.string()).default([]),
  cloudPlatforms: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  other: z.array(z.string()).default([])
});

export const difficultyAnalysisSchema = z.object({
  level: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM'),
  score: z.number().min(1).max(100).default(50),
  explanation: z.string().default(''),
  technicalComplexity: z.string().default('Standard industry expectations'),
  experienceComplexity: z.string().default('Commensurate with seniority level')
});

export const skillGapItemSchema = z.object({
  requiredSkill: z.string().min(1, 'Required skill is required'),
  candidateEvidence: z.string().nullable().default(null),
  matchStatus: z.enum(['MATCHED', 'PARTIAL_MATCH', 'GAP', 'UNKNOWN']).default('UNKNOWN'),
  importance: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  explanation: z.string().default(''),
  improvementAction: z.string().default('')
});

export const skillGapAnalysisSchema = z.object({
  isPreliminary: z.boolean().default(true),
  profileCompleteness: z.enum(['COMPLETE', 'PARTIAL', 'INCOMPLETE']).default('INCOMPLETE'),
  skills: z.array(skillGapItemSchema).default([])
});

export const summarySchema = z.object({
  executiveSummary: z.string().default(''),
  topTechnicalSkills: z.array(z.string()).default([]),
  topSoftSkills: z.array(z.string()).default([]),
  mainHiringPriorities: z.array(z.string()).default([]),
  preparationRecommendations: z.array(z.string()).default([]),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  limitations: z.array(z.string()).default([])
});

/**
 * Complete AI Analysis Response Contract Schema
 */
export const jobAnalysisOutputSchema = z.object({
  jobOverview: jobOverviewSchema,
  experienceAnalysis: experienceAnalysisSchema,
  technicalSkills: z.array(technicalSkillItemSchema).default([]),
  softSkills: z.array(softSkillItemSchema).default([]),
  responsibilities: z.array(responsibilityItemSchema).default([]),
  qualifications: z.array(qualificationItemSchema).default([]),
  technologyStack: technologyStackSchema,
  difficultyAnalysis: difficultyAnalysisSchema,
  skillGapAnalysis: skillGapAnalysisSchema,
  summary: summarySchema
});

/**
 * Validates and normalizes raw JSON data returned by the AI provider
 *
 * @param {unknown} data - Raw parsed JSON from AI response
 * @returns {object} Validated and typed analysis object
 */
export function validateJobAnalysisOutput(data) {
  const result = jobAnalysisOutputSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    const errorDetails = Array.isArray(issues) && issues.length > 0
      ? issues.map(e => `${(e.path || []).join('.')}: ${e.message}`).join('; ')
      : result.error?.message || 'Schema validation failed';
    const err = new Error(`Invalid structured analysis from AI provider: ${errorDetails}`);
    err.status = 502; // Bad Gateway from upstream model
    err.details = typeof result.error?.format === 'function' ? result.error.format() : issues;
    throw err;
  }
  return result.data;
}
