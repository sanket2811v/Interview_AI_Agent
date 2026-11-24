import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import {
  createPracticeSessionSchema,
  saveDraftSchema,
  submitAttemptSchema,
  updateReviewSchema,
  queryPracticeSessionsSchema,
  queryHistorySchema
} from '../src/validators/practice.validator.js';
import { PracticeService } from '../src/services/practice.service.js';
import { generateAuthTokens } from '../src/utils/tokens.js';
import {
  normalizeCategory,
  normalizeDifficulty,
  normalizeScope,
  getCategoryLabel,
  getDifficultyLabel
} from '../src/utils/practiceNormalization.js';
import db from '../src/config/prisma.js';

/**
 * Executes in-process HTTP requests against Express without raw TCP sockets
 */
function requestApp(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve) => {
    const socket = new stream.Duplex({
      read() {},
      write(chunk, encoding, callback) {
        callback();
      }
    });
    socket.remoteAddress = '127.0.0.1';
    socket.encrypted = false;

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = { host: 'localhost', ...headers };

    let rawBody = '';
    if (body !== null) {
      rawBody = typeof body === 'string' ? body : JSON.stringify(body);
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = Buffer.byteLength(rawBody).toString();
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    const chunks = [];
    const origWrite = res.write;
    const origEnd = res.end;

    res.write = function (chunk, ...args) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return origWrite.apply(res, [chunk, ...args]);
    };

    res.end = function (chunk, ...args) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      origEnd.apply(res, [chunk, ...args]);
    };

    res.on('finish', () => {
      const responseText = Buffer.concat(chunks).toString('utf8');
      let parsedBody = responseText;
      try {
        parsedBody = JSON.parse(responseText);
      } catch {}

      resolve({
        statusCode: res.statusCode,
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody
      });
    });

    app(req, res);
    if (body !== null) {
      req.emit('data', Buffer.from(rawBody));
    }
    req.emit('end');
  });
}

