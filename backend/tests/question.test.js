import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import {
  generateQuestionsSchema,
  queryQuestionsSchema,
  updateQuestionSchema,
  validateGeneratedQuestionsOutput
} from '../src/validators/question.validator.js';
import {
  QUESTION_PROMPT_VERSION,
  getQuestionGenerationSystemPrompt,
  buildQuestionGenerationUserPrompt
} from '../src/prompts/questionGeneration.prompt.js';
import { OpenAIService } from '../src/services/openai.service.js';
import { QuestionService } from '../src/services/question.service.js';
import { generateAuthTokens } from '../src/utils/tokens.js';
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

// Valid Sample AI Questions Payload
const sampleValidAiOutput = {
  questions: [
    {
      question: 'Explain how Node.js event loop handles microtasks versus macrotasks with setImmediate and process.nextTick.',
      category: 'TECHNICAL',
      subcategory: 'Event-Driven Concurrency',
      difficulty: 'HARD',
      relatedSkills: ['Node.js', 'JavaScript'],
      description: 'Senior backend concurrency evaluation.',
      expectedConcepts: ['libuv event loop phases', 'process.nextTick queue', 'Microtask checkpoint'],
      hints: ['Consider which phase runs immediately after the poll phase.'],
      referenceAnswer: 'process.nextTick executes immediately after the current operation finishes, before entering subsequent event loop phases...',
      explanation: 'Critical for diagnosing event loop starvation and high-throughput async latency.',
      evaluationCriteria: ['Explains libuv queue hierarchy', 'Identifies microtask priority'],
      followUpQuestions: ['How would you debug CPU-bound starvation in Node?'],
      estimatedTime: 5,
      tags: ['nodejs', 'concurrency']
    },
    {
      question: 'Describe a situation where you had to push back on unrealistic product deadlines while maintaining cross-functional trust.',
      category: 'HR',
      subcategory: 'Stakeholder Communication',
      difficulty: 'MEDIUM',
      relatedSkills: ['Communication', 'Leadership'],
      description: 'Behavioral STAR evaluation.',
      expectedConcepts: ['Situation context', 'Action taken', 'Transparent roadmap trade-offs', 'Outcome'],
      hints: ['Use the STAR framework to structure your answer.'],
      referenceAnswer: 'In my previous project, we were asked to deliver 6 major features in 2 weeks. I quantified technical debt and presented prioritized scopes...',
      explanation: 'Assesses diplomatic conflict resolution and technical trade-off negotiation.',
      evaluationCriteria: ['Focuses on collaborative data-driven trade-offs'],
      followUpQuestions: ['What would you do if executive leadership insisted anyway?'],
      estimatedTime: 4,
      tags: ['behavioral', 'communication']
    },
    {
      question: 'Design a distributed rate limiter supporting 100,000 requests per second across multi-region clusters.',
      category: 'SYSTEM_DESIGN',
      subcategory: 'Distributed Architecture',
      difficulty: 'HARD',
      relatedSkills: ['System Design', 'Redis'],
      description: 'High-concurrency infrastructure question.',
      expectedConcepts: ['Token Bucket or Sliding Window Log', 'Redis cluster', 'Race conditions & Lua scripts'],
      hints: ['Consider distributed race conditions when counter increments occur across replicas.'],
      referenceAnswer: 'A hybrid approach using local in-memory token buckets combined with Redis centralized synchronizations using Lua scripts...',
      explanation: 'Evaluates distributed systems understanding, network latency, and fault tolerance.',
      evaluationCriteria: ['Addresses clock drift and network partition scenarios'],
      followUpQuestions: ['How do you handle Redis cluster failover without dropping limits?'],
      estimatedTime: 10,
      tags: ['system-design', 'rate-limiter']
    },
    {
      question: 'You notice database CPU spikes to 100% after a deployment. How do you triage and resolve the incident?',
      category: 'SCENARIO',
      subcategory: 'Production Incident Triage',
      difficulty: 'MEDIUM',
      relatedSkills: ['PostgreSQL', 'Performance'],
      description: 'Production outage investigation.',
      expectedConcepts: ['pg_stat_activity', 'Query EXPLAIN ANALYZE', 'Missing indexes', 'Rollback decision'],
      hints: ['Check currently executing queries and recently migrated queries.'],
      referenceAnswer: 'First isolate running slow queries with pg_stat_activity, kill hanging transactions if locks exist, evaluate sequential scans, and rollback if newly deployed query lacks indexing...',
      explanation: 'Assesses calm structured incident response under high-stress outages.',
      evaluationCriteria: ['Prioritizes user service availability before root-cause analysis'],
      followUpQuestions: ['How do you ensure slow queries do not reach production again?'],
      estimatedTime: 6,
      tags: ['database', 'incident-response']
    }
  ],
  codingChallenges: [
    {
      title: 'Top K Frequent System Events',
      description: 'Given an array of event logs and an integer k, return the k most frequent event identifiers in O(n log k) time.',
      category: 'Algorithms',
      difficulty: 'MEDIUM',
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      constraints: ['1 <= events.length <= 10^5', 'k is in range [1, unique events count]'],
      inputFormat: 'events = ["click", "login", "click", "logout", "click"], k = 2',
      outputFormat: '["click", "login"]',
      sampleInput: '["click", "login", "click"], k = 1',
      sampleOutput: '["click"]',
      explanation: 'Event "click" appears 2 times, which is the most frequent.',
      hints: ['Use a hash map to count frequencies and a min-heap of size k.'],
      expectedTimeComplexity: 'O(n log k)',
      expectedSpaceComplexity: 'O(n)',
      timeLimit: 2000,
      memoryLimit: 128,
      testCases: [
        {
          input: '["a", "a", "b"], 1',
          expectedOutput: '["a"]',
          isHidden: false
        },
        {
          input: '["x", "y", "z"], 3',
          expectedOutput: '["x", "y", "z"]',
          isHidden: false
        },
        {
          input: 'Large scale synthetic stream input',
          expectedOutput: '["top_freq_item"]',
          isHidden: true
        }
      ]
    }
  ]
};

