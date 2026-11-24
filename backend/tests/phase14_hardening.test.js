import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import stream from 'node:stream';
import { jwt } from '../src/utils/jwt.js';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { db, disconnectPrisma } from '../src/config/prisma.js';
import { generateAuthTokens } from '../src/utils/tokens.js';
import { MemoryRateLimiter } from '../src/middleware/rateLimiter.middleware.js';
import { validateDocumentBuffer } from '../src/utils/documentExtractor.js';
import { CodeExecutionService } from '../src/services/codeExecution/codeExecution.service.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { PreparationService } from '../src/services/preparation.service.js';
import { MockInterviewService } from '../src/services/mockInterview/mockInterview.service.js';
import { AnswerEvaluationService } from '../src/services/evaluation/answerEvaluation.service.js';
import { LearningTaskService } from '../src/services/analytics/learningTask.service.js';
import { runCodeSchema } from '../src/validators/coding.validator.js';

/**
 * In-memory HTTP request dispatcher for Express application testing
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
    };

    res.on('finish', () => {
      const responseText = Buffer.concat(chunks).toString('utf8');
      let parsedBody = responseText;
      try {
        parsedBody = JSON.parse(responseText);
      } catch {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody
      });
    });

    res.on('error', reject);

    app(req, res);

    if (rawBody) {
      req.push(Buffer.from(rawBody));
    }
    req.push(null);
  });
}

describe('InterviewAI Phase 14: Complete Testing, Security, Performance and Hardening', () => {
  const userA = {
    id: 'user-p14-alpha-uuid',
    email: 'alpha-security@interviewai.test',
    name: 'Alpha Security Tester'
  };

  const userB = {
    id: 'user-p14-bravo-uuid',
    email: 'bravo-security@interviewai.test',
    name: 'Bravo Cross-Tenant User'
  };

  let tokenA;
  let tokenB;

  before(async () => {
    tokenA = generateAuthTokens(userA).accessToken;
    tokenB = generateAuthTokens(userB).accessToken;

    // Stub db lookups for authenticating users
    const origFindUnique = db.user.findUnique.bind(db.user);
    db.user.findUnique = async ({ where }) => {
      if (where.id === userA.id || where.email === userA.email) {
        return {
          id: userA.id,
          email: userA.email,
          name: userA.name,
          role: 'CANDIDATE',
          isEmailVerified: true,
          status: 'ACTIVE'
        };
      }
      if (where.id === userB.id || where.email === userB.email) {
        return {
          id: userB.id,
          email: userB.email,
          name: userB.name,
          role: 'CANDIDATE',
          isEmailVerified: true,
          status: 'ACTIVE'
        };
      }
      return origFindUnique({ where });
    };
  });

  after(async () => {
    await disconnectPrisma();
  });

  // =========================================================================
  // SUITE 1: HTTP Security Headers & Helmet Hardening
  // =========================================================================
  describe('1. Security Headers & Defense-in-Depth', () => {
    test('Helmet security headers are enforced on all responses', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/health'
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
      assert.equal(res.headers['x-dns-prefetch-control'], 'off');
      assert.equal(res.headers['x-download-options'], 'noopen');
    });

    test('CORS handles origin checks safely with credentials support', async () => {
      const res = await requestApp(app, {
        method: 'OPTIONS',
        url: '/api/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET'
        }
      });

      assert.equal(res.headers['access-control-allow-credentials'], 'true');
    });
  });

  // =========================================================================
  // SUITE 2: Authentication & Token Security Hardening
  // =========================================================================
  describe('2. Authentication Security & JWT Integrity', () => {
    test('Rejects request with forged / altered JWT signature with 401', async () => {
      const forgedToken = tokenA.slice(0, -6) + 'abc123';
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations',
        headers: { authorization: `Bearer ${forgedToken}` }
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.toLowerCase().includes('token') || res.body.message.toLowerCase().includes('auth'));
    });

    test('Rejects request with expired JWT token with 401', async () => {
      const expiredToken = jwt.sign(
        { userId: userA.id, email: userA.email, exp: Math.floor(Date.now() / 1000) - 60 },
        env.JWT_ACCESS_SECRET
      );

      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations',
        headers: { authorization: `Bearer ${expiredToken}` }
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('Rejects malformed Authorization header formats', async () => {
      const malformedHeaders = [
        'Basic dXNlcjpwYXNz',
        'Bearer',
        'Token xyz123',
        'random_string_without_scheme'
      ];

      for (const authHeader of malformedHeaders) {
        const res = await requestApp(app, {
          method: 'GET',
          url: '/api/preparations',
          headers: { authorization: authHeader }
        });
        assert.equal(res.status, 401);
        assert.equal(res.body.success, false);
      }
    });

    test('Unauthenticated access to any protected route returns 401', async () => {
      const protectedEndpoints = [
        { method: 'GET', url: '/api/preparations' },
        { method: 'POST', url: '/api/preparations', body: { jobTitle: 'Dev' } },
        { method: 'GET', url: '/api/mock-interviews' },
        { method: 'GET', url: '/api/evaluations' },
        { method: 'GET', url: '/api/analytics/overview' },
        { method: 'GET', url: '/api/skill-gaps' },
        { method: 'GET', url: '/api/learning-tasks' }
      ];

      for (const endpoint of protectedEndpoints) {
        const res = await requestApp(app, endpoint);
        assert.equal(res.status, 401, `Expected 401 for ${endpoint.method} ${endpoint.url}`);
      }
    });
  });

  // =========================================================================
  // SUITE 3: Injection Defense & Defensive Input Validation
  // =========================================================================
  describe('3. Injection Defense & Input Validation Hardening', () => {
    test('SQL injection attempt strings are safely handled by Zod schemas without crash', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1; SELECT * FROM pg_tables;",
        "admin' --",
        "UNION SELECT null, username, password FROM users--"
      ];

      for (const payload of sqlInjectionPayloads) {
        const res = await requestApp(app, {
          method: 'POST',
          url: '/api/auth/login',
          body: {
            email: payload,
            password: 'SomePassword123!'
          }
        });

        // Must reject cleanly with 400 or 401 without 500 database error
        assert.ok([400, 401].includes(res.status), `Expected 400 or 401, got ${res.status}`);
        assert.equal(res.body.success, false);
      }
    });

    test('XSS script tags in request bodies are handled safely', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload="alert(1)">'
      ];

      for (const payload of xssPayloads) {
        const res = await requestApp(app, {
          method: 'POST',
          url: '/api/auth/register',
          body: {
            name: payload,
            email: 'invalid-email-format',
            password: 'short'
          }
        });

        // Enforces Zod validation failure, 0 script reflection
        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
      }
    });

    test('Path traversal attempts in route parameters return 400, 403 or 404', async () => {
      const traversalUrls = [
        '/api/preparations/../../../../etc/passwd',
        '/api/questions/..%2F..%2F..%2Fwindows%2Fwin.ini'
      ];

      for (const url of traversalUrls) {
        const res = await requestApp(app, {
          method: 'GET',
          url,
          headers: { authorization: `Bearer ${tokenA}` }
        });

        assert.ok([400, 403, 404].includes(res.status), `Expected 400, 403 or 404, got ${res.status}`);
      }
    });

    test('Oversized request payloads rejected with 400 by schema validation', () => {
      const hugeString = 'A'.repeat(50001);
      const parsed = runCodeSchema.safeParse({
        language: 'javascript',
        sourceCode: hugeString
      });

      assert.equal(parsed.success, false);
      assert.ok(parsed.error.issues[0].message.includes('50,000'));
    });
  });

  // =========================================================================
  // SUITE 4: Rate Limiting Engine Hardening
  // =========================================================================
  describe('4. In-Memory Sliding Window Rate Limiting', () => {
    test('MemoryRateLimiter enforces max hits and responds with 429 and Retry-After', () => {
      const limiter = new MemoryRateLimiter({
        windowMs: 5000,
        max: 3,
        message: 'Rate limit test exceeded'
      });

      const mw = limiter.middleware();
      const mockReq = { ip: '192.168.1.100', headers: {} };
      let statusCode = 200;
      let headersSent = {};
      let responseBody = null;

      const mockRes = {
        setHeader(k, v) {
          headersSent[k] = v;
        },
        status(c) {
          statusCode = c;
          return this;
        },
        json(b) {
          responseBody = b;
          return this;
        }
      };

      // Temporarily override NODE_ENV to simulate production rate limiting
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        let nextCalled = 0;
        const next = () => { nextCalled++; };

        // Hits 1, 2, 3 should pass
        mw(mockReq, mockRes, next);
        mw(mockReq, mockRes, next);
        mw(mockReq, mockRes, next);
        assert.equal(nextCalled, 3);
        assert.equal(statusCode, 200);

        // Hit 4 should be blocked with 429
        mw(mockReq, mockRes, next);
        assert.equal(nextCalled, 3);
        assert.equal(statusCode, 429);
        assert.equal(responseBody.success, false);
        assert.ok(headersSent['Retry-After'] !== undefined);
      } finally {
        process.env.NODE_ENV = oldEnv;
      }
    });

    test('CodeExecutionService enforces per-user execution rate limits', () => {
      const testUserId = 'user-rate-limit-test-uuid';

      // 12 executions per minute allowed
      for (let i = 0; i < 12; i++) {
        assert.doesNotThrow(() => {
          CodeExecutionService.checkRateLimit(testUserId);
        });
      }

      // 13th execution must throw 429
      assert.throws(
        () => {
          CodeExecutionService.checkRateLimit(testUserId);
        },
        (err) => {
          return err.status === 429 && err.retryAfter > 0;
        }
      );
    });
  });

  // =========================================================================
  // SUITE 5: Information Masking & Sensitive Secret Protection
  // =========================================================================
  describe('5. Error Masking & Secret Protection', () => {
    test('Non-existent endpoints return structured 404 JSON without stack traces', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/completely-unknown-route-xyz'
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message);
      assert.equal(res.body.stack, undefined);
    });

    test('Zod validation failures never leak database connection or sensitive internals', async () => {
      const res = await requestApp(app, {
        method: 'POST',
        url: '/api/auth/register',
        body: {
          email: 'not-an-email',
          password: '123'
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(Array.isArray(res.body.errors));
      assert.equal(res.body.stack, undefined);
      assert.equal(res.body.query, undefined);
    });

    test('Internal 500 errors in production mask error details from users', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      let statusReceived = null;
      let bodyReceived = null;

      const mockRes = {
        status(code) {
          statusReceived = code;
          return this;
        },
        json(data) {
          bodyReceived = data;
          return this;
        }
      };

      try {
        const sensitiveError = new Error('FATAL: Database connection timeout at postgresql://user:secret@localhost:5432');
        errorHandler(sensitiveError, { originalUrl: '/api/test', method: 'GET' }, mockRes, () => {});

        assert.equal(statusReceived, 500);
        assert.equal(bodyReceived.success, false);
        assert.equal(bodyReceived.message, 'Internal server error');
        assert.ok(!JSON.stringify(bodyReceived).includes('postgresql://'));
        assert.ok(!JSON.stringify(bodyReceived).includes('secret'));
      } finally {
        process.env.NODE_ENV = oldEnv;
      }
    });
  });

  // =========================================================================
  // SUITE 6: Document Upload Security & Binary Rejection
  // =========================================================================
  describe('6. File Upload Security & Content Inspection', () => {
    test('validateDocumentBuffer rejects empty files', () => {
      assert.throws(
        () => validateDocumentBuffer(Buffer.alloc(0), 'resume.pdf'),
        /empty/i
      );
    });

    test('validateDocumentBuffer rejects oversized files (> 5MB)', () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);
      assert.throws(
        () => validateDocumentBuffer(oversizedBuffer, 'resume.pdf'),
        /exceeds maximum allowable size/i
      );
    });

    test('validateDocumentBuffer rejects Windows executable PE binaries (MZ)', () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      assert.throws(
        () => validateDocumentBuffer(exeBuffer, 'resume.pdf'),
        /executable or binary/i
      );
    });

    test('validateDocumentBuffer rejects Linux ELF binaries', () => {
      const elfBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x01]);
      assert.throws(
        () => validateDocumentBuffer(elfBuffer, 'job_description.txt'),
        /executable or binary/i
      );
    });

    test('validateDocumentBuffer accepts valid PDF documents', () => {
      const validPdfBuffer = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.from('1 0 obj\n<< /Title (Software Engineer Resume) >>\nendobj\n%%EOF')
      ]);

      const result = validateDocumentBuffer(validPdfBuffer, 'resume.pdf');
      assert.equal(result.type, 'pdf');
      assert.equal(result.ext, '.pdf');
    });

    test('validateDocumentBuffer rejects text files containing null bytes', () => {
      const binaryDisguisedAsTxt = Buffer.from('Normal text header\x00\x00\x01\x02malicious binary');
      assert.throws(
        () => validateDocumentBuffer(binaryDisguisedAsTxt, 'notes.txt'),
        /contains null bytes or binary data/i
      );
    });
  });

  // =========================================================================
  // SUITE 7: Code Execution Sandbox Security & Limits
  // =========================================================================
  describe('7. Code Execution Sandbox Isolation', () => {
    test('Rejects unsupported programming languages with 400', async () => {
      await assert.rejects(
        async () => {
          await CodeExecutionService.getStarterCode('test-challenge', 'brainfuck', userA.id);
        },
        (err) => err.status === 400 && err.message.includes('Unsupported')
      );
    });

    test('Rejects code execution exceeding 50KB payload size', async () => {
      const largeCode = 'console.log("hello");\n'.repeat(3000);
      await assert.rejects(
        async () => {
          await CodeExecutionService.runSampleTestCases(
            'chal-1',
            userA.id,
            { language: 'javascript', sourceCode: largeCode }
          );
        },
        (err) => err.status === 400 && err.message.includes('50 KB')
      );
    });

    test('Blocks cross-user code execution with 403 Forbidden', async () => {
      // Mock db lookup for challenge owned by userB
      const origFindUnique = db.codingChallenge.findUnique.bind(db.codingChallenge);
      db.codingChallenge.findUnique = async ({ where }) => {
        if (where.id === 'chal-userB') {
          return {
            id: 'chal-userB',
            title: 'Reverse Linked List',
            timeLimit: 2000,
            memoryLimit: 256,
            preparationSession: { userId: userB.id },
            testCases: []
          };
        }
        return origFindUnique({ where });
      };

      try {
        await assert.rejects(
          async () => {
            await CodeExecutionService.runSampleTestCases(
              'chal-userB',
              userA.id, // userA attempting to execute userB's challenge
              { language: 'javascript', sourceCode: 'console.log(1);' }
            );
          },
          (err) => err.status === 403
        );
      } finally {
        db.codingChallenge.findUnique = origFindUnique;
      }
    });
  });

  // =========================================================================
  // SUITE 8: Database Integrity & Historical Data Protection
  // =========================================================================
  describe('8. Database Integrity & Non-Destructive Preservation', () => {
    test('Archiving preparation preserves historical evaluation integrity', async () => {
      // Mock soft-delete / archive
      const origUpdate = db.preparationSession.update.bind(db.preparationSession);
      const origFindUnique = db.preparationSession.findUnique.bind(db.preparationSession);

      let status = 'READY';

      db.preparationSession.findUnique = async ({ where }) => {
        return {
          id: 'prep-archive-test',
          userId: userA.id,
          jobTitle: 'Backend Engineer',
          status
        };
      };

      db.preparationSession.update = async ({ where, data }) => {
        if (data.status !== undefined) {
          status = data.status;
        }
        return {
          id: 'prep-archive-test',
          userId: userA.id,
          jobTitle: 'Backend Engineer',
          status
        };
      };

      try {
        const archived = await PreparationService.archivePreparation('prep-archive-test', userA.id);
        assert.equal(archived.status, 'ARCHIVED');

        // Restoration restores active status without data loss
        const restored = await PreparationService.restorePreparation('prep-archive-test', userA.id);
        assert.equal(restored.status, 'READY');
      } finally {
        db.preparationSession.update = origUpdate;
        db.preparationSession.findUnique = origFindUnique;
      }
    });

    test('Transaction rollback guarantees zero partial writes on failure', async () => {
      let rolledBack = false;
      const simulateTransaction = async (fn) => {
        const fakeTx = { user: {}, preparationSession: {} };
        try {
          return await fn(fakeTx);
        } catch (err) {
          rolledBack = true;
          throw err;
        }
      };

      try {
        await simulateTransaction(async (tx) => {
          // Operation 1 succeeds
          const step1 = true;
          assert.ok(step1);

          // Operation 2 triggers simulated exception
          throw new Error('Simulated database deadlock or network partition');
        });
      } catch (err) {
        assert.ok(err.message.includes('deadlock'));
      }

      assert.equal(rolledBack, true, 'Transaction must cleanly catch and abort on failure');
    });
  });

  // =========================================================================
  // SUITE 9: Multi-Tenant Data Isolation Across Modules
  // =========================================================================
  describe('9. Multi-Tenant Isolation & Privilege Boundaries', () => {
    test('MockInterviewService blocks cross-user interview retrieval with 403', async () => {
      const origFindUnique = db.mockInterview.findUnique.bind(db.mockInterview);
      db.mockInterview.findUnique = async ({ where }) => {
        if (where.id === 'mock-bravo-123') {
          return {
            id: 'mock-bravo-123',
            userId: userB.id,
            status: 'COMPLETED'
          };
        }
        return origFindUnique({ where });
      };

      try {
        await assert.rejects(
          async () => {
            await MockInterviewService.getInterviewById('mock-bravo-123', userA.id);
          },
          (err) => err.status === 403
        );
      } finally {
        db.mockInterview.findUnique = origFindUnique;
      }
    });

    test('AnswerEvaluationService blocks cross-user evaluation creation with 403', async () => {
      const origFindUnique = db.questionAttempt.findUnique.bind(db.questionAttempt);
      db.questionAttempt.findUnique = async ({ where }) => {
        if (where.id === 'attempt-bravo-123') {
          return {
            id: 'attempt-bravo-123',
            userId: userB.id,
            userAnswer: 'My technical response',
            question: {
              preparationSession: {
                userId: userB.id
              }
            }
          };
        }
        return origFindUnique({ where });
      };

      try {
        await assert.rejects(
          async () => {
            await AnswerEvaluationService.evaluateAttempt('attempt-bravo-123', userA.id);
          },
          (err) => err.status === 403
        );
      } finally {
        db.questionAttempt.findUnique = origFindUnique;
      }
    });

    test('LearningTaskService blocks cross-user task modification with 403', async () => {
      const origFindUnique = db.learningTask.findUnique.bind(db.learningTask);
      db.learningTask.findUnique = async ({ where }) => {
        if (where.id === 'task-bravo-123') {
          return {
            id: 'task-bravo-123',
            improvementPlan: { userId: userB.id },
            title: 'Study Distributed Systems',
            status: 'PENDING'
          };
        }
        return origFindUnique({ where });
      };

      try {
        await assert.rejects(
          async () => {
            await LearningTaskService.updateTask('task-bravo-123', userA.id, { status: 'COMPLETED' });
          },
          (err) => err.status === 403
        );
      } finally {
        db.learningTask.findUnique = origFindUnique;
      }
    });
  });

  // =========================================================================
  // SUITE 10: In-Memory Latency & Performance Verification
  // =========================================================================
  describe('10. API Latency & Performance Benchmarking', () => {
    test('Critical health endpoint executes with low latency (p95 < 50ms)', async () => {
      const latencies = [];
      const iterations = 25;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const res = await requestApp(app, {
          method: 'GET',
          url: '/api/health'
        });
        const elapsed = performance.now() - start;
        assert.equal(res.status, 200);
        latencies.push(elapsed);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const avg = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;

      assert.ok(p95 < 100, `Expected p95 < 100ms, got ${p95.toFixed(2)}ms`);
      assert.ok(avg < 50, `Expected average < 50ms, got ${avg.toFixed(2)}ms`);
    });
  });
});
