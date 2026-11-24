import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_MIGRATIONS, ensureSchemaSynchronized, splitSqlStatements } from '../src/config/schemaGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../prisma/migrations');

describe('Database Schema & Prisma Migration Integrity', () => {
  it('1. Canonical migrations list covers all 8 phases in strict chronological order', () => {
    assert.equal(PROJECT_MIGRATIONS.length, 8);
    assert.deepEqual(PROJECT_MIGRATIONS, [
      '20261102_init_auth',
      '20261102_phase4_complete_database',
      '20261102_phase5_job_prep',
      '20261102_phase8_interview_practice_engine',
      '20261103_phase9_coding_engine',
      '20261103_phase10_mock_interview_engine',
      '20261103_phase11_evaluation_engine',
      '20261103_phase12_analytics_and_improvement_plan'
    ]);
  });

  it('2. Every migration folder exists and contains non-empty migration.sql', () => {
    for (const folder of PROJECT_MIGRATIONS) {
      const sqlPath = path.join(migrationsDir, folder, 'migration.sql');
      assert.ok(fs.existsSync(sqlPath), `Missing migration.sql for ${folder}`);
      const content = fs.readFileSync(sqlPath, 'utf8');
      assert.ok(content.length > 10, `migration.sql for ${folder} is unexpectedly empty`);
    }
  });

  it('3. Phase 8 migration defines practice_sessions table and practiceSessionId in question_attempts', () => {
    const p8Sql = fs.readFileSync(
      path.join(migrationsDir, '20261102_phase8_interview_practice_engine', 'migration.sql'),
      'utf8'
    );
    assert.ok(p8Sql.includes('practice_sessions'), 'Phase 8 must declare practice_sessions');
    assert.ok(p8Sql.includes('practiceSessionId'), 'Phase 8 must alter question_attempts with practiceSessionId');
    assert.ok(p8Sql.includes('PracticeSessionStatus'), 'Phase 8 must create PracticeSessionStatus enum');
  });

  it('4. Phase 9 migration defines coding_challenges.questionId and coding_submissions relations', () => {
    const p9Sql = fs.readFileSync(
      path.join(migrationsDir, '20261103_phase9_coding_engine', 'migration.sql'),
      'utf8'
    );
    assert.ok(p9Sql.includes('questionId'), 'Phase 9 must add questionId to coding_challenges');
    assert.ok(p9Sql.includes('practiceSessionId'), 'Phase 9 must add practiceSessionId to coding_submissions');
  });

  it('5. Phase 11 migration defines interview_evaluations.classification and performance_reports', () => {
    const p11Sql = fs.readFileSync(
      path.join(migrationsDir, '20261103_phase11_evaluation_engine', 'migration.sql'),
      'utf8'
    );
    assert.ok(p11Sql.includes('classification'), 'Phase 11 must add classification column');
    assert.ok(p11Sql.includes('performance_reports'), 'Phase 11 must create performance_reports table');
  });

  it('6. ensureSchemaSynchronized handles mock client and records all pending migrations', async () => {
    const executedRaw = [];
    const queryMap = {
      _prisma_migrations: [],
      tables: [],
      columns: []
    };

    const mockPrisma = {
      $queryRaw: async () => [{ '?column?': 1 }],
      $executeRawUnsafe: async (sql, ...args) => {
        executedRaw.push({ sql, args });
        return 1;
      },
      $queryRawUnsafe: async (sql, ...args) => {
        if (sql.includes('FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL')) {
          // Simulate only first 3 migrations are applied initially
          return [
            { migration_name: '20261102_init_auth' },
            { migration_name: '20261102_phase4_complete_database' },
            { migration_name: '20261102_phase5_job_prep' }
          ];
        }
        if (sql.includes('information_schema.tables')) {
          return [];
        }
        if (sql.includes('information_schema.columns')) {
          return [];
        }
        if (sql.includes('SELECT "id" FROM "_prisma_migrations" WHERE "migration_name" = $1')) {
          return [];
        }
        return [];
      }
    };

    const res = await ensureSchemaSynchronized(mockPrisma);
    assert.equal(res.success, true);
    assert.equal(res.applied.length, 5);
    assert.ok(res.applied.includes('20261102_phase8_interview_practice_engine'));
    assert.ok(res.applied.includes('20261103_phase9_coding_engine'));
    assert.ok(res.applied.includes('20261103_phase10_mock_interview_engine'));
    assert.ok(res.applied.includes('20261103_phase11_evaluation_engine'));
    assert.ok(res.applied.includes('20261103_phase12_analytics_and_improvement_plan'));
  });

  it('7. ensureSchemaSynchronized auto-reconciles failed migrations to clear P3009', async () => {
    const rolledBackIds = [];
    const mockPrisma = {
      $queryRaw: async () => [{ '?column?': 1 }],
      $executeRawUnsafe: async (sql, ...args) => {
        if (sql.includes('UPDATE "_prisma_migrations"') && sql.includes('SET "rolled_back_at" = now()')) {
          rolledBackIds.push(args[0]);
        }
        return 1;
      },
      $queryRawUnsafe: async (sql) => {
        if (sql.includes('WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL')) {
          return [{ id: 'failed-mig-uuid', migration_name: '20261102_phase8_interview_practice_engine' }];
        }
        if (sql.includes('WHERE "finished_at" IS NOT NULL')) {
          return [{ migration_name: '20261102_init_auth' }];
        }
        return [];
      }
    };

    const res = await ensureSchemaSynchronized(mockPrisma);
    assert.equal(res.success, true);
    assert.deepEqual(rolledBackIds, ['failed-mig-uuid']);
  });

  it('8. splitSqlStatements correctly parses multi-command SQL without breaking DO $$ blocks', () => {
    const p8Sql = fs.readFileSync(
      path.join(migrationsDir, '20261102_phase8_interview_practice_engine', 'migration.sql'),
      'utf8'
    );
    const statements = splitSqlStatements(p8Sql);
    assert.equal(statements.length, 3, 'Phase 8 should parse into exactly 3 statements');
    assert.ok(statements[0].startsWith('DO $$'), 'Statement 1 should be DO block');
    assert.ok(statements[1].startsWith('ALTER TYPE'), 'Statement 2 should be ALTER TYPE');
    assert.ok(statements[2].startsWith('DO $$'), 'Statement 3 should be DO block');
  });
});

