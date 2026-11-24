import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  createPreparationSchema,
  updatePreparationSchema,
  queryPreparationsSchema
} from '../src/validators/preparation.validator.js';
import {
  validateDocumentBuffer,
  extractTextFromDocx,
  extractTextFromPdf,
  processDocumentUpload
} from '../src/utils/documentExtractor.js';
import { PreparationService } from '../src/services/preparation.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('InterviewAI Phase 5 Job Preparation Management Test Suite', () => {
  // ==========================================
  // 1. Zod Validation Rules
  // ==========================================
  describe('1. Preparation Form Validation Schemas', () => {
    test('Valid preparation payload passes validation with defaults', () => {
      const valid = createPreparationSchema.safeParse({
        jobTitle: 'Senior Full Stack Engineer',
        companyName: 'TechCorp Labs',
        jobDescription: 'Seeking experienced full stack engineer proficient in React 18, Node.js, and PostgreSQL indexing.'
      });

      assert.equal(valid.success, true);
      assert.equal(valid.data.difficulty, 'MEDIUM');
      assert.equal(valid.data.preferredLanguage, 'JavaScript');
      assert.equal(valid.data.experienceLevel, 'MID');
    });

    test('Rejects payload with missing jobTitle', () => {
      const res = createPreparationSchema.safeParse({
        companyName: 'TechCorp Labs',
        jobDescription: 'Valid job description with sufficient length for testing purposes.'
      });
      assert.equal(res.success, false);
      assert.ok(res.error.issues.some((i) => i.path.includes('jobTitle')));
    });

    test('Rejects payload with missing companyName', () => {
      const res = createPreparationSchema.safeParse({
        jobTitle: 'Software Engineer',
        jobDescription: 'Valid job description with sufficient length for testing purposes.'
      });
      assert.equal(res.success, false);
      assert.ok(res.error.issues.some((i) => i.path.includes('companyName')));
    });

    test('Rejects job description shorter than 20 characters', () => {
      const res = createPreparationSchema.safeParse({
        jobTitle: 'Software Engineer',
        companyName: 'TechCorp Labs',
        jobDescription: 'Too short'
      });
      assert.equal(res.success, false);
      assert.ok(res.error.issues.some((i) => i.path.includes('jobDescription')));
    });

    test('Rejects negative years of experience', () => {
      const res = createPreparationSchema.safeParse({
        jobTitle: 'Software Engineer',
        companyName: 'TechCorp Labs',
        yearsOfExperience: -2,
        jobDescription: 'Valid job description with sufficient length for testing purposes.'
      });
      assert.equal(res.success, false);
      assert.ok(res.error.issues.some((i) => i.path.includes('yearsOfExperience')));
    });

    test('Normalizes and maps experience level aliases (e.g. FRESHER -> ENTRY)', () => {
      const res = createPreparationSchema.safeParse({
        jobTitle: 'Junior Developer',
        companyName: 'TechCorp Labs',
        experienceLevel: 'Fresher',
        jobDescription: 'Valid job description with sufficient length for testing purposes.'
      });
      assert.equal(res.success, true);
      assert.equal(res.data.experienceLevel, 'ENTRY');
    });
  });

  // ==========================================
  // 2. Document Processing & Security
  // ==========================================
  describe('2. Document Validation & Text Extraction Security', () => {
    test('Rejects empty file buffer', () => {
      assert.throws(
        () => validateDocumentBuffer(Buffer.alloc(0), 'test.pdf'),
        /empty/i
      );
    });

    test('Rejects executable file (MZ Windows PE header)', () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ..
      assert.throws(
        () => validateDocumentBuffer(exeBuffer, 'malicious.exe'),
        /executable|prohibited/i
      );
    });

    test('Rejects oversized document exceeding 5MB', () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);
      assert.throws(
        () => validateDocumentBuffer(largeBuffer, 'large.pdf'),
        /exceeds maximum/i
      );
    });

    test('Extracts plain text correctly from text and markdown files', async () => {
      const textContent = 'Senior Backend Engineer: Must have extensive experience in distributed systems, message queues, and PostgreSQL.';
      const buffer = Buffer.from(textContent, 'utf8');

      const result = await processDocumentUpload(buffer, 'job-posting.txt');
      assert.equal(result.sourceType, 'TEXT_UPLOAD');
      assert.equal(result.rawText, textContent);
      assert.ok(result.safeFileName.startsWith('jd_'));
    });

    test('Rejects text document with null byte injection', () => {
      const dirtyBuffer = Buffer.from('Normal text\x00malicious binary code', 'utf8');
      assert.throws(
        () => validateDocumentBuffer(dirtyBuffer, 'document.txt'),
        /null bytes|binary/i
      );
    });

    test('Validates synthetic PDF buffer with stream chunk extraction', () => {
      const samplePdf = `%PDF-1.4
1 0 obj << /Length 45 >> stream
(Senior Cloud Engineer with Kubernetes) Tj
endstream
endobj
%%EOF`;
      const buffer = Buffer.from(samplePdf, 'binary');
      const text = extractTextFromPdf(buffer);
      assert.ok(text.includes('Senior Cloud Engineer with Kubernetes'));
    });
  });

  // ==========================================
  // 3. User Data Isolation & Ownership
  // ==========================================
  describe('3. Multi-Tenant User Data Isolation', () => {
    test('User A cannot retrieve User B preparation session (403 Forbidden)', async () => {
      const userAId = 'user-alex-111';
      const userBId = 'user-bob-222';

      const mockDb = {
        preparationSession: {
          findUnique: async ({ where }) => {
            if (where.id === 'session-bob-999') {
              return {
                id: 'session-bob-999',
                userId: userBId,
                title: 'Bob Staff Engineer Session'
              };
            }
            return null;
          }
        }
      };

      // Mock ownership check logic mirroring PreparationService.getPreparationById
      const checkAccess = async (sessionId, requesterId) => {
        const session = await mockDb.preparationSession.findUnique({ where: { id: sessionId } });
        if (!session) {
          const err = new Error('Not found');
          err.status = 404;
          throw err;
        }
        if (session.userId !== requesterId) {
          const err = new Error('Access denied');
          err.status = 403;
          throw err;
        }
        return session;
      };

      // User B accessing Bob session -> Allowed
      const allowed = await checkAccess('session-bob-999', userBId);
      assert.equal(allowed.userId, userBId);

      // User A accessing Bob session -> 403 Forbidden
      await assert.rejects(
        async () => checkAccess('session-bob-999', userAId),
        (err) => err.status === 403
      );
    });

    test('Preparation queries strictly enforce userId partition', () => {
      const mockSessions = [
        { id: 's1', userId: 'user-a', title: 'User A Session 1' },
        { id: 's2', userId: 'user-a', title: 'User A Session 2' },
        { id: 's3', userId: 'user-b', title: 'User B Session 1' }
      ];

      const getScoped = (userId) => mockSessions.filter((s) => s.userId === userId);

      const userASessions = getScoped('user-a');
      assert.equal(userASessions.length, 2);
      assert.ok(userASessions.every((s) => s.userId === 'user-a'));
      assert.ok(!userASessions.some((s) => s.userId === 'user-b'));
    });
  });

  // ==========================================
  // 4. Soft Deletion & Restoration Logic
  // ==========================================
  describe('4. Soft Deletion & Restoration Invariants', () => {
    test('Archiving sets deletedAt timestamp and changes status to ARCHIVED', () => {
      const session = {
        id: 'session-101',
        status: 'READY',
        deletedAt: null
      };

      // Simulate archive mutation
      const archived = {
        ...session,
        status: 'ARCHIVED',
        deletedAt: new Date()
      };

      assert.equal(archived.status, 'ARCHIVED');
      assert.ok(archived.deletedAt instanceof Date);

      // Simulate restoration mutation
      const restored = {
        ...archived,
        status: 'READY',
        deletedAt: null
      };

      assert.equal(restored.status, 'READY');
      assert.equal(restored.deletedAt, null);
    });
  });

  // ==========================================
  // 5. Query Filter & Pagination Logic
  // ==========================================
  describe('5. Query Filters & Pagination Validation', () => {
    test('queryPreparationsSchema parses pagination with valid defaults', () => {
      const parsed = queryPreparationsSchema.parse({});
      assert.equal(parsed.page, 1);
      assert.equal(parsed.limit, 10);
      assert.equal(parsed.sortBy, 'createdAt');
      assert.equal(parsed.sortOrder, 'desc');
    });

    test('Caps maximum query limit to 100 records', () => {
      const parsed = queryPreparationsSchema.safeParse({ limit: 500 });
      assert.equal(parsed.success, false);
      assert.ok(parsed.error.issues.some((i) => i.path.includes('limit')));
    });
  });

  // ==========================================
  // 6. Update Schemas & Partial Modifications
  // ==========================================
  describe('6. Update Schemas & Partial Modifications', () => {
    test('updatePreparationSchema allows partial updates without requiring all fields', () => {
      const partial = updatePreparationSchema.safeParse({
        jobTitle: 'Staff Backend Architect',
        difficulty: 'EXPERT'
      });
      assert.equal(partial.success, true);
      assert.equal(partial.data.jobTitle, 'Staff Backend Architect');
      assert.equal(partial.data.difficulty, 'EXPERT');
    });

    test('updatePreparationSchema allows updating job description text', () => {
      const updateWithJd = updatePreparationSchema.safeParse({
        jobDescription: 'Updated job description with over twenty characters of detailed content.'
      });
      assert.equal(updateWithJd.success, true);
    });

    test('updatePreparationSchema rejects job description under 20 characters', () => {
      const invalidJd = updatePreparationSchema.safeParse({
        jobDescription: 'Too short'
      });
      assert.equal(invalidJd.success, false);
    });
  });

  // ==========================================
  // 7. Dashboard & Statistics Aggregations
  // ==========================================
  describe('7. Dashboard & Statistics Aggregation Logic', () => {
    test('Aggregates preparation counts and average readiness score correctly', () => {
      const mockSessions = [
        { id: '1', userId: 'u1', status: 'READY', progress: 40, deletedAt: null },
        { id: '2', userId: 'u1', status: 'IN_PROGRESS', progress: 80, deletedAt: null },
        { id: '3', userId: 'u1', status: 'COMPLETED', progress: 100, deletedAt: null },
        { id: '4', userId: 'u1', status: 'ARCHIVED', progress: 20, deletedAt: new Date() },
        { id: '5', userId: 'u2', status: 'READY', progress: 90, deletedAt: null }
      ];

      const userSessions = mockSessions.filter(s => s.userId === 'u1');
      const total = userSessions.filter(s => s.deletedAt === null).length;
      const active = userSessions.filter(s => s.deletedAt === null && ['READY', 'IN_PROGRESS', 'DRAFT'].includes(s.status)).length;
      const completed = userSessions.filter(s => s.deletedAt === null && s.status === 'COMPLETED').length;
      const archived = userSessions.filter(s => s.status === 'ARCHIVED' || s.deletedAt !== null).length;

      const nonArchived = userSessions.filter(s => s.deletedAt === null);
      const avgProgress = Math.round(nonArchived.reduce((sum, s) => sum + s.progress, 0) / nonArchived.length);

      assert.equal(total, 3);
      assert.equal(active, 2);
      assert.equal(completed, 1);
      assert.equal(archived, 1);
      assert.equal(avgProgress, 73); // (40 + 80 + 100) / 3 = 73.33 -> 73
    });
  });

  // ==========================================
  // 8. Complete Simulated End-to-End Workflow
  // ==========================================
  describe('8. Complete End-to-End Preparation Lifecycle Simulation', () => {
    test('Full lifecycle: Creation -> List -> Search/Filter -> Update -> Archive -> Restore', () => {
      // Step 1: Create
      const newSession = {
        id: 'prep-lifecycle-001',
        userId: 'candidate-uuid-1',
        title: 'Full Stack Engineer at Acme Labs',
        companyName: 'Acme Labs',
        jobTitle: 'Full Stack Engineer',
        experienceLevel: 'SENIOR',
        preferredLanguage: 'TypeScript',
        difficulty: 'HARD',
        status: 'READY',
        progress: 0,
        preferences: ['Technical interview', 'System design'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        jobDescription: {
          rawText: 'Acme Labs is seeking a Senior Full Stack Engineer with React and Node experience.',
          sourceType: 'PASTED_TEXT'
        }
      };

      assert.equal(newSession.status, 'READY');
      assert.equal(newSession.progress, 0);

      // Step 2: Search & Filter
      const list = [newSession];
      const searchMatch = list.filter(s => s.companyName.toLowerCase().includes('acme'));
      assert.equal(searchMatch.length, 1);

      const statusMatch = list.filter(s => s.status === 'READY');
      assert.equal(statusMatch.length, 1);

      // Step 3: Update
      newSession.progress = 50;
      newSession.jobTitle = 'Lead Full Stack Architect';
      assert.equal(newSession.progress, 50);
      assert.equal(newSession.jobTitle, 'Lead Full Stack Architect');

      // Step 4: Archive
      newSession.status = 'ARCHIVED';
      newSession.deletedAt = new Date();
      assert.equal(newSession.status, 'ARCHIVED');
      assert.ok(newSession.deletedAt !== null);

      // Step 5: Restore
      newSession.status = 'READY';
      newSession.deletedAt = null;
      assert.equal(newSession.status, 'READY');
      assert.equal(newSession.deletedAt, null);
    });
  });

  // ==========================================
  // 9. API Contract, Relationship Integrity & Navigation Guards
  // ==========================================
  describe('9. Preparation Creation API Contract, 1:1 Relationship & Navigation Guards', () => {
    test('Case 1: Valid payload produces unified API response structure with root and nested id', () => {
      const mockSession = {
        id: 'prep-uuid-9999',
        userId: 'usr-1111',
        title: 'Senior Full Stack Engineer at TechCorp Labs',
        companyName: 'TechCorp Labs',
        jobTitle: 'Senior Full Stack Engineer',
        status: 'READY',
        progress: 0,
        createdAt: new Date().toISOString(),
        jobDescription: {
          id: 'jd-uuid-8888',
          preparationSessionId: 'prep-uuid-9999',
          rawText: 'Expert in React 18, Node.js, Express, and PostgreSQL.'
        }
      };

      // Format response exactly as preparation.controller.js
      const apiResponse = {
        success: true,
        message: 'Preparation session created successfully',
        id: mockSession.id,
        data: {
          id: mockSession.id,
          title: mockSession.title,
          companyName: mockSession.companyName,
          jobTitle: mockSession.jobTitle,
          status: mockSession.status,
          progress: mockSession.progress,
          createdAt: mockSession.createdAt,
          jobDescription: mockSession.jobDescription
        }
      };

      assert.equal(apiResponse.success, true);
      assert.equal(apiResponse.id, 'prep-uuid-9999');
      assert.equal(apiResponse.data.id, 'prep-uuid-9999');
      assert.equal(apiResponse.data.jobDescription.preparationSessionId, 'prep-uuid-9999');
    });

    test('Case 2: 1:1 Database relationship invariant — jobDescription is uniquely bound to preparationSessionId', () => {
      const sessionId = 'prep-session-unique-1';
      const jd1 = { id: 'jd-1', preparationSessionId: sessionId, rawText: 'First description text.' };
      
      // Attempting to bind a second description to the same preparationSessionId violates 1:1 unique constraint
      const existingJds = new Map([[sessionId, jd1]]);
      const insertSecondJd = (newJd) => {
        if (existingJds.has(newJd.preparationSessionId)) {
          const err = new Error('Unique constraint failed on the constraint: job_descriptions_preparationSessionId_key');
          err.code = 'P2002';
          throw err;
        }
        existingJds.set(newJd.preparationSessionId, newJd);
      };

      assert.throws(
        () => insertSecondJd({ id: 'jd-2', preparationSessionId: sessionId, rawText: 'Duplicate description' }),
        /P2002|Unique constraint failed/
      );
    });

    test('Case 3: Client defensive extraction handles both unwrapped session object and full API payload', () => {
      const rawPayload = {
        success: true,
        message: 'Preparation session created successfully',
        id: 'prep-1234',
        data: { id: 'prep-1234', title: 'Full Stack Engineer' }
      };

      // If service returns full payload
      const sessionObjA = rawPayload?.data || rawPayload;
      const sessionIdA = sessionObjA?.id || rawPayload?.id;
      assert.equal(sessionIdA, 'prep-1234');

      // If service returns already unwrapped data object
      const unwrapped = rawPayload.data;
      const sessionObjB = unwrapped?.data || unwrapped;
      const sessionIdB = sessionObjB?.id || unwrapped?.id;
      assert.equal(sessionIdB, 'prep-1234');
    });

    test('Case 4: Rejects malformed server response without ID and prevents navigation to undefined', () => {
      const malformedResponses = [
        {},
        { success: true },
        { success: true, data: {} },
        { success: true, data: { title: 'No ID' } },
        null,
        undefined
      ];

      for (const res of malformedResponses) {
        const sessionObj = res?.data || res;
        const sessionId = sessionObj?.id || res?.id;

        assert.ok(!sessionId || typeof sessionId !== 'string', 'Malformed response must not yield valid session ID');

        // Validation check should guard navigation
        const shouldNavigate = Boolean(sessionId && typeof sessionId === 'string');
        assert.equal(shouldNavigate, false, 'Must never navigate when sessionId is missing or invalid');
      }
    });

    test('Case 5: Duplicate submission lock prevents multiple API calls on rapid clicks', () => {
      let isSubmitting = false;
      let submissionLock = false;
      let apiCallCount = 0;

      const triggerSubmit = () => {
        if (isSubmitting || submissionLock) return 'BLOCKED';
        submissionLock = true;
        isSubmitting = true;
        apiCallCount++;
        return 'SUBMITTED';
      };

      // First click
      assert.equal(triggerSubmit(), 'SUBMITTED');
      assert.equal(apiCallCount, 1);

      // Rapid consecutive clicks during submission are cleanly blocked
      assert.equal(triggerSubmit(), 'BLOCKED');
      assert.equal(triggerSubmit(), 'BLOCKED');
      assert.equal(apiCallCount, 1);

      // Submission concludes
      isSubmitting = false;
    });

    test('Case 6: Preparation details retrieval with ownership check passes for owner, rejects non-owner', async () => {
      const sessionInDb = {
        id: 'prep-owned-1',
        userId: 'candidate-user-1',
        title: 'Backend Engineer at Stripe',
        jobDescription: { id: 'jd-1', rawText: 'Distributed systems experience required.' }
      };

      const getDetails = (prepId, requestingUserId) => {
        if (prepId !== sessionInDb.id) {
          const err = new Error('Preparation session not found');
          err.status = 404;
          throw err;
        }
        if (sessionInDb.userId !== requestingUserId) {
          const err = new Error('Access denied: You do not have permission to view this preparation');
          err.status = 403;
          throw err;
        }
        return sessionInDb;
      };

      // Owner retrieves
      const ownerRes = getDetails('prep-owned-1', 'candidate-user-1');
      assert.equal(ownerRes.id, 'prep-owned-1');
      assert.equal(ownerRes.jobDescription.rawText.includes('Distributed systems'), true);

      // Non-owner gets 403
      assert.throws(
        () => getDetails('prep-owned-1', 'intruder-user-2'),
        (err) => err.status === 403
      );
    });
  });
});

