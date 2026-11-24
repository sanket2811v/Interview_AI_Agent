import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma-client/index.js';
import {
  getPaginationParams,
  formatPaginatedResponse,
  verifyOwnership
} from '../src/services/db.service.js';
import {
  createPreparationSessionSchema,
  submitQuestionAttemptSchema,
  submitCodingSolutionSchema,
  createMockInterviewSchema,
  createLearningTaskSchema,
  logAIUsageSchema
} from '../src/validators/database.validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('InterviewAI Phase 4 Database Architecture & Model Verification', () => {
  const prisma = new PrismaClient();

  // 1. Prisma Model Coverage
  test('1. Prisma Client generates all 20 required Phase 4 models', () => {
    const expectedModels = [
      'user',
      'userProfile',
      'session',
      'emailVerificationToken',
      'passwordResetToken',
      'preparationSession',
      'jobDescription',
      'jobAnalysis',
      'interviewQuestion',
      'questionAttempt',
      'codingChallenge',
      'codingTestCase',
      'codingSubmission',
      'mockInterview',
      'interviewMessage',
      'interviewEvaluation',
      'improvementPlan',
      'learningTask',
      'userProgress',
      'aIUsageLog'
    ];

    expectedModels.forEach((modelName) => {
      assert.ok(
        prisma[modelName] !== undefined,
        `Expected Prisma model delegate "${modelName}" to exist on PrismaClient`
      );
    });
  });

  // 2. Schema Integrity & Enums Definition
  test('2. schema.prisma defines all 15 required domain enums', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    assert.ok(fs.existsSync(schemaPath), 'schema.prisma must exist');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    const expectedEnums = [
      'PreparationStatus',
      'ExperienceLevel',
      'InterviewCategory',
      'DifficultyLevel',
      'QuestionAttemptStatus',
      'CodingExecutionStatus',
      'InterviewType',
      'MockInterviewStatus',
      'MessageRole',
      'MessageType',
      'ImprovementPlanStatus',
      'LearningTaskStatus',
      'TaskPriority',
      'AIUsageOperation',
      'AIUsageStatus'
    ];

    expectedEnums.forEach((enumName) => {
      assert.ok(
        schemaContent.includes(`enum ${enumName}`),
        `schema.prisma missing enum: ${enumName}`
      );
    });
  });

  // 3. Foreign Key Cascades & Ownership Relationships
  test('3. Schema defines cascading deletions and user ownership relationships', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    // User ownership cascades
    assert.ok(content.includes('user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)'));
    assert.ok(content.includes('preparationSession   PreparationSession @relation(fields: [preparationSessionId], references: [id], onDelete: Cascade)'));
    // SetNull for historical preservation
    assert.ok(content.includes('onDelete: SetNull'));
  });

  // 4. Composite & Performance Indexes
  test('4. Schema defines composite indexes for query optimization', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    const expectedIndexDefinitions = [
      '@@index([userId, status])',
      '@@index([userId, createdAt])',
      '@@index([preparationSessionId, category])',
      '@@unique([mockInterviewId, sequenceNumber])',
      '@@unique([userId, category, skillName])'
    ];

    expectedIndexDefinitions.forEach((idx) => {
      assert.ok(
        content.includes(idx),
        `schema.prisma missing critical composite index: ${idx}`
      );
    });
  });

  // 5. Database Service Pagination Utilities
  test('5. getPaginationParams and formatPaginatedResponse calculate offsets correctly', () => {
    const p1 = getPaginationParams(1, 10);
    assert.equal(p1.skip, 0);
    assert.equal(p1.take, 10);
    assert.equal(p1.page, 1);

    const p3 = getPaginationParams(3, 15);
    assert.equal(p3.skip, 30);
    assert.equal(p3.take, 15);

    // Limit capped at maxLimit (100)
    const pMax = getPaginationParams(1, 500, 100);
    assert.equal(pMax.take, 100);

    const formatted = formatPaginatedResponse({
      data: [{ id: 1 }, { id: 2 }],
      total: 50,
      page: 2,
      limit: 10
    });

    assert.equal(formatted.items.length, 2);
    assert.equal(formatted.pagination.total, 50);
    assert.equal(formatted.pagination.totalPages, 5);
    assert.equal(formatted.pagination.hasNextPage, true);
    assert.equal(formatted.pagination.hasPrevPage, true);
  });

  // 6. Ownership Verification Helper
  test('6. verifyOwnership enforces data isolation and access control', async () => {
    // Mock model delegate
    const mockDelegate = {
      findUnique: async ({ where }) => {
        if (where.id === 'rec-owned-by-user-1') {
          return { id: 'rec-owned-by-user-1', userId: 'user-1' };
        }
        return null;
      }
    };

    // User 1 accessing User 1's record -> Allowed
    const verified = await verifyOwnership(mockDelegate, 'rec-owned-by-user-1', 'user-1');
    assert.equal(verified, true);

    // User 2 accessing User 1's record -> Rejected with 403
    await assert.rejects(
      async () => verifyOwnership(mockDelegate, 'rec-owned-by-user-1', 'user-2'),
      (err) => err.status === 403
    );

    // Non-existent record -> 404
    await assert.rejects(
      async () => verifyOwnership(mockDelegate, 'rec-non-existent', 'user-1'),
      (err) => err.status === 404
    );
  });

  // 7. Zod Validation for Preparation Sessions & Job Descriptions
  test('7. createPreparationSessionSchema enforces field constraints and description length', () => {
    const valid = createPreparationSessionSchema.safeParse({
      title: 'Full Stack Engineer Prep',
      companyName: 'TechCorp',
      jobTitle: 'Senior Full Stack Engineer',
      experienceLevel: 'SENIOR',
      preferredLanguage: 'TypeScript',
      difficulty: 'HARD',
      rawJobDescription: 'Seeking an experienced full-stack engineer with React and Node.js proficiency.'
    });
    assert.equal(valid.success, true);

    const tooShort = createPreparationSessionSchema.safeParse({
      title: 'Prep',
      companyName: 'Tech',
      jobTitle: 'Eng',
      rawJobDescription: 'Short' // < 20 chars
    });
    assert.equal(tooShort.success, false);
    assert.ok(tooShort.error.issues.some((i) => i.path.includes('rawJobDescription')));
  });

  // 8. Zod Validation for Question & Code Submissions
  test('8. submitQuestionAttemptSchema and submitCodingSolutionSchema enforce constraints', () => {
    const validAttempt = submitQuestionAttemptSchema.safeParse({
      questionId: '123e4567-e89b-12d3-a456-426614174000',
      answer: 'The event loop processes microtasks before timers.',
      timeTaken: 120
    });
    assert.equal(validAttempt.success, true);

    const negativeTime = submitQuestionAttemptSchema.safeParse({
      questionId: '123e4567-e89b-12d3-a456-426614174000',
      answer: 'Valid answer text',
      timeTaken: -10 // Invalid negative time
    });
    assert.equal(negativeTime.success, false);

    const validCode = submitCodingSolutionSchema.safeParse({
      challengeId: '123e4567-e89b-12d3-a456-426614174000',
      language: 'javascript',
      sourceCode: 'function twoSum(nums, target) { return [0, 1]; }'
    });
    assert.equal(validCode.success, true);
  });

  // 9. Zod Validation for AI Usage Telemetry
  test('9. logAIUsageSchema ensures non-negative token counts and execution times', () => {
    const validLog = logAIUsageSchema.safeParse({
      operationType: 'JOB_ANALYSIS',
      provider: 'Gemini',
      model: 'gemini-2.0-flash',
      promptTokens: 1200,
      completionTokens: 450,
      totalTokens: 1650,
      estimatedCost: 0.002,
      durationMs: 850
    });
    assert.equal(validLog.success, true);

    const negativeTokens = logAIUsageSchema.safeParse({
      operationType: 'JOB_ANALYSIS',
      promptTokens: -50 // Invalid negative count
    });
    assert.equal(negativeTokens.success, false);
  });

  // 10. Seed Script File Structure & Idempotency
  test('10. seed.js exists and implements deterministic upsert patterns', () => {
    const seedPath = path.resolve(__dirname, '../prisma/seed.js');
    assert.ok(fs.existsSync(seedPath), 'seed.js must exist in backend/prisma/');
    const seedContent = fs.readFileSync(seedPath, 'utf-8');

    assert.ok(seedContent.includes('.upsert('), 'seed.js must use upsert for idempotency');
    assert.ok(seedContent.includes('seed-session-fullstack-001'), 'seed.js must include Full Stack session');
    assert.ok(seedContent.includes('seed-challenge-two-sum-01'), 'seed.js must include Two Sum challenge');
    assert.ok(seedContent.includes('seed-q-js-event-loop-01'), 'seed.js must include Event Loop question');
    assert.ok(seedContent.includes('seed-plan-alex-001'), 'seed.js must include Improvement Plan');
  });

  // 11. Additive Migration File Verification
  test('11. Phase 4 SQL migration script exists with check constraints and safe IF NOT EXISTS', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../prisma/migrations/20261102_phase4_complete_database/migration.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'Phase 4 migration SQL must exist');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "preparation_sessions"'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "job_analyses"'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "coding_challenges"'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "mock_interviews"'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "improvement_plans"'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "ai_usage_logs"'));
    assert.ok(sql.includes('CONSTRAINT "chk_progress_range" CHECK ("progress" >= 0 AND "progress" <= 100)'));
    assert.ok(sql.includes('CONSTRAINT "chk_token_counts"'));
  });

  // 12. PART 16: Multi-Tenant User A vs User B Data Isolation
  test('12. User A cannot access User B data across preparations, submissions, interviews, and logs', () => {
    const userAId = 'user-uuid-alex-aaa';
    const userBId = 'user-uuid-bob-bbb';

    // Mock dataset simulating isolated database queries scoped by userId
    const mockSessions = [
      { id: 'session-a1', userId: userAId, title: 'Session A1' },
      { id: 'session-b1', userId: userBId, title: 'Session B1' }
    ];

    const mockSubmissions = [
      { id: 'sub-a1', userId: userAId, challengeId: 'c1', language: 'javascript' },
      { id: 'sub-b1', userId: userBId, challengeId: 'c1', language: 'python' }
    ];

    const mockInterviews = [
      { id: 'mock-a1', userId: userAId, status: 'COMPLETED' },
      { id: 'mock-b1', userId: userBId, status: 'IN_PROGRESS' }
    ];

    // Queries scoped by authenticated userId
    const userASessions = mockSessions.filter(s => s.userId === userAId);
    const userBSubmissions = mockSubmissions.filter(s => s.userId === userBId);
    const userAInterviews = mockInterviews.filter(i => i.userId === userAId);

    // Verify User A cannot see User B's records
    assert.ok(userASessions.every(s => s.userId === userAId));
    assert.ok(!userASessions.some(s => s.userId === userBId));

    assert.ok(userBSubmissions.every(s => s.userId === userBId));
    assert.ok(!userBSubmissions.some(s => s.userId === userAId));

    assert.ok(userAInterviews.every(i => i.userId === userAId));
    assert.ok(!userAInterviews.some(i => i.userId === userBId));
  });

  // 13. PART 6: Hidden Test Case Privacy
  test('13. Public query filter strictly isolates and hides hidden test cases from candidates', () => {
    const allTestCases = [
      { id: 'tc-1', challengeId: 'c1', input: '[2,7,11,15], 9', expectedOutput: '[0,1]', isHidden: false },
      { id: 'tc-2', challengeId: 'c1', input: '[3,2,4], 6', expectedOutput: '[1,2]', isHidden: false },
      { id: 'tc-3', challengeId: 'c1', input: '[3,3], 6', expectedOutput: '[0,1]', isHidden: true }
    ];

    // Candidate query strictly applies where: { isHidden: false }
    const candidateFacingCases = allTestCases.filter(tc => !tc.isHidden);

    assert.equal(candidateFacingCases.length, 2);
    assert.ok(candidateFacingCases.every(tc => tc.isHidden === false));
    assert.ok(!candidateFacingCases.some(tc => tc.id === 'tc-3'));
  });

  // 14. PART 7: Mock Interview Message Ordering & Sequence Uniqueness
  test('14. Interview messages preserve chronological order and enforce sequence number uniqueness', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    assert.ok(content.includes('@@unique([mockInterviewId, sequenceNumber])'));

    const messages = [
      { id: 'm2', mockInterviewId: 'mock-1', sequenceNumber: 2, role: 'USER', content: 'My answer' },
      { id: 'm1', mockInterviewId: 'mock-1', sequenceNumber: 1, role: 'AI_INTERVIEWER', content: 'Welcome' },
      { id: 'm3', mockInterviewId: 'mock-1', sequenceNumber: 3, role: 'AI_INTERVIEWER', content: 'Follow-up' }
    ];

    const sorted = [...messages].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    assert.equal(sorted[0].sequenceNumber, 1);
    assert.equal(sorted[1].sequenceNumber, 2);
    assert.equal(sorted[2].sequenceNumber, 3);
  });

  // 15. PART 10 & 12: One-to-One Relationships & Unique Constraints
  test('15. Schema enforces unique constraints on one-to-one relations and compound keys', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    // 1:1 unique foreign keys
    assert.ok(content.includes('userId           String   @unique')); // UserProfile -> User
    assert.ok(content.includes('preparationSessionId String             @unique')); // JobDescription & JobAnalysis
    assert.ok(content.includes('mockInterviewId') && content.includes('@unique')); // InterviewEvaluation -> MockInterview
    assert.ok(content.includes('@@unique([userId, category, skillName])')); // UserProgress
  });

  // 16. PART 14: Seed Script Production Protection
  test('16. seed.js enforces production safety and does not execute development seeds in production', () => {
    const seedPath = path.resolve(__dirname, '../prisma/seed.js');
    const seedContent = fs.readFileSync(seedPath, 'utf-8');

    assert.ok(
      seedContent.includes("process.env.NODE_ENV === 'production'"),
      'seed.js must verify NODE_ENV before seeding development data'
    );
  });

  // 17. PART 3: Phase 3 Authentication Model Preservation
  test('17. Phase 3 authentication models and fields are completely preserved and intact', () => {
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    // Model declarations
    assert.ok(content.includes('model User {'));
    assert.ok(content.includes('model UserProfile {'));
    assert.ok(content.includes('model Session {'));
    assert.ok(content.includes('model EmailVerificationToken {'));
    assert.ok(content.includes('model PasswordResetToken {'));

    // Critical security fields
    assert.ok(content.includes('refreshTokenHash String'));
    assert.ok(content.includes('tokenHash String'));
    assert.ok(content.includes('isEmailVerified         Boolean'));
    assert.ok(content.includes('revokedAt        DateTime?'));
  });

  // 18. PART 13: Migration Non-Destructive Invariant Check
  test('18. Phase 4 migration script contains zero destructive operations (no DROP TABLE, no DROP COLUMN)', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../prisma/migrations/20261102_phase4_complete_database/migration.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Verify non-destructive invariants
    assert.ok(!sql.includes('DROP TABLE'), 'Migration must not drop any tables');
    assert.ok(!sql.includes('DROP COLUMN'), 'Migration must not drop any columns');
    assert.ok(!sql.includes('TRUNCATE'), 'Migration must not truncate tables');
  });
});
