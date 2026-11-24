-- Phase 12: Analytics and Improvement Plan Engine Migration
-- Additive, safe migration

ALTER TABLE "improvement_plans" ADD COLUMN IF NOT EXISTS "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "improvement_plans" ADD COLUMN IF NOT EXISTS "targetSkills" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "improvement_plans" ADD COLUMN IF NOT EXISTS "identifiedWeaknesses" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "learning_tasks" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "learning_tasks" ADD COLUMN IF NOT EXISTS "preparationSessionId" TEXT;
ALTER TABLE "learning_tasks" ADD COLUMN IF NOT EXISTS "skillName" TEXT;
ALTER TABLE "learning_tasks" ADD COLUMN IF NOT EXISTS "resourceUrl" TEXT;

CREATE INDEX IF NOT EXISTS "learning_tasks_userId_idx" ON "learning_tasks"("userId");
CREATE INDEX IF NOT EXISTS "learning_tasks_skillName_idx" ON "learning_tasks"("skillName");

ALTER TABLE "user_progress" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DEVELOPING';
ALTER TABLE "user_progress" ADD COLUMN IF NOT EXISTS "lastAssessedDate" TIMESTAMP(3);

