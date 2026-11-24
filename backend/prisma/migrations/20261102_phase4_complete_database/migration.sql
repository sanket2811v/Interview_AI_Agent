-- ==========================================
-- PHASE 4: COMPLETE DATABASE MIGRATION SCRIPT
-- Non-destructive additive migration for PostgreSQL
-- ==========================================

-- 1. Create Enums if they do not exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PreparationStatus') THEN
        CREATE TYPE "PreparationStatus" AS ENUM ('DRAFT', 'ANALYZING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExperienceLevel') THEN
        CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewCategory') THEN
        CREATE TYPE "InterviewCategory" AS ENUM ('TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'COMPANY_SPECIFIC');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DifficultyLevel') THEN
        CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuestionAttemptStatus') THEN
        CREATE TYPE "QuestionAttemptStatus" AS ENUM ('SUBMITTED', 'EVALUATING', 'EVALUATED', 'SKIPPED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CodingExecutionStatus') THEN
        CREATE TYPE "CodingExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewType') THEN
        CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'MIXED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MockInterviewStatus') THEN
        CREATE TYPE "MockInterviewStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageRole') THEN
        CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageType') THEN
        CREATE TYPE "MessageType" AS ENUM ('TEXT', 'AUDIO', 'CODE', 'SYSTEM_EVENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ImprovementPlanStatus') THEN
        CREATE TYPE "ImprovementPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LearningTaskStatus') THEN
        CREATE TYPE "LearningTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
        CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIUsageOperation') THEN
        CREATE TYPE "AIUsageOperation" AS ENUM ('JOB_ANALYSIS', 'QUESTION_GENERATION', 'ANSWER_EVALUATION', 'MOCK_INTERVIEW', 'CODING_REVIEW', 'IMPROVEMENT_PLAN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIUsageStatus') THEN
        CREATE TYPE "AIUsageStatus" AS ENUM ('SUCCESS', 'FAILED', 'RATE_LIMITED', 'TIMEOUT');
    END IF;
END $$;

-- 2. Module B: Job Preparation Tables
CREATE TABLE IF NOT EXISTS "preparation_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'MID',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'JavaScript',
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "PreparationStatus" NOT NULL DEFAULT 'DRAFT',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "preparation_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_progress_range" CHECK ("progress" >= 0 AND "progress" <= 100)
);

CREATE TABLE IF NOT EXISTS "job_descriptions" (
    "id" TEXT NOT NULL,
    "preparationSessionId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'PASTED_TEXT',
    "originalFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job_analyses" (
    "id" TEXT NOT NULL,
    "preparationSessionId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT,
    "seniorityLevel" TEXT,
    "requiredExperience" TEXT,
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "requiredSkills" JSONB NOT NULL DEFAULT '[]',
    "preferredSkills" JSONB NOT NULL DEFAULT '[]',
    "technicalSkills" JSONB NOT NULL DEFAULT '[]',
    "softSkills" JSONB NOT NULL DEFAULT '[]',
    "technologies" JSONB NOT NULL DEFAULT '[]',
    "qualifications" JSONB NOT NULL DEFAULT '[]',
    "interviewDifficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "skillGapAnalysis" JSONB NOT NULL DEFAULT '{}',
    "rawAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_analyses_pkey" PRIMARY KEY ("id")
);

-- 3. Module C: Question Management Tables
CREATE TABLE IF NOT EXISTS "interview_questions" (
    "id" TEXT NOT NULL,
    "preparationSessionId" TEXT NOT NULL,
    "category" "InterviewCategory" NOT NULL DEFAULT 'TECHNICAL',
    "question" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "expectedConcepts" JSONB NOT NULL DEFAULT '[]',
    "hints" JSONB NOT NULL DEFAULT '[]',
    "referenceAnswer" TEXT,
    "explanation" TEXT,
    "estimatedTime" INTEGER NOT NULL DEFAULT 5,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_question_time" CHECK ("estimatedTime" > 0)
);

CREATE TABLE IF NOT EXISTS "question_attempts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" INTEGER,
    "feedback" TEXT,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "suggestedAnswer" TEXT,
    "timeTaken" INTEGER,
    "status" "QuestionAttemptStatus" NOT NULL DEFAULT 'SUBMITTED',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_attempt_score" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100)),
    CONSTRAINT "chk_attempt_time" CHECK ("timeTaken" IS NULL OR "timeTaken" >= 0)
);

