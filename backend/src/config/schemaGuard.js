import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../prisma/migrations');

// Canonical list of project migrations in execution order
export const PROJECT_MIGRATIONS = [
  '20261102_init_auth',
  '20261102_phase4_complete_database',
  '20261102_phase5_job_prep',
  '20261102_phase8_interview_practice_engine',
  '20261103_phase9_coding_engine',
  '20261103_phase10_mock_interview_engine',
  '20261103_phase11_evaluation_engine',
  '20261103_phase12_analytics_and_improvement_plan'
];

/**
 * Splits a multi-command SQL script into individual statements safely.
 * Respects PL/pgSQL dollar quotes ($$ ... $$), string literals ('...'), and comments.
 * Prevents PostgreSQL error 42601: "cannot insert multiple commands into a prepared statement".
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // Handle line comments (-- ...)
    if (!inDollarQuote && !inSingleQuote && !inBlockComment && char === '-' && nextChar === '-') {
      inLineComment = true;
    }
    if (inLineComment && (char === '\n' || char === '\r')) {
      inLineComment = false;
    }

    // Handle block comments (/* ... */)
    if (!inDollarQuote && !inSingleQuote && !inLineComment && char === '/' && nextChar === '*') {
      inBlockComment = true;
    }
    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      current += '*/';
      i++;
      continue;
    }

    // Handle dollar quotes ($$ ... $$)
    if (!inSingleQuote && !inLineComment && !inBlockComment && char === '$' && nextChar === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i++;
      continue;
    }

    // Handle single quotes (' ... ')
    if (!inDollarQuote && !inLineComment && !inBlockComment && char === "'") {
      if (nextChar === "'") {
        current += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    }

    // Check for statement terminator ; outside quotes and comments
    if (!inDollarQuote && !inSingleQuote && !inLineComment && !inBlockComment && char === ';') {
      const cleaned = current.replace(/^(\s*(--[^\n]*|\/\*[\s\S]*?\*\/)\s*)+/g, '').trim();
      if (cleaned) {
        statements.push(cleaned);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const cleaned = current.replace(/^(\s*(--[^\n]*|\/\*[\s\S]*?\*\/)\s*)+/g, '').trim();
  if (cleaned) {
    statements.push(cleaned);
  }

  return statements;
}

/**
 * Verifies and synchronizes PostgreSQL database schema with Prisma migrations.
 * Idempotently executes any pending migrations and records them in _prisma_migrations.
 *
 * @param {import('../generated/prisma-client').PrismaClient} prisma
 * @returns {Promise<{ success: boolean, applied: string[], message?: string, error?: string }>}
 */
export async function ensureSchemaSynchronized(prisma) {
  const applied = [];
  try {
    // 1. Connectivity probe
    await prisma.$queryRaw`SELECT 1`;

    // 2. Ensure _prisma_migrations table exists (standard Prisma migrations schema)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 2b. Auto-resolve any failed migrations (finished_at IS NULL and rolled_back_at IS NULL)
    // This immediately eliminates Prisma P3009 blockages
    const failedRows = await prisma.$queryRawUnsafe(`
      SELECT "id", "migration_name" FROM "_prisma_migrations" 
      WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
    `);

    if (Array.isArray(failedRows) && failedRows.length > 0) {
      for (const failed of failedRows) {
        logger.warn(`Auto-resolving failed migration in _prisma_migrations to clear P3009: ${failed.migration_name}`);
        await prisma.$executeRawUnsafe(
          `UPDATE "_prisma_migrations" 
           SET "rolled_back_at" = now() 
           WHERE "id" = $1`,
          failed.id
        );
      }
    }

    // 3. Query existing applied migrations
    const recordedRows = await prisma.$queryRawUnsafe(`
      SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL
    `);
    const recordedSet = new Set((recordedRows || []).map((r) => r.migration_name));

    // 4. Verify core schema indicators to detect schema drift even if migrations were partially recorded
    const tablesCheck = await prisma.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('practice_sessions', 'performance_reports', 'improvement_recommendations')
    `);
    const existingTables = new Set((tablesCheck || []).map((t) => t.table_name));

    const columnsCheck = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (
        (table_name = 'coding_challenges' AND column_name = 'questionId') OR
        (table_name = 'interview_evaluations' AND column_name = 'classification') OR
        (table_name = 'learning_tasks' AND column_name = 'skillName')
      )
    `);
    const existingCols = new Set((columnsCheck || []).map((c) => `${c.table_name}.${c.column_name}`));

    for (const migrationName of PROJECT_MIGRATIONS) {
      const sqlFilePath = path.join(migrationsDir, migrationName, 'migration.sql');
      if (!fs.existsSync(sqlFilePath)) {
        continue;
      }

      // Check whether migration needs to be executed
      let needsExecution = !recordedSet.has(migrationName);

      // Explicit schema drift checks:
      if (migrationName === '20261102_phase8_interview_practice_engine' && !existingTables.has('practice_sessions')) {
        needsExecution = true;
      }
      if (migrationName === '20261103_phase9_coding_engine' && !existingCols.has('coding_challenges.questionId')) {
        needsExecution = true;
      }
      if (migrationName === '20261103_phase11_evaluation_engine' && (!existingCols.has('interview_evaluations.classification') || !existingTables.has('performance_reports'))) {
        needsExecution = true;
      }
      if (migrationName === '20261103_phase12_analytics_and_improvement_plan' && !existingCols.has('learning_tasks.skillName')) {
        needsExecution = true;
      }

      if (needsExecution) {
        logger.info(`Synchronizing database schema: applying ${migrationName}...`);
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        const checksum = crypto.createHash('sha256').update(sql).digest('hex');
        const migrationId = crypto.randomUUID();

        // Safe execution of migration SQL command by command to prevent PostgreSQL 42601 prepared statement error
        const statements = splitSqlStatements(sql);
        for (const stmt of statements) {
          if (stmt.trim()) {
            await prisma.$executeRawUnsafe(stmt);
          }
        }

        // Record or update in _prisma_migrations
        const existingRecord = await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "_prisma_migrations" WHERE "migration_name" = $1 LIMIT 1`,
          migrationName
        );

        if (Array.isArray(existingRecord) && existingRecord.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE "_prisma_migrations" 
             SET "finished_at" = now(), "applied_steps_count" = 1, "checksum" = $2
             WHERE "migration_name" = $1`,
            migrationName,
            checksum
          );
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
             VALUES ($1, $2, $3, now(), now(), 1)`,
            migrationId,
            checksum,
            migrationName
          );
        }

        recordedSet.add(migrationName);
        applied.push(migrationName);
        logger.info(`Schema synchronization: ${migrationName} verified and applied successfully.`);
      }
    }

    if (applied.length > 0) {
      logger.info(`Database schema synchronization complete. Applied ${applied.length} pending migrations.`, { applied });
    } else {
      logger.info('Database schema is fully synchronized with all Prisma migrations.');
    }

    return {
      success: true,
      applied,
      message: `Schema synchronized. ${applied.length} migrations verified.`
    };
  } catch (error) {
    logger.error('Failed to verify/synchronize database schema with Prisma migrations', {
      message: error.message,
      code: error.code
    });
    return {
      success: false,
      applied,
      error: error.message
    };
  }
}

