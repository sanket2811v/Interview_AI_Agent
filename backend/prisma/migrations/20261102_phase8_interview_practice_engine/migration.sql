-- ==========================================
-- PHASE 8: INTERVIEW PRACTICE ENGINE MIGRATION
-- Safe non-destructive additive schema update
-- ==========================================

-- 1. Create PracticeSessionStatus enum if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PracticeSessionStatus') THEN
        CREATE TYPE "PracticeSessionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');
    END IF;
END $$;

-- 2. Add DRAFT to QuestionAttemptStatus enum safely
ALTER TYPE "QuestionAttemptStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- 3. Create practice_sessions table and alter question_attempts
DO $$ BEGIN
    -- Create practice_sessions table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'practice_sessions'
    ) THEN
        CREATE TABLE "practice_sessions" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "preparationSessionId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "selectedCategories" JSONB NOT NULL DEFAULT '[]',
            "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
            "totalQuestions" INTEGER NOT NULL DEFAULT 0,
            "attemptedQuestions" INTEGER NOT NULL DEFAULT 0,
            "completedQuestions" INTEGER NOT NULL DEFAULT 0,
            "skippedQuestions" INTEGER NOT NULL DEFAULT 0,
            "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
            "status" "PracticeSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
            "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "completedAt" TIMESTAMP(3),
            "durationSeconds" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "practice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "practice_sessions_preparationSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE INDEX "practice_sessions_userId_idx" ON "practice_sessions"("userId");
        CREATE INDEX "practice_sessions_preparationSessionId_idx" ON "practice_sessions"("preparationSessionId");
        CREATE INDEX "practice_sessions_status_idx" ON "practice_sessions"("status");
        CREATE INDEX "practice_sessions_userId_status_idx" ON "practice_sessions"("userId", "status");
        CREATE INDEX "practice_sessions_userId_createdAt_idx" ON "practice_sessions"("userId", "createdAt");
    END IF;

    -- 4. Add new columns to question_attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'practiceSessionId') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "practiceSessionId" TEXT;
        ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_practiceSessionId_fkey" FOREIGN KEY ("practiceSessionId") REFERENCES "practice_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX "question_attempts_practiceSessionId_idx" ON "question_attempts"("practiceSessionId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'attemptNumber') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'answerFormat') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "answerFormat" TEXT NOT NULL DEFAULT 'TEXT';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'revealedHints') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "revealedHints" JSONB NOT NULL DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'isBookmarked') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "isBookmarked" BOOLEAN NOT NULL DEFAULT false;
        CREATE INDEX "question_attempts_userId_isBookmarked_idx" ON "question_attempts"("userId", "isBookmarked");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'needsReview') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
        CREATE INDEX "question_attempts_userId_needsReview_idx" ON "question_attempts"("userId", "needsReview");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'selfRating') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "selfRating" INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'personalNotes') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "personalNotes" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'draftSavedAt') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "draftSavedAt" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_attempts' AND column_name = 'submittedAt') THEN
        ALTER TABLE "question_attempts" ADD COLUMN "submittedAt" TIMESTAMP(3);
    END IF;
END $$;