-- 4. Module D: Coding Assessment Tables
CREATE TABLE IF NOT EXISTS "coding_challenges" (
    "id" TEXT NOT NULL,
    "preparationSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL DEFAULT 'Algorithms',
    "supportedLanguages" JSONB NOT NULL DEFAULT '["javascript", "python", "java", "cpp"]',
    "constraints" JSONB NOT NULL DEFAULT '[]',
    "sampleInput" TEXT,
    "sampleOutput" TEXT,
    "hints" JSONB NOT NULL DEFAULT '[]',
    "expectedTimeComplexity" TEXT,
    "expectedSpaceComplexity" TEXT,
    "timeLimit" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimit" INTEGER NOT NULL DEFAULT 128,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_coding_limits" CHECK ("timeLimit" > 0 AND "memoryLimit" > 0)
);

CREATE TABLE IF NOT EXISTS "coding_test_cases" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coding_test_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "coding_submissions" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "executionStatus" "CodingExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "testCasesPassed" INTEGER NOT NULL DEFAULT 0,
    "totalTestCases" INTEGER NOT NULL DEFAULT 0,
    "executionTime" INTEGER,
    "memoryUsed" INTEGER,
    "output" TEXT,
    "errorMessage" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_cases_passed" CHECK ("testCasesPassed" >= 0 AND "totalTestCases" >= 0)
);

-- 5. Module E: Mock Interview Tables
CREATE TABLE IF NOT EXISTS "mock_interviews" (
    "id" TEXT NOT NULL,
    "preparationSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interviewType" "InterviewType" NOT NULL DEFAULT 'TECHNICAL',
    "status" "MockInterviewStatus" NOT NULL DEFAULT 'CREATED',
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "overallScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_mock_score" CHECK ("overallScore" IS NULL OR ("overallScore" >= 0 AND "overallScore" <= 100)),
    CONSTRAINT "chk_mock_duration" CHECK ("duration" IS NULL OR "duration" >= 0)
);

CREATE TABLE IF NOT EXISTS "interview_messages" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "sequenceNumber" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_seq_number" CHECK ("sequenceNumber" >= 0)
);

CREATE TABLE IF NOT EXISTS "interview_evaluations" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "technicalAccuracy" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "problemSolvingScore" INTEGER NOT NULL,
    "completenessScore" INTEGER NOT NULL,
    "confidenceScore" INTEGER,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "detailedFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_evaluations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_eval_scores" CHECK (
        "overallScore" >= 0 AND "overallScore" <= 100 AND
        "technicalAccuracy" >= 0 AND "technicalAccuracy" <= 100 AND
        "communicationScore" >= 0 AND "communicationScore" <= 100 AND
        "problemSolvingScore" >= 0 AND "problemSolvingScore" <= 100 AND
        "completenessScore" >= 0 AND "completenessScore" <= 100 AND
        ("confidenceScore" IS NULL OR ("confidenceScore" >= 0 AND "confidenceScore" <= 100))
    )
);

-- 6. Module F: Learning and Improvement Tables
CREATE TABLE IF NOT EXISTS "improvement_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preparationSessionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ImprovementPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" TIMESTAMP(3),
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "improvement_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_plan_completion" CHECK ("completionPercentage" >= 0 AND "completionPercentage" <= 100)
);

CREATE TABLE IF NOT EXISTS "learning_tasks" (
    "id" TEXT NOT NULL,
    "improvementPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "LearningTaskStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_task_minutes" CHECK ("estimatedMinutes" > 0)
);

CREATE TABLE IF NOT EXISTS "user_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "InterviewCategory" NOT NULL DEFAULT 'TECHNICAL',
    "skillName" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "completedAttempts" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "proficiencyLevel" TEXT NOT NULL DEFAULT 'Beginner',
    "lastPracticedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_progress_attempts" CHECK ("totalAttempts" >= 0 AND "completedAttempts" >= 0),
    CONSTRAINT "chk_progress_avg" CHECK ("averageScore" >= 0.0 AND "averageScore" <= 100.0)
);