describe('InterviewAI Phase 7: AI-Powered Question Generation Test Suite', () => {
  afterEach(() => {
    OpenAIService.__setMockHandler(null);
  });

  // ==========================================
  // 1. Zod Validation & Schema Enforcement
  // ==========================================
  describe('1. Question Generator Request & Response Schemas', () => {
    test('generateQuestionsSchema validates valid options with defaults', () => {
      const parsed = generateQuestionsSchema.parse({
        category: 'TECHNICAL',
        difficulty: 'HARD',
        count: 10
      });

      assert.equal(parsed.category, 'TECHNICAL');
      assert.equal(parsed.difficulty, 'HARD');
      assert.equal(parsed.count, 10);
      assert.equal(parsed.includeExplanations, true);
      assert.equal(parsed.language, 'JavaScript');
    });

    test('generateQuestionsSchema rejects count outside 1-20 bounds', () => {
      assert.throws(
        () => generateQuestionsSchema.parse({ count: 50 }),
        (err) => {
          assert.ok(err.issues.some((i) => i.path.includes('count')));
          return true;
        }
      );
    });

    test('queryQuestionsSchema parses pagination with valid defaults', () => {
      const parsed = queryQuestionsSchema.parse({});
      assert.equal(parsed.page, 1);
      assert.equal(parsed.limit, 10);
      assert.equal(parsed.sortOrder, 'asc');
    });

    test('validateGeneratedQuestionsOutput successfully validates multi-category AI response', () => {
      const validated = validateGeneratedQuestionsOutput(sampleValidAiOutput);
      assert.equal(validated.questions.length, 4);
      assert.equal(validated.codingChallenges.length, 1);
      assert.equal(validated.questions[0].category, 'TECHNICAL');
      assert.equal(validated.questions[1].category, 'HR');
      assert.equal(validated.codingChallenges[0].testCases.length, 3);
    });

    test('validateGeneratedQuestionsOutput normalizes LLM variations (TitleCase, spaces, null codingChallenges)', () => {
      const variations = {
        questions: [
          {
            question: 'Explain how React virtual DOM reconciles diffs.',
            category: 'Technical',
            difficulty: 'Medium',
            estimatedTime: '5'
          },
          {
            question: 'Design a high throughput rate limiter system.',
            category: 'System Design',
            difficulty: 'Hard',
            estimatedTime: 10
          }
        ],
        codingChallenges: null
      };

      const validated = validateGeneratedQuestionsOutput(variations);
      assert.equal(validated.questions.length, 2);
      assert.equal(validated.questions[0].category, 'TECHNICAL');
      assert.equal(validated.questions[0].difficulty, 'MEDIUM');
      assert.equal(validated.questions[0].estimatedTime, 5);
      assert.equal(validated.questions[1].category, 'SYSTEM_DESIGN');
      assert.equal(validated.questions[1].difficulty, 'HARD');
      assert.equal(validated.codingChallenges.length, 0);
    });

    test('validateGeneratedQuestionsOutput coerces non-string test case inputs and stringified numbers', () => {
      const variations = {
        questions: [],
        codingChallenges: [
          {
            title: 'Two Sum Problem',
            description: 'Find two numbers that add up to target.',
            timeLimit: '2000ms',
            memoryLimit: '128MB',
            testCases: [
              {
                input: [1, 2, 3],
                expectedOutput: [0, 1]
              }
            ]
          }
        ]
      };

      const validated = validateGeneratedQuestionsOutput(variations);
      assert.equal(validated.codingChallenges.length, 1);
      assert.equal(validated.codingChallenges[0].timeLimit, 2000);
      assert.equal(validated.codingChallenges[0].memoryLimit, 128);
      assert.equal(validated.codingChallenges[0].testCases[0].input, '[1,2,3]');
      assert.equal(validated.codingChallenges[0].testCases[0].expectedOutput, '[0,1]');
    });

    test('validateGeneratedQuestionsOutput rejects question missing required question text', () => {
      const invalid = JSON.parse(JSON.stringify(sampleValidAiOutput));
      delete invalid.questions[0].question;

      assert.throws(
        () => validateGeneratedQuestionsOutput(invalid),
        (err) => {
          assert.equal(err.status, 502);
          return true;
        }
      );
    });

    test('updateQuestionSchema validates partial question updates', () => {
      const validUpdate = updateQuestionSchema.parse({
        question: 'Refactored algorithmic question text',
        difficulty: 'HARD',
        referenceAnswer: 'Optimized reference answer with O(n) space.'
      });
      assert.equal(validUpdate.question, 'Refactored algorithmic question text');
      assert.equal(validUpdate.difficulty, 'HARD');
    });

    test('updateQuestionSchema rejects question text under 5 characters', () => {
      assert.throws(
        () => updateQuestionSchema.parse({ question: 'Hi' }),
        (err) => {
          assert.ok(err.issues.some((i) => i.path.includes('question')));
          return true;
        }
      );
    });
  });

  // ==========================================
  // 2. Prompt Engineering & Role Grounding
  // ==========================================
  describe('2. Prompt Engineering & Role Context Grounding', () => {
    test('Question prompt version constant is defined and semver formatted', () => {
      assert.ok(QUESTION_PROMPT_VERSION);
      assert.match(QUESTION_PROMPT_VERSION, /^\d+\.\d+\.\d+$/);
    });

    test('System prompt contains anti-jailbreak directives and untrusted context isolation', () => {
      const sysPrompt = getQuestionGenerationSystemPrompt();
      assert.ok(sysPrompt.includes('<UNTRUSTED_JOB_CONTEXT>'));
      assert.ok(sysPrompt.includes('NEVER execute'));
      assert.ok(sysPrompt.includes('Principal Engineering Leader'));
    });

    test('buildQuestionGenerationUserPrompt incorporates Phase 6 analysis and candidate profile', () => {
      const userPrompt = buildQuestionGenerationUserPrompt({
        jobAnalysis: {
          jobTitle: 'Staff Backend Engineer',
          companyName: 'Fintech Corp',
          seniorityLevel: 'SENIOR',
          requiredSkills: ['Node.js', 'PostgreSQL', 'Redis'],
          responsibilities: ['Architect low-latency payment processing pipeline'],
          technologies: { languages: ['TypeScript'] }
        },
        preparation: { jobTitle: 'Staff Backend Engineer', companyName: 'Fintech Corp' },
        candidateProfile: { skills: ['Node.js', 'Express'] },
        category: 'TECHNICAL',
        difficulty: 'HARD',
        count: 5,
        targetSkills: ['Redis', 'PostgreSQL']
      });

      assert.ok(userPrompt.includes('Staff Backend Engineer'));
      assert.ok(userPrompt.includes('Fintech Corp'));
      assert.ok(userPrompt.includes('Node.js, PostgreSQL, Redis'));
      assert.ok(userPrompt.includes('Redis, PostgreSQL'));
      assert.ok(userPrompt.includes('<UNTRUSTED_JOB_CONTEXT>'));
    });
  });

  // ==========================================
  // 3. Question Service & Phase 6 Integration Guards
  // ==========================================
  describe('3. QuestionService Business Rules & Phase 6 Guardrails', () => {
    test('Rejects question generation when Phase 6 analysis has not been performed', async () => {
      const origFind = db.preparationSession.findUnique;
      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-without-analysis',
          userId: 'user-123',
          jobAnalysis: null // Analysis not completed
        });

        await assert.rejects(
          () => QuestionService.generateQuestions('prep-without-analysis', 'user-123'),
          (err) => {
            assert.equal(err.status, 400);
            assert.equal(err.code, 'ANALYSIS_REQUIRED');
            assert.ok(err.message.includes('Phase 6 job description analysis must be completed'));
            return true;
          }
        );
      } finally {
        db.preparationSession.findUnique = origFind;
      }
    });

    test('Enforces user ownership and blocks cross-user generation with 403', async () => {
      const origFind = db.preparationSession.findUnique;
      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-owned-by-other',
          userId: 'legitimate-owner-id',
          jobAnalysis: { id: 'analysis-1' }
        });

        await assert.rejects(
          () => QuestionService.generateQuestions('prep-owned-by-other', 'intruder-user-id'),
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

    test('Throws clear 404 when preparation session does not exist', async () => {
      const origFind = db.preparationSession.findUnique;
      try {
        db.preparationSession.findUnique = async () => null;

        await assert.rejects(
          () => QuestionService.generateQuestions('non-existent-id', 'user-123'),
          (err) => {
            assert.equal(err.status, 404);
            assert.ok(err.message.includes('Preparation session not found'));
            return true;
          }
        );
      } finally {
        db.preparationSession.findUnique = origFind;
      }
    });

    test('Detects stale analysis when job description was updated after analysis', async () => {
      const origFind = db.preparationSession.findUnique;
      const origProfile = db.userProfile.findUnique;
      const origTx = db.$transaction;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-stale',
          userId: 'user-stale',
          progress: 30,
          jobDescription: { updatedAt: new Date('2026-11-02T12:00:00Z') },
          jobAnalysis: {
            id: 'analysis-stale',
            updatedAt: new Date('2026-11-01T12:00:00Z'), // Older than JD
            requiredSkills: ['Node.js']
          },
          questions: [],
          codingChallenges: []
        });
        db.userProfile.findUnique = async () => null;

        OpenAIService.__setMockHandler(async () => ({
          questions: [
            {
              question: 'Explain how Node streams handle backpressure.',
              category: 'TECHNICAL',
              subcategory: 'Streams',
              difficulty: 'MEDIUM',
              relatedSkills: ['Node.js'],
              description: 'Stream pipeline backpressure mechanics',
              expectedConcepts: ['highWaterMark', 'drain event', 'pause/resume'],
              hints: ['Look into pipe() and drain.'],
              referenceAnswer: 'Streams use highWaterMark buffer limits...',
              explanation: 'Crucial for memory management.',
              evaluationCriteria: ['Identifies highWaterMark'],
              followUpQuestions: ['What if downstream is slow?'],
              estimatedTime: 5,
              tags: ['streams']
            }
          ],
          codingChallenges: []
        }));

        db.$transaction = async (fn) => {
          return await fn({
            interviewQuestion: {
              create: async (args) => ({ id: 'new-q-id', ...args.data })
            },
            codingChallenge: {
              create: async (args) => ({ id: 'new-c-id', ...args.data })
            },
            preparationSession: {
              update: async () => ({})
            }
          });
        };

        const result = await QuestionService.generateQuestions('prep-stale', 'user-stale', { count: 1 });
        assert.equal(result.success, true);
        assert.equal(result.data.isStaleAnalysis, true);
        assert.equal(result.data.totalCreated, 1);
      } finally {
        db.preparationSession.findUnique = origFind;
        db.userProfile.findUnique = origProfile;
        db.$transaction = origTx;
      }
    });
  });

  // ==========================================
  // 4. Coding Challenges & Hidden Test Case Masking
  // ==========================================
  describe('4. Hidden Test Case Protection & Challenge Triage', () => {
    test('getCodingChallenges masks isHidden test cases with placeholder string', async () => {
      const origFindSession = db.preparationSession.findUnique;
      const origFindChallenges = db.codingChallenge.findMany;

      try {
        db.preparationSession.findUnique = async () => ({ id: 'prep-100', userId: 'usr-1' });
        db.codingChallenge.findMany = async () => [
          {
            id: 'ch-1',
            title: 'Reverse Linked List',
            testCases: [
              { id: 'tc-1', input: '[1,2,3]', expectedOutput: '[3,2,1]', isHidden: false },
              { id: 'tc-2', input: '[Large secret array]', expectedOutput: '[Secret reversed]', isHidden: true }
            ]
          }
        ];

        const challenges = await QuestionService.getCodingChallenges('prep-100', 'usr-1');
        assert.equal(challenges.length, 1);
        assert.equal(challenges[0].testCases[0].expectedOutput, '[3,2,1]');
        assert.equal(challenges[0].testCases[1].expectedOutput, '[Hidden evaluation output]');
        assert.equal(challenges[0].testCases[1].input, '[Hidden evaluation input]');
      } finally {
        db.preparationSession.findUnique = origFindSession;
        db.codingChallenge.findMany = origFindChallenges;
      }
    });
  });

  // ==========================================
  // 5. HTTP Endpoints Security & Authentication
  // ==========================================
  describe('5. HTTP Question Generation Endpoints Security', () => {
    test('POST /api/preparations/:id/questions/generate rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'POST',
        url: '/api/preparations/test-prep-id/questions/generate',
        body: { category: 'TECHNICAL', count: 5 }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/preparations/:id/questions rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations/test-prep-id/questions'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('POST /api/preparations/:id/questions/regenerate rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'POST',
        url: '/api/preparations/test-prep-id/questions/regenerate',
        body: { category: 'HR' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/preparations/:id/coding-challenges rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/preparations/test-prep-id/coding-challenges'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/questions/:questionId rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/questions/test-question-id'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('PATCH /api/questions/:questionId rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'PATCH',
        url: '/api/questions/test-question-id',
        body: { question: 'Updated question title here' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('DELETE /api/questions/:questionId rejects unauthenticated request with 401', async () => {
      const res = await requestApp(app, {
        method: 'DELETE',
        url: '/api/questions/test-question-id'
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('Authenticated request with valid token reaches route handler and enforces preparation validation', async () => {
      const origUserFind = db.user.findUnique;
      const origSessionFind = db.preparationSession.findUnique;

      try {
        db.user.findUnique = async () => ({ id: 'test-user-id', email: 'tester@interviewai.dev', isActive: true });
        db.preparationSession.findUnique = async () => null;

        const { accessToken } = generateAuthTokens({
          id: 'test-user-id',
          email: 'tester@interviewai.dev',
          isEmailVerified: true
        });

        const res = await requestApp(app, {
          method: 'GET',
          url: '/api/preparations/non-existent-session-uuid/questions',
          headers: {
            authorization: `Bearer ${accessToken}`
          }
        });

        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
        assert.ok(res.body.message.includes('Preparation session not found'));
      } finally {
        db.user.findUnique = origUserFind;
        db.preparationSession.findUnique = origSessionFind;
      }
    });
  });
});

