/**
 * Centralized mappings and normalizers for InterviewAI Practice Engine
 * Bridges human-friendly UI labels, external API payloads, and internal PostgreSQL Prisma enums.
 */

export const CATEGORY_LABELS = {
  TECHNICAL: 'Technical Deep-Dive',
  HR: 'HR & Behavioral (STAR)',
  CODING: 'Coding Arena Challenges',
  SYSTEM_DESIGN: 'System Design & Architecture',
  SCENARIO: 'Scenario & Incident Triage',
  ALL: 'All Categories (Comprehensive Practice)'
};

export const DIFFICULTY_LABELS = {
  EASY: 'Easy (Core Foundations)',
  MEDIUM: 'Medium (Balanced Standards)',
  HARD: 'Hard (Advanced / Senior Bar)',
  EXPERT: 'Expert (Staff / Principal Level)',
  MIXED: 'Mixed (Progressive Ladder)'
};

export const SCOPE_LABELS = {
  ALL: 'All Available Role Questions',
  UNATTEMPTED: 'Unattempted Questions Only',
  NEEDS_REVIEW: 'Questions Marked for Review',
  BOOKMARKED: 'Bookmarked Questions Only',
  ATTEMPTED: 'Re-practice Attempted Questions'
};

const CATEGORY_LOOKUP = {
  'ALL': 'ALL',
  'ALL CATEGORIES': 'ALL',
  'ALL CATEGORIES (COMPREHENSIVE PRACTICE)': 'ALL',
  'COMPREHENSIVE': 'ALL',
  'TECHNICAL': 'TECHNICAL',
  'TECHNICAL DEEP-DIVE': 'TECHNICAL',
  'TECHNICAL DEEP DIVE': 'TECHNICAL',
  'TECHNICAL_DEEP_DIVE': 'TECHNICAL',
  'HR': 'HR',
  'BEHAVIORAL': 'HR',
  'HR & BEHAVIORAL': 'HR',
  'HR & BEHAVIORAL (STAR)': 'HR',
  'CODING': 'CODING',
  'CODING ARENA': 'CODING',
  'CODING ARENA CHALLENGES': 'CODING',
  'ALGORITHMS': 'CODING',
  'SYSTEM_DESIGN': 'SYSTEM_DESIGN',
  'SYSTEM DESIGN': 'SYSTEM_DESIGN',
  'SYSTEM DESIGN & ARCHITECTURE': 'SYSTEM_DESIGN',
  'ARCHITECTURE': 'SYSTEM_DESIGN',
  'SCENARIO': 'SCENARIO',
  'SCENARIO & INCIDENT TRIAGE': 'SCENARIO',
  'INCIDENT TRIAGE': 'SCENARIO'
};

const DIFFICULTY_LOOKUP = {
  'EASY': 'EASY',
  'EASY (CORE FOUNDATIONS)': 'EASY',
  'CORE FOUNDATIONS': 'EASY',
  'FOUNDATIONS': 'EASY',
  'MEDIUM': 'MEDIUM',
  'MEDIUM (BALANCED STANDARDS)': 'MEDIUM',
  'BALANCED': 'MEDIUM',
  'BALANCED STANDARDS': 'MEDIUM',
  'HARD': 'HARD',
  'HARD (ADVANCED / SENIOR BAR)': 'HARD',
  'ADVANCED': 'HARD',
  'SENIOR BAR': 'HARD',
  'EXPERT': 'EXPERT',
  'EXPERT (STAFF / PRINCIPAL LEVEL)': 'EXPERT',
  'STAFF': 'EXPERT',
  'PRINCIPAL': 'EXPERT',
  'MIXED': 'MIXED',
  'MIXED (PROGRESSIVE LADDER)': 'MIXED',
  'PROGRESSIVE LADDER': 'MIXED',
  'ALL': 'MIXED',
  'ANY': 'MIXED'
};

const SCOPE_LOOKUP = {
  'ALL': 'ALL',
  'ALL AVAILABLE ROLE QUESTIONS': 'ALL',
  'ALL_ROLE_QUESTIONS': 'ALL',
  'ALL AVAILABLE': 'ALL',
  'UNATTEMPTED': 'UNATTEMPTED',
  'UNATTEMPTED QUESTIONS ONLY': 'UNATTEMPTED',
  'UNATTEMPTED ONLY': 'UNATTEMPTED',
  'NEEDS_REVIEW': 'NEEDS_REVIEW',
  'QUESTIONS MARKED FOR REVIEW': 'NEEDS_REVIEW',
  'MARKED FOR REVIEW': 'NEEDS_REVIEW',
  'REVIEW': 'NEEDS_REVIEW',
  'BOOKMARKED': 'BOOKMARKED',
  'BOOKMARKED QUESTIONS ONLY': 'BOOKMARKED',
  'BOOKMARKED ONLY': 'BOOKMARKED',
  'ATTEMPTED': 'ATTEMPTED',
  'RE-PRACTICE ATTEMPTED QUESTIONS': 'ATTEMPTED',
  'RE-PRACTICE': 'ATTEMPTED',
  'ATTEMPTED ONLY': 'ATTEMPTED'
};

/**
 * Normalizes any category string (enum key, lowercase, or UI label) to canonical enum string
 */
export function normalizeCategory(val) {
  if (!val || typeof val !== 'string') return 'ALL';
  const clean = val.trim().toUpperCase();
  return CATEGORY_LOOKUP[clean] || 'ALL';
}

/**
 * Normalizes any difficulty string (enum key, lowercase, or UI label) to canonical enum string
 */
export function normalizeDifficulty(val) {
  if (!val || typeof val !== 'string') return 'MEDIUM';
  const clean = val.trim().toUpperCase();
  return DIFFICULTY_LOOKUP[clean] || 'MEDIUM';
}

/**
 * Normalizes question scope filter
 */
export function normalizeScope(val) {
  if (!val || typeof val !== 'string') return 'ALL';
  const clean = val.trim().toUpperCase();
  return SCOPE_LOOKUP[clean] || 'ALL';
}

/**
 * Returns clean human-readable category label
 */
export function getCategoryLabel(category) {
  const norm = normalizeCategory(category);
  return CATEGORY_LABELS[norm] || 'All Categories';
}

/**
 * Returns clean human-readable difficulty label
 */
export function getDifficultyLabel(difficulty) {
  const norm = normalizeDifficulty(difficulty);
  return DIFFICULTY_LABELS[norm] || 'Medium';
}

/**
 * Returns clean human-readable scope label
 */
export function getScopeLabel(scope) {
  const norm = normalizeScope(scope);
  return SCOPE_LABELS[norm] || 'All Available Role Questions';
}

