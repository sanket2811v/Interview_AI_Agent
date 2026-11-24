-- Phase 10: AI Mock Interview Engine
-- Safe additive migration for MockInterview and InterviewMessage

-- 1. Extend Enums safely
ALTER TYPE "InterviewType" ADD VALUE IF NOT EXISTS 'SCENARIO';
ALTER TYPE "MockInterviewStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "MockInterviewStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';
ALTER TYPE "MockInterviewStatus" ADD VALUE IF NOT EXISTS 'FAILED';

ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'INTRODUCTION';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'MAIN_QUESTION';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'FOLLOW_UP';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'ANSWER';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'CLARIFICATION';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'HINT';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'CLOSING';

-- 2. Add columns to mock_interviews
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'AI Mock Interview';
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'MID';
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "questionLimit" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "interviewerPersonality" TEXT NOT NULL DEFAULT 'Professional';
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'English';
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "preferences" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "totalQuestions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "resumedAt" TIMESTAMP(3);
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "mock_interviews" ADD COLUMN IF NOT EXISTS "contextSummary" TEXT;

-- 3. Add indices to mock_interviews
CREATE INDEX IF NOT EXISTS "mock_interviews_userId_createdAt_idx" ON "mock_interviews"("userId", "createdAt");

-- 4. Add columns to interview_messages
ALTER TABLE "interview_messages" ADD COLUMN IF NOT EXISTS "questionId" TEXT;
ALTER TABLE "interview_messages" ADD COLUMN IF NOT EXISTS "parentMessageId" TEXT;

-- 5. Add indices to interview_messages
CREATE INDEX IF NOT EXISTS "interview_messages_mockInterviewId_sequenceNumber_idx" ON "interview_messages"("mockInterviewId", "sequenceNumber");

