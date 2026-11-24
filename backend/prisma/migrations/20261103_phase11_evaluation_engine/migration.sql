-- Migration: 20261103_phase11_evaluation_engine
-- Additive migration for Phase 11 AI Evaluation, Answer Analysis & Performance Reporting Engine

-- 1. Extend interview_evaluations table
ALTER TABLE "interview_evaluations"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'MOCK_INTERVIEW',
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "questionAttemptId" TEXT,
  ADD COLUMN IF NOT EXISTS "codingSubmissionId" TEXT,
  ADD COLUMN IF NOT EXISTS "classification" TEXT,
  ADD COLUMN IF NOT EXISTS "rubricVersion" TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS "evaluationStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "criterionScores" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "missingConcepts" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "improvementSuggestions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "improvedAnswer" TEXT,
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "limitations" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make mockInterviewId nullable for standalone question attempt & coding evaluations
ALTER TABLE "interview_evaluations" ALTER COLUMN "mockInterviewId" DROP NOT NULL;
ALTER TABLE "interview_evaluations" ALTER COLUMN "technicalAccuracy" DROP NOT NULL;
ALTER TABLE "interview_evaluations" ALTER COLUMN "communicationScore" DROP NOT NULL;
ALTER TABLE "interview_evaluations" ALTER COLUMN "problemSolvingScore" DROP NOT NULL;
ALTER TABLE "interview_evaluations" ALTER COLUMN "completenessScore" DROP NOT NULL;

-- Add foreign key constraint for userId if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interview_evaluations_userId_fkey'
  ) THEN
    ALTER TABLE "interview_evaluations"
      ADD CONSTRAINT "interview_evaluations_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for interview_evaluations
CREATE INDEX IF NOT EXISTS "interview_evaluations_userId_idx" ON "interview_evaluations"("userId");
CREATE INDEX IF NOT EXISTS "interview_evaluations_sourceType_idx" ON "interview_evaluations"("sourceType");
CREATE INDEX IF NOT EXISTS "interview_evaluations_sourceId_idx" ON "interview_evaluations"("sourceId");
CREATE INDEX IF NOT EXISTS "interview_evaluations_questionAttemptId_idx" ON "interview_evaluations"("questionAttemptId");
CREATE INDEX IF NOT EXISTS "interview_evaluations_codingSubmissionId_idx" ON "interview_evaluations"("codingSubmissionId");
CREATE INDEX IF NOT EXISTS "interview_evaluations_evaluatedAt_idx" ON "interview_evaluations"("evaluatedAt");

-- 2. Create performance_reports table
CREATE TABLE IF NOT EXISTS "performance_reports" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preparationSessionId" TEXT,
  "reportType" TEXT NOT NULL DEFAULT 'COMPREHENSIVE',
  "title" TEXT NOT NULL,
  "overallScore" INTEGER NOT NULL DEFAULT 0,
  "classification" TEXT DEFAULT 'Good',
  "categoryScores" JSONB NOT NULL DEFAULT '{}',
  "skillScores" JSONB NOT NULL DEFAULT '{}',
  "summary" TEXT,
  "strengths" JSONB NOT NULL DEFAULT '[]',
  "weaknesses" JSONB NOT NULL DEFAULT '[]',
  "recommendations" JSONB NOT NULL DEFAULT '[]',
  "evaluationCount" INTEGER NOT NULL DEFAULT 0,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "performance_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "performance_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "performance_reports_preparationSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "performance_reports_userId_idx" ON "performance_reports"("userId");
CREATE INDEX IF NOT EXISTS "performance_reports_preparationSessionId_idx" ON "performance_reports"("preparationSessionId");
CREATE INDEX IF NOT EXISTS "performance_reports_generatedAt_idx" ON "performance_reports"("generatedAt");

-- 3. Create improvement_recommendations table
CREATE TABLE IF NOT EXISTS "improvement_recommendations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "evaluationId" TEXT,
  "skill" TEXT NOT NULL,
  "weakness" TEXT NOT NULL,
  "whyItMatters" TEXT,
  "recommendedAction" TEXT NOT NULL,
  "practiceActivity" TEXT,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "improvement_recommendations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "improvement_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "improvement_recommendations_userId_idx" ON "improvement_recommendations"("userId");
CREATE INDEX IF NOT EXISTS "improvement_recommendations_status_idx" ON "improvement_recommendations"("status");

