-- Phase 9: Online Coding Practice and Secure Code Execution Engine
-- Safe additive migration for CodingChallenge, CodingTestCase, and CodingSubmission

-- 1. Add INTERNAL_ERROR to CodingExecutionStatus enum safely
ALTER TYPE "CodingExecutionStatus" ADD VALUE IF NOT EXISTS 'INTERNAL_ERROR';

-- 2. Add additive fields to coding_challenges
ALTER TABLE "coding_challenges" ADD COLUMN IF NOT EXISTS "questionId" TEXT;
ALTER TABLE "coding_challenges" ADD COLUMN IF NOT EXISTS "problemStatement" TEXT;
ALTER TABLE "coding_challenges" ADD COLUMN IF NOT EXISTS "inputFormat" TEXT;
ALTER TABLE "coding_challenges" ADD COLUMN IF NOT EXISTS "outputFormat" TEXT;
ALTER TABLE "coding_challenges" ADD COLUMN IF NOT EXISTS "explanation" TEXT;

-- 3. Add indices to coding_challenges
CREATE INDEX IF NOT EXISTS "coding_challenges_questionId_idx" ON "coding_challenges"("questionId");

-- 4. Add additive fields to coding_test_cases
ALTER TABLE "coding_test_cases" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "coding_test_cases_challengeId_isSample_idx" ON "coding_test_cases"("challengeId", "isSample");

-- 5. Add additive fields and foreign keys to coding_submissions
ALTER TABLE "coding_submissions" ADD COLUMN IF NOT EXISTS "practiceSessionId" TEXT;
ALTER TABLE "coding_submissions" ADD COLUMN IF NOT EXISTS "compilationError" TEXT;
ALTER TABLE "coding_submissions" ADD COLUMN IF NOT EXISTS "runtimeError" TEXT;
ALTER TABLE "coding_submissions" ADD COLUMN IF NOT EXISTS "testResults" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "coding_submissions" ADD COLUMN IF NOT EXISTS "providerSubmissionId" TEXT;
ALTER TABLE "coding_submissions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 6. Add indices to coding_submissions
CREATE INDEX IF NOT EXISTS "coding_submissions_practiceSessionId_idx" ON "coding_submissions"("practiceSessionId");

-- 7. Add foreign key relation from coding_submissions to practice_sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coding_submissions_practiceSessionId_fkey'
  ) THEN
    ALTER TABLE "coding_submissions" 
      ADD CONSTRAINT "coding_submissions_practiceSessionId_fkey" 
      FOREIGN KEY ("practiceSessionId") REFERENCES "practice_sessions"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