-- 7. Module G: AI Usage Tracking Table
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preparationSessionId" TEXT,
    "operationType" "AIUsageOperation" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'Gemini',
    "model" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "AIUsageStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorCode" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_token_counts" CHECK ("promptTokens" >= 0 AND "completionTokens" >= 0 AND "totalTokens" >= 0),
    CONSTRAINT "chk_cost_duration" CHECK ("estimatedCost" >= 0.0 AND "durationMs" >= 0)
);

-- 8. Unique Constraints & Composite Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "job_descriptions_preparationSessionId_key" ON "job_descriptions"("preparationSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "job_analyses_preparationSessionId_key" ON "job_analyses"("preparationSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "interview_messages_mockInterviewId_sequenceNumber_key" ON "interview_messages"("mockInterviewId", "sequenceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "interview_evaluations_mockInterviewId_key" ON "interview_evaluations"("mockInterviewId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_progress_userId_category_skillName_key" ON "user_progress"("userId", "category", "skillName");

CREATE INDEX IF NOT EXISTS "preparation_sessions_userId_idx" ON "preparation_sessions"("userId");
CREATE INDEX IF NOT EXISTS "preparation_sessions_status_idx" ON "preparation_sessions"("status");
CREATE INDEX IF NOT EXISTS "preparation_sessions_createdAt_idx" ON "preparation_sessions"("createdAt");
CREATE INDEX IF NOT EXISTS "preparation_sessions_userId_status_idx" ON "preparation_sessions"("userId", "status");
CREATE INDEX IF NOT EXISTS "preparation_sessions_userId_createdAt_idx" ON "preparation_sessions"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "interview_questions_preparationSessionId_idx" ON "interview_questions"("preparationSessionId");
CREATE INDEX IF NOT EXISTS "interview_questions_category_idx" ON "interview_questions"("category");
CREATE INDEX IF NOT EXISTS "interview_questions_difficulty_idx" ON "interview_questions"("difficulty");
CREATE INDEX IF NOT EXISTS "interview_questions_prep_category_idx" ON "interview_questions"("preparationSessionId", "category");

CREATE INDEX IF NOT EXISTS "question_attempts_userId_idx" ON "question_attempts"("userId");
CREATE INDEX IF NOT EXISTS "question_attempts_questionId_idx" ON "question_attempts"("questionId");
CREATE INDEX IF NOT EXISTS "question_attempts_attemptedAt_idx" ON "question_attempts"("attemptedAt");
CREATE INDEX IF NOT EXISTS "question_attempts_userId_questionId_idx" ON "question_attempts"("userId", "questionId");

CREATE INDEX IF NOT EXISTS "coding_challenges_preparationSessionId_idx" ON "coding_challenges"("preparationSessionId");
CREATE INDEX IF NOT EXISTS "coding_challenges_difficulty_idx" ON "coding_challenges"("difficulty");

CREATE INDEX IF NOT EXISTS "coding_test_cases_challengeId_idx" ON "coding_test_cases"("challengeId");
CREATE INDEX IF NOT EXISTS "coding_test_cases_challengeId_isHidden_idx" ON "coding_test_cases"("challengeId", "isHidden");

CREATE INDEX IF NOT EXISTS "coding_submissions_userId_idx" ON "coding_submissions"("userId");
CREATE INDEX IF NOT EXISTS "coding_submissions_challengeId_idx" ON "coding_submissions"("challengeId");
CREATE INDEX IF NOT EXISTS "coding_submissions_submittedAt_idx" ON "coding_submissions"("submittedAt");
CREATE INDEX IF NOT EXISTS "coding_submissions_userId_challengeId_idx" ON "coding_submissions"("userId", "challengeId");

CREATE INDEX IF NOT EXISTS "mock_interviews_userId_idx" ON "mock_interviews"("userId");
CREATE INDEX IF NOT EXISTS "mock_interviews_preparationSessionId_idx" ON "mock_interviews"("preparationSessionId");
CREATE INDEX IF NOT EXISTS "mock_interviews_status_idx" ON "mock_interviews"("status");
CREATE INDEX IF NOT EXISTS "mock_interviews_startedAt_idx" ON "mock_interviews"("startedAt");
CREATE INDEX IF NOT EXISTS "mock_interviews_userId_status_idx" ON "mock_interviews"("userId", "status");

CREATE INDEX IF NOT EXISTS "interview_messages_mockInterviewId_idx" ON "interview_messages"("mockInterviewId");

CREATE INDEX IF NOT EXISTS "improvement_plans_userId_idx" ON "improvement_plans"("userId");
CREATE INDEX IF NOT EXISTS "improvement_plans_status_idx" ON "improvement_plans"("status");
CREATE INDEX IF NOT EXISTS "improvement_plans_userId_status_idx" ON "improvement_plans"("userId", "status");

CREATE INDEX IF NOT EXISTS "learning_tasks_improvementPlanId_idx" ON "learning_tasks"("improvementPlanId");
CREATE INDEX IF NOT EXISTS "learning_tasks_status_idx" ON "learning_tasks"("status");
CREATE INDEX IF NOT EXISTS "learning_tasks_dueDate_idx" ON "learning_tasks"("dueDate");

CREATE INDEX IF NOT EXISTS "user_progress_userId_idx" ON "user_progress"("userId");

CREATE INDEX IF NOT EXISTS "ai_usage_logs_userId_idx" ON "ai_usage_logs"("userId");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_operationType_idx" ON "ai_usage_logs"("operationType");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_userId_createdAt_idx" ON "ai_usage_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_preparationSessionId_idx" ON "ai_usage_logs"("preparationSessionId");

-- 9. Foreign Key Constraints with safe existence checks
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prep_sessions_userId_fkey') THEN
        ALTER TABLE "preparation_sessions" ADD CONSTRAINT "prep_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_desc_prepSessionId_fkey') THEN
        ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_desc_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_analysis_prepSessionId_fkey') THEN
        ALTER TABLE "job_analyses" ADD CONSTRAINT "job_analysis_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_prepSessionId_fkey') THEN
        ALTER TABLE "interview_questions" ADD CONSTRAINT "questions_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attempts_questionId_fkey') THEN
        ALTER TABLE "question_attempts" ADD CONSTRAINT "attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attempts_userId_fkey') THEN
        ALTER TABLE "question_attempts" ADD CONSTRAINT "attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coding_challenges_prepSessionId_fkey') THEN
        ALTER TABLE "coding_challenges" ADD CONSTRAINT "coding_challenges_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coding_cases_challengeId_fkey') THEN
        ALTER TABLE "coding_test_cases" ADD CONSTRAINT "coding_cases_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "coding_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coding_sub_challengeId_fkey') THEN
        ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_sub_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "coding_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coding_sub_userId_fkey') THEN
        ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_sub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mock_prepSessionId_fkey') THEN
        ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mock_userId_fkey') THEN
        ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mock_msg_mockInterviewId_fkey') THEN
        ALTER TABLE "interview_messages" ADD CONSTRAINT "mock_msg_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "mock_interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mock_eval_mockInterviewId_fkey') THEN
        ALTER TABLE "interview_evaluations" ADD CONSTRAINT "mock_eval_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "mock_interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_userId_fkey') THEN
        ALTER TABLE "improvement_plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_prepSessionId_fkey') THEN
        ALTER TABLE "improvement_plans" ADD CONSTRAINT "plans_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_planId_fkey') THEN
        ALTER TABLE "learning_tasks" ADD CONSTRAINT "tasks_planId_fkey" FOREIGN KEY ("improvementPlanId") REFERENCES "improvement_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_userId_fkey') THEN
        ALTER TABLE "user_progress" ADD CONSTRAINT "progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_logs_userId_fkey') THEN
        ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_logs_prepSessionId_fkey') THEN
        ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_logs_prepSessionId_fkey" FOREIGN KEY ("preparationSessionId") REFERENCES "preparation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
