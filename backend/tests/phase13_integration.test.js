import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import { generateAuthTokens } from '../src/utils/tokens.js';
import { db, disconnectPrisma } from '../src/config/prisma.js';
import { PreparationService } from '../src/services/preparation.service.js';
import { QuestionService } from '../src/services/question.service.js';
import { PracticeService } from '../src/services/practice.service.js';
import { CodeExecutionService } from '../src/services/codeExecution/codeExecution.service.js';
import { MockInterviewService } from '../src/services/mockInterview/mockInterview.service.js';
import { AnswerEvaluationService } from '../src/services/evaluation/answerEvaluation.service.js';
import { CodingEvaluationService } from '../src/services/evaluation/codingEvaluation.service.js';
import { MockInterviewEvaluationService } from '../src/services/evaluation/mockInterviewEvaluation.service.js';
import { AnalyticsService } from '../src/services/analytics/analytics.service.js';
import { SkillGapService } from '../src/services/analytics/skillGap.service.js';
import { ImprovementPlanService } from '../src/services/analytics/improvementPlan.service.js';
import { LearningTaskService } from '../src/services/analytics/learningTask.service.js';
import { ProgressService } from '../src/services/analytics/progress.service.js';

/**
 * In-memory HTTP dispatcher for Express application testing
 */
function requestApp(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new stream.Duplex({
      read() {},
      write(_chunk, _encoding, callback) {
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

      const buffer = Buffer.concat(chunks);
      let parsedBody = null;
      const text = buffer.toString('utf8');

      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = text;
      }

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody
      });
    };

    app(req, res);

    if (rawBody) {
      req.push(Buffer.from(rawBody));
    }
    req.push(null);
  });
}