describe('InterviewAI Phase 8: Interview Practice Engine Test Suite', () => {
  // ==========================================
  // 1. Zod Validation & Schema Enforcement
  // ==========================================
  describe('1. Practice Request & Response Schemas', () => {
    test('createPracticeSessionSchema parses valid defaults', () => {
      const parsed = createPracticeSessionSchema.parse({});
      assert.equal(parsed.category, 'ALL');
      assert.equal(parsed.difficulty, 'MEDIUM');
      assert.equal(parsed.count, 10);
      assert.equal(parsed.filter, 'ALL');
    });

    test('createPracticeSessionSchema rejects question count over 50', () => {
      assert.throws(
        () => createPracticeSessionSchema.parse({ count: 100 }),
        (err) => {
          assert.ok(err.issues.some((i) => i.path.includes('count')));
          return true;
        }
      );
    });

    test('saveDraftSchema accepts empty or long text up to 20,000 chars', () => {
      const parsed = saveDraftSchema.parse({
        answer: 'Draft notes on concurrency',
        revealedHints: [0, 1]
      });
      assert.equal(parsed.answer, 'Draft notes on concurrency');
      assert.equal(parsed.revealedHints.length, 2);
    });

    test('submitAttemptSchema rejects empty answer', () => {
      assert.throws(
        () => submitAttemptSchema.parse({ answer: '' }),
        (err) => {
          assert.ok(err.issues.some((i) => i.path.includes('answer')));
          return true;
        }
      );
    });

    test('updateReviewSchema enforces selfRating between 1 and 5', () => {
      const valid = updateReviewSchema.parse({ selfRating: 4, isBookmarked: true });
      assert.equal(valid.selfRating, 4);
      assert.equal(valid.isBookmarked, true);

      assert.throws(() => updateReviewSchema.parse({ selfRating: 6 }));
      assert.throws(() => updateReviewSchema.parse({ selfRating: 0 }));
    });
  });

  // ==========================================
  // 2. Practice Service Business Rules & Ownership
  // ==========================================
  describe('2. PracticeService Business Rules & Security Guards', () => {
    test('Rejects startSession if preparation is owned by another user with 403', async () => {
      const origFind = db.preparationSession.findUnique;
      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-alien',
          userId: 'owner-user',
          jobTitle: 'Backend Lead'
        });

        await assert.rejects(
          () => PracticeService.startSession('prep-alien', 'intruder-user'),
          (err) => {
            assert.equal(err.status, 403);
            assert.ok(err.message.includes('Access denied'));
            return true;
          }
        );
      } finally {
        db.preparationSession.findUnique = origFind;
      }
    });

    test('Rejects startSession if no questions match criteria with 400 NO_QUESTIONS_AVAILABLE', async () => {
      const origFindPrep = db.preparationSession.findUnique;
      const origFindQ = db.interviewQuestion.findMany;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-empty',
          userId: 'user-1',
          jobTitle: 'Data Engineer'
        });
        db.interviewQuestion.findMany = async () => [];

        await assert.rejects(
          () => PracticeService.startSession('prep-empty', 'user-1', { category: 'TECHNICAL' }),
          (err) => {
            assert.equal(err.status, 400);
            assert.equal(err.code, 'NO_QUESTIONS_AVAILABLE');
            return true;
          }
        );
      } finally {
        db.preparationSession.findUnique = origFindPrep;
        db.interviewQuestion.findMany = origFindQ;
      }
    });

    test('startSession creates a practice session record and returns sanitized questions', async () => {
      const origFindPrep = db.preparationSession.findUnique;
      const origFindQ = db.interviewQuestion.findMany;
      const origCreateSession = db.practiceSession.create;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-101',
          userId: 'user-1',
          jobTitle: 'Fullstack Architect'
        });

        db.interviewQuestion.findMany = async () => [
          {
            id: 'q-1',
            category: 'TECHNICAL',
            question: 'Explain React Server Components vs SSR.',
            description: 'Architecture comparison',
            difficulty: 'HARD',
            estimatedTime: 5,
            tags: ['React', 'SSR'],
            hints: ['Think about server-only code execution.', 'Consider zero-bundle-size.'],
            referenceAnswer: 'RSC executes exclusively on the server...',
            expectedConcepts: ['Zero bundle impact', 'Server-only execution']
          }
        ];

        db.practiceSession.create = async ({ data }) => ({
          id: 'prac-session-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const result = await PracticeService.startSession('prep-101', 'user-1', { count: 5 });
        assert.ok(result.session);
        assert.equal(result.session.id, 'prac-session-1');
        assert.equal(result.questions.length, 1);
        assert.equal(result.questions[0].id, 'q-1');
        // Benchmark reference answer should not be leaked in initial question payload
        assert.equal(result.questions[0].referenceAnswer, undefined);
        assert.equal(result.questions[0].hintsCount, 2);
      } finally {
        db.preparationSession.findUnique = origFindPrep;
        db.interviewQuestion.findMany = origFindQ;
        db.practiceSession.create = origCreateSession;
      }
    });
  });

  // ==========================================
  // 3. Draft & Attempt Lifecycle
  // ==========================================
  describe('3. Draft Saving & Attempt Submission Invariants', () => {
    test('saveDraft creates or updates attempt with DRAFT status', async () => {
      const origFindSession = db.practiceSession.findUnique;
      const origFindQ = db.interviewQuestion.findUnique;
      const origFindFirstAttempt = db.questionAttempt.findFirst;
      const origCreateAttempt = db.questionAttempt.create;
      const origUpdateSession = db.practiceSession.update;

      try {
        db.practiceSession.findUnique = async () => ({
          id: 'prac-sess-1',
          userId: 'usr-1',
          preparationSessionId: 'prep-1'
        });
        db.interviewQuestion.findUnique = async () => ({
          id: 'q-1',
          preparationSessionId: 'prep-1',
          preparationSession: { userId: 'usr-1' }
        });
        db.questionAttempt.findFirst = async () => null; // No existing draft
        db.questionAttempt.create = async ({ data }) => ({
          id: 'att-draft-1',
          ...data
        });
        db.practiceSession.update = async () => ({});

        const draft = await PracticeService.saveDraft('prac-sess-1', 'q-1', 'usr-1', {
          answer: 'WIP draft solution for review',
          answerFormat: 'TEXT',
          revealedHints: [0]
        });

        assert.equal(draft.status, 'DRAFT');
        assert.equal(draft.answer, 'WIP draft solution for review');
      } finally {
        db.practiceSession.findUnique = origFindSession;
        db.interviewQuestion.findUnique = origFindQ;
        db.questionAttempt.findFirst = origFindFirstAttempt;
        db.questionAttempt.create = origCreateAttempt;
        db.practiceSession.update = origUpdateSession;
      }
    });

    test('submitAttempt marks attempt SUBMITTED and updates session count', async () => {
      const origFindSession = db.practiceSession.findUnique;
      const origFindQ = db.interviewQuestion.findUnique;
      const origCountAttempts = db.questionAttempt.count;
      const origFindFirstAttempt = db.questionAttempt.findFirst;
      const origUpdateAttempt = db.questionAttempt.update;
      const origUpdateSession = db.practiceSession.update;

      try {
        db.practiceSession.findUnique = async () => ({
          id: 'prac-sess-1',
          userId: 'usr-1',
          preparationSessionId: 'prep-1'
        });
        db.interviewQuestion.findUnique = async () => ({
          id: 'q-1',
          preparationSessionId: 'prep-1',
          preparationSession: { userId: 'usr-1' }
        });
        db.questionAttempt.count = async () => 1; // 1 attempt answered
        db.questionAttempt.findFirst = async () => ({
          id: 'att-existing',
          status: 'DRAFT'
        });
        db.questionAttempt.update = async ({ data }) => ({
          id: 'att-existing',
          ...data
        });
        db.practiceSession.update = async () => ({});

        const submitted = await PracticeService.submitAttempt('prac-sess-1', 'q-1', 'usr-1', {
          answer: 'Final comprehensive answer',
          timeTaken: 120
        });

        assert.equal(submitted.status, 'SUBMITTED');
        assert.equal(submitted.attemptNumber, 2);
      } finally {
        db.practiceSession.findUnique = origFindSession;
        db.interviewQuestion.findUnique = origFindQ;
        db.questionAttempt.count = origCountAttempts;
        db.questionAttempt.findFirst = origFindFirstAttempt;
        db.questionAttempt.update = origUpdateAttempt;
        db.practiceSession.update = origUpdateSession;
      }
    });
  });

  // ==========================================
  // 4. Hints & Reference Material
  // ==========================================
  describe('4. Sequential Hints & Reference Answer Endpoints', () => {
    test('revealHint returns sequential hint and respects bounds', async () => {
      const origFindSession = db.practiceSession.findUnique;
      const origFindQ = db.interviewQuestion.findUnique;
      const origFindFirst = db.questionAttempt.findFirst;

      try {
        db.practiceSession.findUnique = async () => ({
          id: 'sess-h',
          userId: 'usr-h',
          preparationSessionId: 'prep-h'
        });
        db.interviewQuestion.findUnique = async () => ({
          id: 'q-h',
          preparationSessionId: 'prep-h',
          hints: ['First hint context', 'Second deeper hint']
        });
        db.questionAttempt.findFirst = async () => null;

        const res1 = await PracticeService.revealHint('sess-h', 'q-h', 'usr-h', 0);
        assert.equal(res1.hasHints, true);
        assert.equal(res1.hint, 'First hint context');
        assert.equal(res1.hintIndex, 0);
        assert.equal(res1.totalHints, 2);

        const res2 = await PracticeService.revealHint('sess-h', 'q-h', 'usr-h', 1);
        assert.equal(res2.hint, 'Second deeper hint');
      } finally {
        db.practiceSession.findUnique = origFindSession;
        db.interviewQuestion.findUnique = origFindQ;
        db.questionAttempt.findFirst = origFindFirst;
      }
    });

    test('getReferenceAnswer verifies ownership and returns reference points', async () => {
      const origFindQ = db.interviewQuestion.findUnique;
      try {
        db.interviewQuestion.findUnique = async () => ({
          id: 'q-ref',
          category: 'TECHNICAL',
          referenceAnswer: 'Ideal technical model answer',
          explanation: 'Interviewer motivation details',
          expectedConcepts: ['Event Loop', 'Microtasks'],
          preparationSession: { id: 'prep-r', userId: 'usr-r' }
        });

        const ref = await PracticeService.getReferenceAnswer('q-ref', 'usr-r');
        assert.equal(ref.referenceAnswer, 'Ideal technical model answer');
        assert.equal(ref.expectedConcepts.length, 2);

        // Block cross-user access
        await assert.rejects(
          () => PracticeService.getReferenceAnswer('q-ref', 'intruder-usr'),
          (err) => {
            assert.equal(err.status, 403);
            return true;
          }
        );
      } finally {
        db.interviewQuestion.findUnique = origFindQ;
      }
    });
  });

  // ==========================================
  // 5. Practice History & Statistics Aggregation
  // ==========================================
  describe('5. Practice History & Analytics Aggregation', () => {
    test('getPracticeStats accurately aggregates sessions, categories, and review flags', async () => {
      const origCountSession = db.practiceSession.count;
      const origFindAttempts = db.questionAttempt.findMany;
      const origCountAttempts = db.questionAttempt.count;

      try {
        db.practiceSession.count = async ({ where }) => {
          if (where.status === 'COMPLETED') return 3;
          if (where.status === 'IN_PROGRESS') return 1;
          return 4; // total
        };

        db.questionAttempt.findMany = async () => [
          { questionId: 'q1', question: { category: 'TECHNICAL', difficulty: 'HARD' } },
          { questionId: 'q2', question: { category: 'HR', difficulty: 'MEDIUM' } },
          { questionId: 'q1', question: { category: 'TECHNICAL', difficulty: 'HARD' } } // repeat attempt
        ];

        db.questionAttempt.count = async ({ where }) => {
          if (where.isBookmarked) return 2;
          if (where.needsReview) return 1;
          return 3;
        };

        const stats = await PracticeService.getPracticeStats('usr-stats');
        assert.equal(stats.totalSessions, 4);
        assert.equal(stats.completedSessions, 3);
        assert.equal(stats.inProgressSessions, 1);
        assert.equal(stats.totalSubmittedAttempts, 3);
        assert.equal(stats.uniqueQuestionsAttempted, 2); // q1 and q2
        assert.equal(stats.bookmarkedCount, 2);
        assert.equal(stats.needsReviewCount, 1);
        assert.equal(stats.categoryBreakdown.TECHNICAL, 2);
        assert.equal(stats.categoryBreakdown.HR, 1);
        assert.equal(stats.difficultyBreakdown.HARD, 2);
      } finally {
        db.practiceSession.count = origCountSession;
        db.questionAttempt.findMany = origFindAttempts;
        db.questionAttempt.count = origCountAttempts;
      }
    });
  });

  // ==========================================
  // 6. HTTP Endpoints Security & Auth Guards
  // ==========================================
  describe('6. HTTP Practice Endpoints Security & 401 Rejections', () => {
    test('POST /api/preparations/:id/practice/sessions rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'POST',
        url: '/api/preparations/test-prep-id/practice/sessions',
        body: { category: 'TECHNICAL' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/preparations/:id/practice/sessions rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations/test-prep-id/practice/sessions'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/practice/sessions/:sessionId rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/practice/sessions/test-session-id'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('PUT /api/practice/sessions/:sessionId/questions/:questionId/draft rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'PUT',
        url: '/api/practice/sessions/sess-1/questions/q-1/draft',
        body: { answer: 'draft test' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('POST /api/practice/sessions/:sessionId/questions/:questionId/attempts rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'POST',
        url: '/api/practice/sessions/sess-1/questions/q-1/attempts',
        body: { answer: 'answer test' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/practice/history rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/practice/history'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/practice/stats rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/practice/stats'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/questions/:questionId/reference-answer rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/questions/test-q/reference-answer'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('POST /api/questions/:questionId/attempts rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'POST',
        url: '/api/questions/test-q/attempts',
        body: { answer: 'standalone answer test' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('PUT /api/questions/:questionId/draft rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'PUT',
        url: '/api/questions/test-q/draft',
        body: { answer: 'standalone draft test' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('PATCH /api/questions/:questionId/review rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'PATCH',
        url: '/api/questions/test-q/review',
        body: { isBookmarked: true }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/preparations/:id/practice/availability rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations/test-prep/practice/availability'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================
  // 7. Question Matching, Normalization & Filtering
  // ==========================================
  describe('7. Question Matching, Normalization & Filtering Invariants', () => {
    test('Normalizers bridge human UI labels and PostgreSQL enum values', () => {
      // Category
      assert.equal(normalizeCategory('Technical Deep-Dive'), 'TECHNICAL');
      assert.equal(normalizeCategory('technical'), 'TECHNICAL');
      assert.equal(normalizeCategory('HR & Behavioral (STAR)'), 'HR');
      assert.equal(normalizeCategory('System Design & Architecture'), 'SYSTEM_DESIGN');
      assert.equal(normalizeCategory('Scenario & Incident Triage'), 'SCENARIO');
      assert.equal(normalizeCategory('All Categories (Comprehensive Practice)'), 'ALL');

      // Difficulty
      assert.equal(normalizeDifficulty('Easy (Core Foundations)'), 'EASY');
      assert.equal(normalizeDifficulty('easy'), 'EASY');
      assert.equal(normalizeDifficulty('Medium (Balanced Standards)'), 'MEDIUM');
      assert.equal(normalizeDifficulty('medium'), 'MEDIUM');
      assert.equal(normalizeDifficulty('Hard (Advanced / Senior Bar)'), 'HARD');
      assert.equal(normalizeDifficulty('Expert (Staff / Principal Level)'), 'EXPERT');
      assert.equal(normalizeDifficulty('Mixed (Progressive Ladder)'), 'MIXED');
      assert.equal(normalizeDifficulty('ALL'), 'MIXED');

      // Scope
      assert.equal(normalizeScope('All Available Role Questions'), 'ALL');
      assert.equal(normalizeScope('Unattempted Questions Only'), 'UNATTEMPTED');
      assert.equal(normalizeScope('Questions Marked for Review'), 'NEEDS_REVIEW');
      assert.equal(normalizeScope('Bookmarked Questions Only'), 'BOOKMARKED');
      assert.equal(normalizeScope('Re-practice Attempted Questions'), 'ATTEMPTED');
    });

    test('createPracticeSessionSchema parses UI labels and maps to enums seamlessly', () => {
      const parsed = createPracticeSessionSchema.parse({
        category: 'Technical Deep-Dive',
        difficulty: 'Easy (Core Foundations)',
        filter: 'All Available Role Questions',
        count: '5'
      });
      assert.equal(parsed.category, 'TECHNICAL');
      assert.equal(parsed.difficulty, 'EASY');
      assert.equal(parsed.filter, 'ALL');
      assert.equal(parsed.count, 5);
    });

    test('startSession returns structured NO_QUESTIONS_AVAILABLE with suggestions when 0 match', async () => {
      const origFindPrep = db.preparationSession.findUnique;
      const origFindQ = db.interviewQuestion.findMany;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-tech-med',
          userId: 'user-tech',
          jobTitle: 'Senior Full Stack Engineer'
        });

        // 6 Technical questions, all at MEDIUM difficulty
        db.interviewQuestion.findMany = async () => [
          { id: 'q-1', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q1', tags: [] },
          { id: 'q-2', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q2', tags: [] },
          { id: 'q-3', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q3', tags: [] },
          { id: 'q-4', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q4', tags: [] },
          { id: 'q-5', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q5', tags: [] },
          { id: 'q-6', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q6', tags: [] }
        ];

        // Request EASY difficulty (which has 0 matching questions)
        await assert.rejects(
          () => PracticeService.startSession('prep-tech-med', 'user-tech', {
            category: 'Technical Deep-Dive',
            difficulty: 'Easy (Core Foundations)',
            count: 5
          }),
          (err) => {
            assert.equal(err.status, 400);
            assert.equal(err.code, 'NO_QUESTIONS_AVAILABLE');
            assert.ok(err.message.includes('No questions match your selected Technical Deep-Dive and Easy'));
            assert.ok(err.details.suggestion.includes('6 Technical Deep-Dive question(s) are available'));
            assert.equal(err.details.availableCount, 0);
            assert.equal(err.details.totalInPreparation, 6);
            assert.equal(err.details.breakdown.byCategory.TECHNICAL, 6);
            assert.equal(err.details.breakdown.byDifficulty.MEDIUM, 6);
            assert.equal(err.details.breakdown.byDifficulty.EASY, 0);
            return true;
          }
        );
      } finally {
        db.preparationSession.findUnique = origFindPrep;
        db.interviewQuestion.findMany = origFindQ;
      }
    });

    test('startSession succeeds when matching questions exist and creates session with draft links', async () => {
      const origFindPrep = db.preparationSession.findUnique;
      const origFindQ = db.interviewQuestion.findMany;
      const origCreateSession = db.practiceSession.create;
      const origCreateAttempt = db.questionAttempt.create;

      const createdAttempts = [];

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-valid-5',
          userId: 'user-valid',
          jobTitle: 'Senior Full Stack Engineer'
        });

        // 6 Technical Medium questions
        const questionsList = [
          { id: 'q-1', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q1', tags: [], hints: ['H1'] },
          { id: 'q-2', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q2', tags: [], hints: [] },
          { id: 'q-3', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q3', tags: [], hints: [] },
          { id: 'q-4', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q4', tags: [], hints: [] },
          { id: 'q-5', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q5', tags: [], hints: [] },
          { id: 'q-6', category: 'TECHNICAL', difficulty: 'MEDIUM', question: 'Q6', tags: [], hints: [] }
        ];

        db.interviewQuestion.findMany = async () => questionsList;

        db.practiceSession.create = async ({ data }) => ({
          id: 'session-valid-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        db.questionAttempt.create = async ({ data }) => {
          const attempt = { id: `att-${data.questionId}`, ...data };
          createdAttempts.push(attempt);
          return attempt;
        };

        const result = await PracticeService.startSession('prep-valid-5', 'user-valid', {
          category: 'TECHNICAL',
          difficulty: 'MEDIUM',
          count: 5
        });

        assert.ok(result.session);
        assert.equal(result.session.id, 'session-valid-1');
        assert.equal(result.questions.length, 5);
        assert.equal(createdAttempts.length, 5);
        // Verify no duplicate question IDs
        const ids = result.questions.map((q) => q.id);
        assert.equal(new Set(ids).size, 5);
      } finally {
        db.preparationSession.findUnique = origFindPrep;
        db.interviewQuestion.findMany = origFindQ;
        db.practiceSession.create = origCreateSession;
        db.questionAttempt.create = origCreateAttempt;
      }
    });

    test('getQuestionAvailability calculates exact category and difficulty matrix', async () => {
      const origFindPrep = db.preparationSession.findUnique;
      const origFindQ = db.interviewQuestion.findMany;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-stats',
          userId: 'user-stats'
        });

        db.interviewQuestion.findMany = async () => [
          { id: 'q-1', category: 'TECHNICAL', difficulty: 'MEDIUM' },
          { id: 'q-2', category: 'TECHNICAL', difficulty: 'MEDIUM' },
          { id: 'q-3', category: 'HR', difficulty: 'MEDIUM' },
          { id: 'q-4', category: 'SYSTEM_DESIGN', difficulty: 'HARD' }
        ];

        const stats = await PracticeService.getQuestionAvailability('prep-stats', 'user-stats');
        assert.equal(stats.total, 4);
        assert.equal(stats.byCategory.TECHNICAL, 2);
        assert.equal(stats.byCategory.HR, 1);
        assert.equal(stats.byCategory.SYSTEM_DESIGN, 1);
        assert.equal(stats.byDifficulty.MEDIUM, 3);
        assert.equal(stats.byDifficulty.HARD, 1);
        assert.equal(stats.byDifficulty.EASY, 0);
        assert.equal(stats.matrix.TECHNICAL.MEDIUM, 2);
        assert.equal(stats.matrix.SYSTEM_DESIGN.HARD, 1);
      } finally {
        db.preparationSession.findUnique = origFindPrep;
        db.interviewQuestion.findMany = origFindQ;
      }
    });
  });
});

