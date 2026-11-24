-- ==========================================
-- PHASE 5: JOB PREPARATION MANAGEMENT MIGRATION
-- Safe non-destructive additive schema update
-- ==========================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'preparation_sessions' AND column_name = 'location'
    ) THEN
        ALTER TABLE "preparation_sessions" ADD COLUMN "location" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'preparation_sessions' AND column_name = 'yearsOfExperience'
    ) THEN
        ALTER TABLE "preparation_sessions" ADD COLUMN "yearsOfExperience" INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'preparation_sessions' AND column_name = 'preferences'
    ) THEN
        ALTER TABLE "preparation_sessions" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_descriptions' AND column_name = 'fileSize'
    ) THEN
        ALTER TABLE "job_descriptions" ADD COLUMN "fileSize" INTEGER;
    END IF;
END $$;

