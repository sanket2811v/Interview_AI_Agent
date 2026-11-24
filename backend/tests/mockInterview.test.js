import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockInterviewSchema,
  submitAnswerSchema,
  actionSchema,
  queryInterviewsSchema
} from '../src/validators/mockInterview.validator.js';
import {
  buildInterviewerSystemPrompt,
  buildInterviewerTurnPrompt,
  MOCK_INTERVIEW_PROMPT_VERSION
} from '../src/prompts/mockInterview.prompt.js';
import { InterviewerService } from '../src/services/mockInterview/interviewer.service.js';
import { MockInterviewService } from '../src/services/mockInterview/mockInterview.service.js';
import { env } from '../src/config/env.js';
import { db } from '../src/config/prisma.js';

describe('InterviewAI Phase 10: AI Mock Interview Engine Test Suite', () => {
  // ==========================================
  // 1. Validator Schemas & Input Boundary Tests
  // ==========================================
  describe('1. Zod Request Validators & Boundaries', () => {
    test('createMockInterviewSchema validates required UUID and applies sensible defaults', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = createMockInterviewSchema.safeParse({
        preparationSessionId: validUuid
      });

      assert.equal(result.success, true);
      assert.equal(result.data.interviewType, 'TECHNICAL');
      assert.equal(result.data.difficulty, 'MEDIUM');
      assert.equal(result.data.experienceLevel, 'MID');
      assert.equal(result.data.durationMinutes, 30);
      assert.equal(result.data.questionLimit, 5);
      assert.equal(result.data.interviewerPersonality, 'Professional');
      assert.equal(result.data.language, 'English');
      assert.equal(result.data.preferences.allowHints, true);
    });

    test('createMockInterviewSchema rejects non-UUID preparationSessionId', () => {
      const result = createMockInterviewSchema.safeParse({
        preparationSessionId: 'invalid-not-a-uuid'
      });
      assert.equal(result.success, false);
      assert.ok(result.error.issues[0].message.includes('UUID'));
    });

    test('createMockInterviewSchema enforces bounds on duration and questionLimit', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const tooShort = createMockInterviewSchema.safeParse({
        preparationSessionId: validUuid,
        durationMinutes: 5 // min is 10
      });
      assert.equal(tooShort.success, false);

      const tooFewQuestions = createMockInterviewSchema.safeParse({
        preparationSessionId: validUuid,
        questionLimit: 1 // min is 3
      });
      assert.equal(tooFewQuestions.success, false);

      const tooManyQuestions = createMockInterviewSchema.safeParse({
        preparationSessionId: validUuid,
        questionLimit: 25 // max is 20
      });
      assert.equal(tooManyQuestions.success, false);
    });

    test('createMockInterviewSchema accepts all 6 supported interview types', () => {
      const types = ['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'MIXED'];
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      for (const t of types) {
        const res = createMockInterviewSchema.safeParse({
          preparationSessionId: validUuid,
          interviewType: t
        });
        assert.equal(res.success, true);
        assert.equal(res.data.interviewType, t);
      }
    });

    test('submitAnswerSchema validates answer bounds and rejects empty/oversized strings', () => {
      const empty = submitAnswerSchema.safeParse({ content: '' });
      assert.equal(empty.success, false);

      const whitespace = submitAnswerSchema.safeParse({ content: '    ' });
      assert.equal(whitespace.success, false);

      const valid = submitAnswerSchema.safeParse({ content: 'I used Redis for caching.' });
      assert.equal(valid.success, true);

      const oversized = submitAnswerSchema.safeParse({ content: 'a'.repeat(10001) });
      assert.equal(oversized.success, false);
    });

    test('actionSchema enforces valid actionType enumeration', () => {
      assert.equal(actionSchema.safeParse({ actionType: 'CLARIFY' }).success, true);
      assert.equal(actionSchema.safeParse({ actionType: 'HINT' }).success, true);
      assert.equal(actionSchema.safeParse({ actionType: 'SKIP' }).success, true);
      assert.equal(actionSchema.safeParse({ actionType: 'GIVE_UP' }).success, false);
    });

    test('queryInterviewsSchema handles pagination defaults and limits', () => {
      const parsed = queryInterviewsSchema.parse({});
      assert.equal(parsed.page, 1);
      assert.equal(parsed.limit, 10);

      const invalid = queryInterviewsSchema.safeParse({ limit: 100 });
      assert.equal(invalid.success, false); // max is 50
    });
  });

  // ==========================================
  // 2. Prompt Engineering & Persona Directives
  // ==========================================
  describe('2. Prompt Engineering, Mode Directives & Anti-Jailbreak Protection', () => {
    test('buildInterviewerSystemPrompt generates mode directives for all interview modes', () => {
      const modes = ['HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'MIXED', 'TECHNICAL'];
      for (const mode of modes) {
        const prompt = buildInterviewerSystemPrompt({
          interviewType: mode,
          difficulty: 'HARD',
          experienceLevel: 'SENIOR',
          interviewerPersonality: 'Professional',
          language: 'English',
          durationMinutes: 45,
          questionLimit: 6,
          companyName: 'Acme Cloud',
          jobTitle: 'Senior Infrastructure Engineer'
        });

        assert.ok(prompt.includes('Acme Cloud'));
        assert.ok(prompt.includes('Senior Infrastructure Engineer'));
        assert.ok(prompt.includes('SENIOR'));
        assert.ok(prompt.includes('HARD'));
        assert.ok(prompt.includes('ANTI-JAILBREAK DIRECTIVES'));
        assert.ok(prompt.includes('STRUCTURED OUTPUT FORMAT'));
      }
    });

    test('buildInterviewerSystemPrompt injects distinct personality styles', () => {
      const personalities = ['Friendly', 'Strict', 'Supportive', 'Challenging', 'Professional'];
      for (const p of personalities) {
        const prompt = buildInterviewerSystemPrompt({
          interviewType: 'TECHNICAL',
          difficulty: 'MEDIUM',
          experienceLevel: 'MID',
          interviewerPersonality: p,
          language: 'English',
          durationMinutes: 30,
          questionLimit: 5,
          companyName: 'TechCorp',
          jobTitle: 'Full-Stack Developer'
        });
        assert.ok(prompt.includes(p));
      }
    });

    test('buildInterviewerTurnPrompt structures context, progress, and action flags', () => {
      const turnPrompt = buildInterviewerTurnPrompt({
        jobDescriptionSummary: 'Build high-scale React and Node.js APIs',
        requiredSkills: ['Node.js', 'PostgreSQL', 'Docker'],
        conversationHistory: [{ role: 'USER', content: 'I designed the auth microservice' }],
        candidateInput: 'I used Redis for refresh token rotation',
        actionType: null,
        currentQuestionIndex: 2,
        totalQuestionLimit: 5
      });

      assert.ok(turnPrompt.includes('Node.js, PostgreSQL, Docker'));
      assert.ok(turnPrompt.includes('Question 3 of 5'));
      assert.ok(turnPrompt.includes('I used Redis for refresh token rotation'));
    });

    test('buildInterviewerTurnPrompt correctly formats candidate action triggers (HINT / CLARIFY / SKIP)', () => {
      const hintPrompt = buildInterviewerTurnPrompt({
        jobDescriptionSummary: 'Distributed systems backend engineer',
        requiredSkills: ['Kafka', 'Go'],
        conversationHistory: [],
        candidateInput: null,
        actionType: 'HINT',
        currentQuestionIndex: 1,
        totalQuestionLimit: 4
      });
      assert.ok(hintPrompt.includes('CANDIDATE ACTION: The candidate requested a hint'));

      const skipPrompt = buildInterviewerTurnPrompt({
        jobDescriptionSummary: 'Frontend engineer',
        requiredSkills: ['React'],
        conversationHistory: [],
        candidateInput: null,
        actionType: 'SKIP',
        currentQuestionIndex: 3,
        totalQuestionLimit: 5
      });
      assert.ok(skipPrompt.includes('CANDIDATE ACTION: The candidate requested to skip'));
    });
  });

  // ==========================================
  // 3. InterviewerService AI Layer & Fallbacks
  // ==========================================
  describe('3. InterviewerService Turn Generation & Mock Hooks', () => {
    test('InterviewerService executes mock handler when set in test environment', async () => {
      InterviewerService.__setMockHandler(async ({ actionType }) => {
        return {
          content: 'Hello! I am your interviewer today. Could you tell me about your experience with Prisma ORM?',
          messageType: 'INTRODUCTION',
          isMainQuestion: true,
          isFollowUp: false,
          detectedTopic: 'ORM and Databases',
          shouldContinue: true
        };
      });

      try {
        const response = await InterviewerService.generateInterviewerTurn({
          interview: { interviewType: 'TECHNICAL', difficulty: 'MEDIUM', questionLimit: 5 },
          preparation: { companyName: 'Stripe', jobTitle: 'Backend Engineer' },
          conversationHistory: []
        });

        assert.equal(response.messageType, 'INTRODUCTION');
        assert.ok(response.content.includes('Prisma ORM'));
        assert.equal(response.detectedTopic, 'ORM and Databases');
        assert.equal(response.shouldContinue, true);
      } finally {
        InterviewerService.__setMockHandler(null);
      }
    });

    test('InterviewerService throws 503 if OpenAI API key is missing and no mock handler is set', async () => {
      // Temporarily ensure no mock handler
      InterviewerService.__setMockHandler(null);

      // Even if env has a key, when missing it raises 503
      const origKey = process.env.OPENAI_API_KEY;
      const origEnvKey = env.OPENAI_API_KEY;
      try {
        delete process.env.OPENAI_API_KEY;
        env.OPENAI_API_KEY = '';
        await assert.rejects(
          async () => {
            await InterviewerService.generateInterviewerTurn({
              interview: { interviewType: 'TECHNICAL' },
              preparation: { companyName: 'Test' }
            });
          },
          (err) => err.status === 503 || err.code === 'OPENAI_KEY_MISSING' || err.message.includes('API Key')
        );
      } finally {
        if (origKey) process.env.OPENAI_API_KEY = origKey;
        env.OPENAI_API_KEY = origEnvKey;
      }
    });
  });

  // ==========================================
  // 4. MockInterviewService Session Lifecycle
  // ==========================================
  describe('4. MockInterviewService Session Management & State Transitions', () => {
    function setupLifecycleMock() {
      InterviewerService.__setMockHandler(async ({ actionType, candidateInput }) => {
        if (actionType === 'HINT') {
          return {
            content: 'Here is a hint: Consider using a hash map to achieve O(1) lookups.',
            messageType: 'HINT',
            isMainQuestion: false,
            isFollowUp: false,
            detectedTopic: 'Data Structures',
            shouldContinue: true
          };
        }
        if (actionType === 'SKIP') {
          return {
            content: 'No problem, let us move on to the next topic. How do you handle database connection pooling in Express?',
            messageType: 'MAIN_QUESTION',
            isMainQuestion: true,
            isFollowUp: false,
            detectedTopic: 'Databases',
            shouldContinue: true
          };
        }
        if (candidateInput) {
          return {
            content: 'Good explanation. How would that approach perform under high write throughput?',
            messageType: 'FOLLOW_UP',
            isMainQuestion: false,
            isFollowUp: true,
            detectedTopic: 'Scalability',
            shouldContinue: true
          };
        }
        return {
          content: 'Welcome! Can you explain the difference between optimistic and pessimistic locking?',
          messageType: 'MAIN_QUESTION',
          isMainQuestion: true,
          isFollowUp: false,
          detectedTopic: 'Concurrency',
          shouldContinue: true
        };
      });
    }

    test('createInterview validates preparation ownership and initializes session', async () => {
      setupLifecycleMock();
      const origFindUnique = db.preparationSession.findUnique;
      const origCreateInterview = db.mockInterview.create;
      const origCreateMessage = db.interviewMessage.create;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-123',
          userId: 'user-alice',
          companyName: 'Google',
          jobTitle: 'Senior Software Engineer'
        });

        let createdSessionData = null;
        db.mockInterview.create = async ({ data }) => {
          createdSessionData = data;
          return { id: 'mock-100', ...data };
        };

        let createdMsgData = null;
        db.interviewMessage.create = async ({ data }) => {
          createdMsgData = data;
          return { id: 'msg-1', ...data };
        };

        // Call createInterview
        const interview = await MockInterviewService.createInterview('user-alice', {
          preparationSessionId: 'prep-123',
          interviewType: 'TECHNICAL',
          difficulty: 'HARD',
          questionLimit: 5
        });

        assert.equal(interview.id, 'mock-100');
        assert.equal(createdSessionData.userId, 'user-alice');
        assert.equal(createdSessionData.status, 'IN_PROGRESS');
        assert.equal(createdSessionData.currentQuestionIndex, 1);
        assert.ok(interview.firstMessage);
        assert.equal(createdMsgData.role, 'ASSISTANT');
      } finally {
        db.preparationSession.findUnique = origFindUnique;
        db.mockInterview.create = origCreateInterview;
        db.interviewMessage.create = origCreateMessage;
      }
    });

    test('createInterview rejects access when preparation belongs to a different user (403 Forbidden)', async () => {
      const origFindUnique = db.preparationSession.findUnique;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-123',
          userId: 'user-bob', // Bob owns it, but Alice is requesting
          companyName: 'Meta'
        });

        await assert.rejects(
          async () => {
            await MockInterviewService.createInterview('user-alice', {
              preparationSessionId: 'prep-123'
            });
          },
          (err) => err.status === 403
        );
      } finally {
        db.preparationSession.findUnique = origFindUnique;
      }
    });

    test('submitAnswer records user response and triggers interviewer reply', async () => {
      setupLifecycleMock();
      const origFindUnique = db.mockInterview.findUnique;
      const origCreateMessage = db.interviewMessage.create;
      const origUpdate = db.mockInterview.update;

      try {
        db.mockInterview.findUnique = async () => ({
          id: 'mock-100',
          userId: 'user-alice',
          status: 'IN_PROGRESS',
          questionLimit: 5,
          currentQuestionIndex: 1,
          preparationSession: {
            companyName: 'Google',
            jobTitle: 'Senior Software Engineer'
          },
          messages: [
            {
              id: 'msg-1',
              role: 'ASSISTANT',
              content: 'What is pessimistic locking?',
              sequenceNumber: 1
            }
          ]
        });

        const messagesCreated = [];
        db.interviewMessage.create = async ({ data }) => {
          messagesCreated.push(data);
          return { id: `msg-${messagesCreated.length + 1}`, ...data };
        };

        db.mockInterview.update = async ({ data }) => ({
          id: 'mock-100',
          ...data
        });

        const result = await MockInterviewService.submitAnswer('mock-100', 'user-alice', {
          content: 'Pessimistic locking takes a lock on the database row to prevent concurrent updates.'
        });

        assert.ok(result.userMessage);
        assert.equal(result.userMessage.role, 'USER');
        assert.ok(result.assistantMessage);
        assert.equal(result.assistantMessage.role, 'ASSISTANT');
        assert.equal(result.assistantMessage.messageType, 'FOLLOW_UP');
        assert.equal(messagesCreated.length, 2); // 1 USER answer, 1 ASSISTANT follow-up
      } finally {
        db.mockInterview.findUnique = origFindUnique;
        db.interviewMessage.create = origCreateMessage;
        db.mockInterview.update = origUpdate;
      }
    });

    test('submitAnswer prevents submissions on completed or paused interviews', async () => {
      const origFindUnique = db.mockInterview.findUnique;

      try {
        // Test Paused
        db.mockInterview.findUnique = async () => ({
          id: 'mock-paused',
          userId: 'user-alice',
          status: 'PAUSED',
          messages: []
        });

        await assert.rejects(
          async () => {
            await MockInterviewService.submitAnswer('mock-paused', 'user-alice', {
              content: 'My answer'
            });
          },
          (err) => err.status === 400 && err.message.includes('paused')
        );

        // Test Completed
        db.mockInterview.findUnique = async () => ({
          id: 'mock-completed',
          userId: 'user-alice',
          status: 'COMPLETED',
          messages: []
        });

        await assert.rejects(
          async () => {
            await MockInterviewService.submitAnswer('mock-completed', 'user-alice', {
              content: 'My answer'
            });
          },
          (err) => err.status === 400 && err.message.includes('completed')
        );
      } finally {
        db.mockInterview.findUnique = origFindUnique;
      }
    });

    test('performAction handles HINT requests without advancing the main question counter', async () => {
      setupLifecycleMock();
      const origFindUnique = db.mockInterview.findUnique;
      const origCreateMessage = db.interviewMessage.create;
      const origUpdate = db.mockInterview.update;

      try {
        db.mockInterview.findUnique = async () => ({
          id: 'mock-100',
          userId: 'user-alice',
          status: 'IN_PROGRESS',
          questionLimit: 5,
          currentQuestionIndex: 2,
          preferences: { allowHints: true },
          preparationSession: { companyName: 'Amazon', jobTitle: 'SDE 2' },
          messages: []
        });

        let savedActionMessage = null;
        let savedAssistantHint = null;
        db.interviewMessage.create = async ({ data }) => {
          if (data.role === 'USER') savedActionMessage = data;
          if (data.role === 'ASSISTANT') savedAssistantHint = data;
          return { id: 'msg-action', ...data };
        };

        let updatedIndex = null;
        db.mockInterview.update = async ({ data }) => {
          updatedIndex = data.currentQuestionIndex;
          return { id: 'mock-100', ...data };
        };

        const result = await MockInterviewService.performAction('mock-100', 'user-alice', {
          actionType: 'HINT'
        });

        assert.equal(result.actionMessage.messageType, 'HINT');
        assert.equal(result.assistantMessage.messageType, 'HINT');
        assert.ok(result.assistantMessage.content.includes('hint'));
        // Hint should NOT advance the question index
        assert.equal(updatedIndex, 2);
      } finally {
        db.mockInterview.findUnique = origFindUnique;
        db.interviewMessage.create = origCreateMessage;
        db.mockInterview.update = origUpdate;
      }
    });

    test('performAction handles SKIP requests and advances question index', async () => {
      setupLifecycleMock();
      const origFindUnique = db.mockInterview.findUnique;
      const origCreateMessage = db.interviewMessage.create;
      const origUpdate = db.mockInterview.update;

      try {
        db.mockInterview.findUnique = async () => ({
          id: 'mock-100',
          userId: 'user-alice',
          status: 'IN_PROGRESS',
          questionLimit: 5,
          currentQuestionIndex: 2,
          preferences: { allowSkip: true },
          preparationSession: { companyName: 'Amazon', jobTitle: 'SDE 2' },
          messages: []
        });

        db.interviewMessage.create = async ({ data }) => ({ id: 'msg-skip', ...data });

        let updatedIndex = null;
        db.mockInterview.update = async ({ data }) => {
          updatedIndex = data.currentQuestionIndex;
          return { id: 'mock-100', ...data };
        };

        const result = await MockInterviewService.performAction('mock-100', 'user-alice', {
          actionType: 'SKIP'
        });

        assert.equal(result.actionMessage.role, 'USER');
        assert.equal(result.assistantMessage.role, 'ASSISTANT');
        // SKIP advances the question index from 2 to 3
        assert.equal(updatedIndex, 3);
      } finally {
        db.mockInterview.findUnique = origFindUnique;
        db.interviewMessage.create = origCreateMessage;
        db.mockInterview.update = origUpdate;
      }
    });

    test('pauseInterview and resumeInterview enforce strict valid state transitions', async () => {
      const origFindUnique = db.mockInterview.findUnique;
      const origUpdate = db.mockInterview.update;

      try {
        // 1. Pause an IN_PROGRESS session
        db.mockInterview.findUnique = async () => ({
          id: 'mock-active',
          userId: 'user-alice',
          status: 'IN_PROGRESS'
        });

        let updatedStatus = null;
        db.mockInterview.update = async ({ data }) => {
          updatedStatus = data.status;
          return { id: 'mock-active', ...data };
        };

        const paused = await MockInterviewService.pauseInterview('mock-active', 'user-alice');
        assert.equal(paused.status, 'PAUSED');

        // 2. Cannot pause an already PAUSED session
        db.mockInterview.findUnique = async () => ({
          id: 'mock-already-paused',
          userId: 'user-alice',
          status: 'PAUSED'
        });

        await assert.rejects(
          async () => {
            await MockInterviewService.pauseInterview('mock-already-paused', 'user-alice');
          },
          (err) => err.status === 400 && err.message.includes('Only in-progress')
        );

        // 3. Resume a PAUSED session
        const resumed = await MockInterviewService.resumeInterview('mock-already-paused', 'user-alice');
        assert.equal(resumed.status, 'IN_PROGRESS');

        // 4. Cannot resume an IN_PROGRESS session
        db.mockInterview.findUnique = async () => ({
          id: 'mock-in-progress',
          userId: 'user-alice',
          status: 'IN_PROGRESS'
        });

        await assert.rejects(
          async () => {
            await MockInterviewService.resumeInterview('mock-in-progress', 'user-alice');
          },
          (err) => err.status === 400 && err.message.includes('Only paused')
        );
      } finally {
        db.mockInterview.findUnique = origFindUnique;
        db.mockInterview.update = origUpdate;
      }
    });

    test('endInterview calculates final duration and updates status to COMPLETED', async () => {
      const origFindUnique = db.mockInterview.findUnique;
      const origUpdate = db.mockInterview.update;
      const origCreateMessage = db.interviewMessage.create;

      try {
        const startedAt = new Date(Date.now() - 25 * 60 * 1000); // 25 mins ago
        db.mockInterview.findUnique = async () => ({
          id: 'mock-end',
          userId: 'user-alice',
          status: 'IN_PROGRESS',
          interviewType: 'TECHNICAL',
          startedAt,
          messages: [{ sequenceNumber: 8 }]
        });

        let finalPayload = null;
        db.mockInterview.update = async ({ data }) => {
          finalPayload = data;
          return { id: 'mock-end', ...data };
        };

        db.interviewMessage.create = async ({ data }) => ({ id: 'msg-close', ...data });

        const ended = await MockInterviewService.endInterview('mock-end', 'user-alice');

        assert.equal(ended.status, 'COMPLETED');
        assert.ok(ended.completedAt);
        assert.ok(finalPayload.durationMinutes >= 24 && finalPayload.durationMinutes <= 26);
      } finally {
        db.mockInterview.findUnique = origFindUnique;
        db.mockInterview.update = origUpdate;
        db.interviewMessage.create = origCreateMessage;
      }
    });

    test('getInterviewById enforces multi-tenant ownership protection (403 Forbidden)', async () => {
      const origFindUnique = db.mockInterview.findUnique;

      try {
        db.mockInterview.findUnique = async () => ({
          id: 'mock-secret',
          userId: 'user-bob', // Bob owns it
          preparationSession: {},
          messages: []
        });

        await assert.rejects(
          async () => {
            await MockInterviewService.getInterviewById('mock-secret', 'user-mallory');
          },
          (err) => err.status === 403
        );
      } finally {
        db.mockInterview.findUnique = origFindUnique;
      }
    });

    test('getInterviewStats accurately aggregates user session statistics', async () => {
      const origFindMany = db.mockInterview.findMany;

      try {
        db.mockInterview.findMany = async () => [
          { status: 'COMPLETED', interviewType: 'TECHNICAL', durationMinutes: 30 },
          { status: 'COMPLETED', interviewType: 'HR', durationMinutes: 20 },
          { status: 'IN_PROGRESS', interviewType: 'SYSTEM_DESIGN', durationMinutes: 15 },
          { status: 'PAUSED', interviewType: 'CODING', durationMinutes: 10 }
        ];

        const stats = await MockInterviewService.getInterviewStats('user-alice');

        assert.equal(stats.totalInterviews, 4);
        assert.equal(stats.completedInterviews, 2);
        assert.equal(stats.inProgressInterviews, 1);
        assert.equal(stats.pausedInterviews, 1);
        assert.equal(stats.totalMinutesPracticed, 75);
        assert.equal(stats.byType.TECHNICAL, 1);
        assert.equal(stats.byType.HR, 1);
        assert.equal(stats.byType.SYSTEM_DESIGN, 1);
        assert.equal(stats.byType.CODING, 1);
      } finally {
        db.mockInterview.findMany = origFindMany;
      }
    });
  });
});