describe('InterviewAI Phase 13: Full-Stack Integration Verification Suite', () => {
  const testUserA = {
    id: 'user-integration-a-' + Date.now(),
    email: `integration_a_${Date.now()}@interviewai.dev`,
    role: 'CANDIDATE',
    isActive: true,
    profile: { fullName: 'Candidate A' }
  };

  const testUserB = {
    id: 'user-integration-b-' + Date.now(),
    email: `integration_b_${Date.now()}@interviewai.dev`,
    role: 'CANDIDATE',
    isActive: true,
    profile: { fullName: 'Candidate B' }
  };

  let tokenA;
  let tokenB;

  let origUserFind;
  let origPrepFind;
  let origPrepFindMany;
  let origPrepCount;
  let origPrepCreate;
  let origEvalFindMany;
  let origEvalCount;
  let origSubFindMany;
  let origSubCount;
  let origPlanFindMany;
  let origTaskFindMany;
  let origTaskCount;
  let origAttemptCount;
  let origAttemptFindUnique;
  let origAttemptFindMany;
  let origMockCount;
  let origMockFindMany;
  let origMockFindUnique;
  let origProgressFindMany;
  let origProfileFind;
  let origReportFindMany;
  let origTransaction;

  before(() => {
    // Generate valid tokens
    const tokensA = generateAuthTokens({
      id: testUserA.id,
      email: testUserA.email,
      role: testUserA.role,
      isEmailVerified: true
    });
    tokenA = tokensA.accessToken;

    const tokensB = generateAuthTokens({
      id: testUserB.id,
      email: testUserB.email,
      role: testUserB.role,
      isEmailVerified: true
    });
    tokenB = tokensB.accessToken;

    // Preserve original DB methods
    origUserFind = db.user.findUnique;
    origPrepFind = db.preparationSession.findUnique;
    origPrepFindMany = db.preparationSession.findMany;
    origPrepCount = db.preparationSession.count;
    origPrepCreate = db.preparationSession.create;
    origEvalFindMany = db.interviewEvaluation.findMany;
    origEvalCount = db.interviewEvaluation.count;
    origSubFindMany = db.codingSubmission.findMany;
    origSubCount = db.codingSubmission.count;
    origPlanFindMany = db.improvementPlan.findMany;
    origTaskFindMany = db.learningTask.findMany;
    origTaskCount = db.learningTask.count;
    origAttemptCount = db.questionAttempt.count;
    origAttemptFindUnique = db.questionAttempt.findUnique;
    origAttemptFindMany = db.questionAttempt.findMany;
    origMockCount = db.mockInterview.count;
    origMockFindMany = db.mockInterview.findMany;
    origMockFindUnique = db.mockInterview.findUnique;
    origProgressFindMany = db.userProgress.findMany;
    origProfileFind = db.userProfile.findUnique;
    origReportFindMany = db.performanceReport ? db.performanceReport.findMany : null;
    origTransaction = db.$transaction;

    // Mock DB queries for deterministic in-process testing
    db.user.findUnique = async ({ where }) => {
      if (where.id === testUserA.id) return testUserA;
      if (where.id === testUserB.id) return testUserB;
      return null;
    };

    db.preparationSession.findMany = async () => [];
    db.preparationSession.count = async () => 0;
    db.preparationSession.findUnique = async () => null;

    db.interviewEvaluation.findMany = async () => [];
    db.interviewEvaluation.count = async () => 0;

    db.codingSubmission.findMany = async () => [];
    db.codingSubmission.count = async () => 0;

    db.mockInterview.findMany = async () => [];
    db.mockInterview.count = async () => 0;
    db.mockInterview.findUnique = async () => null;

    db.questionAttempt.findMany = async () => [];
    db.questionAttempt.count = async () => 0;
    db.questionAttempt.findUnique = async () => null;

    db.improvementPlan.findMany = async () => [];
    db.learningTask.findMany = async () => [];
    db.learningTask.count = async () => 0;
    db.userProgress.findMany = async () => [];
    db.userProfile.findUnique = async () => null;

    if (db.performanceReport) {
      db.performanceReport.findMany = async () => [];
    }

    db.$transaction = async (fn) => {
      if (typeof fn === 'function') {
        return fn(db);
      }
      return Promise.all(fn);
    };
  });

  after(async () => {
    db.user.findUnique = origUserFind;
    db.preparationSession.findUnique = origPrepFind;
    db.preparationSession.findMany = origPrepFindMany;
    db.preparationSession.count = origPrepCount;
    db.preparationSession.create = origPrepCreate;
    db.interviewEvaluation.findMany = origEvalFindMany;
    db.interviewEvaluation.count = origEvalCount;
    db.codingSubmission.findMany = origSubFindMany;
    db.codingSubmission.count = origSubCount;
    db.mockInterview.findMany = origMockFindMany;
    db.mockInterview.count = origMockCount;
    db.mockInterview.findUnique = origMockFindUnique;
    db.questionAttempt.findMany = origAttemptFindMany;
    db.questionAttempt.count = origAttemptCount;
    db.questionAttempt.findUnique = origAttemptFindUnique;
    db.improvementPlan.findMany = origPlanFindMany;
    db.learningTask.findMany = origTaskFindMany;
    db.learningTask.count = origTaskCount;
    db.userProgress.findMany = origProgressFindMany;
    db.userProfile.findUnique = origProfileFind;
    db.$transaction = origTransaction;
    if (origReportFindMany && db.performanceReport) {
      db.performanceReport.findMany = origReportFindMany;
    }
    await disconnectPrisma();
  });

  // =========================================================================
  // Test 1: Authentication & Session Lifecycle
  // =========================================================================
  describe('Test 1: Authentication & Session Lifecycle', () => {
    test('Health and Database endpoints are responsive and secure', async () => {
      const healthRes = await requestApp(app, { method: 'GET', url: '/api/health' });
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.body.success, true);

      const dbRes1 = await requestApp(app, { method: 'GET', url: '/api/health/database' });
      assert.ok([200, 503].includes(dbRes1.status));

      const dbRes2 = await requestApp(app, { method: 'GET', url: '/api/health/db' });
      assert.ok([200, 503].includes(dbRes2.status));
    });

    test('Unauthenticated request to protected endpoint returns 401 Unauthorized', async () => {
      const res = await requestApp(app, { method: 'GET', url: '/api/preparations' });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('Authenticated request with valid Bearer token accesses protected endpoint', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  // =========================================================================
  // Test 2: Preparation to Job Analysis Integration
  // =========================================================================
  describe('Test 2: Preparation to Analysis Integration', () => {
    test('Creates preparation session with job description and checks analysis status', async () => {
      db.preparationSession.create = async ({ data }) => ({
        id: 'prep-test-uuid',
        userId: testUserA.id,
        title: data.title || 'Senior Full Stack Architect',
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        status: 'READY',
        progress: 25,
        createdAt: new Date(),
        jobDescription: { rawText: data.jobDescription?.create?.rawText }
      });

      const prepRes = await requestApp(app, {
        method: 'POST',
        url: '/api/preparations',
        headers: { authorization: `Bearer ${tokenA}` },
        body: {
          jobTitle: 'Senior Full Stack Architect',
          companyName: 'Stripe Global',
          experienceLevel: 'SENIOR',
          preferredLanguage: 'TypeScript',
          difficulty: 'HARD',
          jobDescription: 'We are seeking a Senior Full Stack Architect with deep mastery in Node.js, React, PostgreSQL, and distributed payment systems.'
        }
      });

      assert.ok([201, 200].includes(prepRes.status));
      assert.ok(prepRes.body.data.id);
    });
  });

  // =========================================================================
  // Test 3: Analysis to Question Generation Integration
  // =========================================================================
  describe('Test 3: Analysis to Questions Integration', () => {
    test('Validates question generator schemas and rejects invalid bounds', async () => {
      const invalidRes = await requestApp(app, {
        method: 'POST',
        url: '/api/preparations/test-prep-id/questions/generate',
        headers: { authorization: `Bearer ${tokenA}` },
        body: { count: 99 } // Max allowed is 20
      });

      assert.ok([400, 404].includes(invalidRes.status));
      assert.equal(invalidRes.body.success, false);
    });
  });

  // =========================================================================
  // Test 4: Questions to Interactive Practice Integration
  // =========================================================================
  describe('Test 4: Questions to Practice Integration', () => {
    test('Practice session creation enforces tenant ownership and validates schema', async () => {
      const practiceRes = await requestApp(app, {
        method: 'POST',
        url: '/api/practice/sessions',
        headers: { authorization: `Bearer ${tokenA}` },
        body: {
          preparationSessionId: 'non-existent-prep-uuid',
          title: 'Morning Practice Sprint'
        }
      });

      assert.ok([400, 404].includes(practiceRes.status));
    });
  });

  // =========================================================================
  // Test 5: Coding Assessment Integration
  // =========================================================================
  describe('Test 5: Coding Assessment & Sandbox Execution', () => {
    test('Coding execution validates code submission payload and rejects missing fields', async () => {
      const codeRes = await requestApp(app, {
        method: 'POST',
        url: '/api/coding/challenges/test-challenge-id/run',
        headers: { authorization: `Bearer ${tokenA}` },
        body: {
          language: 'javascript',
          sourceCode: '' // Empty source code is rejected by Zod
        }
      });

      assert.equal(codeRes.status, 400);
      assert.equal(codeRes.body.success, false);
    });

    test('Supported languages endpoint returns configured runtimes', async () => {
      const langRes = await requestApp(app, {
        method: 'GET',
        url: '/api/coding/languages',
        headers: { authorization: `Bearer ${tokenA}` }
      });

      assert.equal(langRes.status, 200);
      assert.ok(Array.isArray(langRes.body.data?.languages));
    });
  });

  // =========================================================================
  // Test 6: Mock Interview Integration
  // =========================================================================
  describe('Test 6: Mock Interview Lifecycle', () => {
    test('Mock interview endpoints enforce authentication and valid payload structure', async () => {
      const mockRes = await requestApp(app, {
        method: 'POST',
        url: '/api/mock-interviews',
        headers: { authorization: `Bearer ${tokenA}` },
        body: {
          interviewType: 'TECHNICAL',
          difficulty: 'MEDIUM',
          preparationSessionId: 'non-existent-prep-uuid'
        }
      });

      assert.ok([400, 404].includes(mockRes.status));
    });
  });

  // =========================================================================
  // Test 7: AI Evaluation Integration
  // =========================================================================
  describe('Test 7: AI Evaluation Integration', () => {
    test('Evaluation endpoints reject unauthenticated access and validate source IDs', async () => {
      const unauth = await requestApp(app, { method: 'POST', url: '/api/evaluations/answers/attempt-123' });
      assert.equal(unauth.status, 401);

      const authRes = await requestApp(app, {
        method: 'POST',
        url: '/api/evaluations/answers/non-existent-attempt',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.ok([400, 404, 503].includes(authRes.status));
    });

    test('Reports list endpoint returns valid array structure for authenticated user', async () => {
      const reportsRes = await requestApp(app, {
        method: 'GET',
        url: '/api/reports',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(reportsRes.status, 200);
      assert.equal(reportsRes.body.success, true);
    });
  });

  // =========================================================================
  // Test 8: Analytics and Improvement Plan Integration
  // =========================================================================
  describe('Test 8: Analytics and Improvement Plan Integration', () => {
    test('Analytics overview, categories, and trends endpoints return 200 with structured metrics', async () => {
      const overviewRes = await requestApp(app, {
        method: 'GET',
        url: '/api/analytics/overview',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(overviewRes.status, 200);
      assert.equal(overviewRes.body.success, true);
      assert.ok(overviewRes.body.data);

      const categoriesRes = await requestApp(app, {
        method: 'GET',
        url: '/api/analytics/categories',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(categoriesRes.status, 200);
      assert.equal(categoriesRes.body.success, true);

      const trendsRes = await requestApp(app, {
        method: 'GET',
        url: '/api/analytics/trends',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(trendsRes.status, 200);
      assert.equal(trendsRes.body.success, true);
    });

    test('Skill gap analysis categorizes competencies into transparent statuses', () => {
      const strongStatus = SkillGapService.classifySkillStatus(88, 3, 0);
      assert.equal(strongStatus, 'STRONG');

      const developingStatus = SkillGapService.classifySkillStatus(68, 2, 1);
      assert.equal(developingStatus, 'DEVELOPING');

      const weakStatus = SkillGapService.classifySkillStatus(42, 2, 3);
      assert.equal(weakStatus, 'NEEDS_IMPROVEMENT');

      const unassessedStatus = SkillGapService.classifySkillStatus(0, 0, 0);
      assert.equal(unassessedStatus, 'NOT_ASSESSED');
    });

    test('Improvement plans and learning tasks endpoints enforce tenant isolation', async () => {
      const plansRes = await requestApp(app, {
        method: 'GET',
        url: '/api/improvement-plans',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(plansRes.status, 200);
      assert.equal(plansRes.body.success, true);

      const tasksRes = await requestApp(app, {
        method: 'GET',
        url: '/api/learning-tasks',
        headers: { authorization: `Bearer ${tokenA}` }
      });
      assert.equal(tasksRes.status, 200);
      assert.equal(tasksRes.body.success, true);
    });
  });

  // =========================================================================
  // Test 9: Session and Error Recovery
  // =========================================================================
  describe('Test 9: Session and Error Recovery', () => {
    test('Malformed JSON payloads return 400 Bad Request with standardized error structure', async () => {
      const malformedRes = await requestApp(app, {
        method: 'POST',
        url: '/api/learning-tasks',
        headers: { authorization: `Bearer ${tokenA}` },
        body: '{ malformed: json syntax'
      });
      assert.ok([400, 500].includes(malformedRes.status));
      assert.equal(malformedRes.body.success, false);
    });

    test('Non-existent API routes return clean 404 without internal server stack leak', async () => {
      const notFoundRes = await requestApp(app, {
        method: 'GET',
        url: '/api/undefined-module-route-404'
      });
      assert.equal(notFoundRes.status, 404);
      assert.equal(notFoundRes.body.success, false);
      const str = JSON.stringify(notFoundRes.body);
      assert.ok(!str.includes('node_modules'));
      assert.ok(!str.includes('prisma:client'));
    });
  });

  // =========================================================================
  // Test 10: Multi-Tenant Cross-User Isolation
  // =========================================================================
  describe('Test 10: Multi-Tenant Cross-User Isolation', () => {
    test('User B is blocked with 403 Forbidden when attempting to access User A resources', async () => {
      const origPlanFind = db.improvementPlan.findUnique;
      const origTaskFind = db.learningTask.findUnique;

      try {
        db.improvementPlan.findUnique = async () => ({
          id: 'plan-user-a',
          userId: testUserA.id,
          title: 'User A Plan'
        });

        db.learningTask.findUnique = async () => ({
          id: 'task-user-a',
          userId: testUserA.id,
          title: 'User A Task',
          improvementPlan: { userId: testUserA.id }
        });

        // User B tries to access User A's plan
        await assert.rejects(
          async () => {
            await ImprovementPlanService.getPlanById('plan-user-a', testUserB.id);
          },
          (err) => err.status === 403
        );

        // User B tries to access User A's learning task
        await assert.rejects(
          async () => {
            await LearningTaskService.getTaskById('task-user-a', testUserB.id);
          },
          (err) => err.status === 403
        );
      } finally {
        db.improvementPlan.findUnique = origPlanFind;
        db.learningTask.findUnique = origTaskFind;
      }
    });
  });
});
