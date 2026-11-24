import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import { AnalyticsService } from '../src/services/analytics/analytics.service.js';
import { SkillGapService } from '../src/services/analytics/skillGap.service.js';
import { ImprovementPlanService } from '../src/services/analytics/improvementPlan.service.js';
import { LearningTaskService } from '../src/services/analytics/learningTask.service.js';
import { ProgressService } from '../src/services/analytics/progress.service.js';
import {
  analyticsFilterSchema,
  createImprovementPlanSchema,
  updateImprovementPlanSchema,
  createLearningTaskSchema,
  updateLearningTaskSchema,
  queryLearningTasksSchema
} from '../src/validators/analytics.validator.js';
import { db } from '../src/config/prisma.js';

describe('InterviewAI Phase 12: Analytics, Skill Gaps & Improvement Plan Engine', () => {
  // ==========================================
  // 1. Analytics Validators & Date Bounds Math
  // ==========================================
  describe('1. Filter Schemas & Date Bounds Calculations', () => {
    test('analyticsFilterSchema validates supported date ranges and defaults to all', () => {
      const valid7d = analyticsFilterSchema.parse({ dateRange: '7d' });
      assert.equal(valid7d.dateRange, '7d');

      const defaultParsed = analyticsFilterSchema.parse({});
      assert.equal(defaultParsed.dateRange, 'all');
      assert.equal(defaultParsed.category, 'ALL');

      assert.throws(() => {
        analyticsFilterSchema.parse({ dateRange: 'invalid-range' });
      });
    });

    test('AnalyticsService.getDateBounds computes accurate historical intervals', () => {
      const bounds7d = AnalyticsService.getDateBounds('7d');
      assert.ok(bounds7d.gte instanceof Date);
      const diffDays7 = Math.round((Date.now() - bounds7d.gte.getTime()) / (1000 * 60 * 60 * 24));
      assert.equal(diffDays7, 7);

      const bounds30d = AnalyticsService.getDateBounds('30d');
      const diffDays30 = Math.round((Date.now() - bounds30d.gte.getTime()) / (1000 * 60 * 60 * 24));
      assert.equal(diffDays30, 30);

      const boundsAll = AnalyticsService.getDateBounds('all');
      assert.deepEqual(boundsAll, {});
    });

    test('createImprovementPlanSchema and createLearningTaskSchema enforce bounds and defaults', () => {
      const validPlan = createImprovementPlanSchema.parse({
        title: 'Master Concurrency',
        priority: 'HIGH',
        targetSkills: ['Go', 'Rust']
      });
      assert.equal(validPlan.title, 'Master Concurrency');
      assert.equal(validPlan.priority, 'HIGH');
      assert.deepEqual(validPlan.targetSkills, ['Go', 'Rust']);

      assert.throws(() => {
        createImprovementPlanSchema.parse({ title: 'a' }); // Under 3 chars
      });

      const validTask = createLearningTaskSchema.parse({
        improvementPlanId: 'plan-123',
        title: 'Read Raft Consensus Paper',
        estimatedMinutes: 60
      });
      assert.equal(validTask.title, 'Read Raft Consensus Paper');
      assert.equal(validTask.estimatedMinutes, 60);
      assert.equal(validTask.priority, 'MEDIUM');
      assert.equal(validTask.status, 'PENDING');
    });
  });

  // ==========================================
  // 2. Skill Gap Analysis & Classification Invariants
  // ==========================================
  describe('2. Skill Gap Benchmarking & Categorization', () => {
    test('SkillGapService classifies skills into STRONG, DEVELOPING, NEEDS_IMPROVEMENT, NOT_ASSESSED', async () => {
      const origFindPrep = db.preparationSession.findUnique;
      const origFindProfile = db.userProfile.findUnique;
      const origFindEvaluations = db.interviewEvaluation.findMany;
      const origFindSubmissions = db.codingSubmission.findMany;

      try {
        db.preparationSession.findUnique = async () => ({
          id: 'prep-1',
          jobTitle: 'Senior Cloud Architect',
          companyName: 'Acme Cloud',
          jobAnalysis: {
            technicalSkills: [
              { skill: 'Kubernetes', category: 'TECHNICAL', required: true },
              { skill: 'Python', category: 'CODING', required: true },
              { skill: 'Terraform', category: 'TECHNICAL', required: false }
            ],
            behavioralSkills: [
              { skill: 'Incident Leadership', criticality: 'HIGH' }
            ]
          }
        });

        // Evaluations: Kubernetes scored 90% (STRONG), Python scored 40% (NEEDS_IMPROVEMENT), Terraform unassessed
        db.interviewEvaluation.findMany = async () => [
          {
            id: 'eval-1',
            overallScore: 90,
            sourceType: 'QUESTION_PRACTICE',
            strengths: ['Exceptional Kubernetes pod scaling and ingress design'],
            weaknesses: [],
            missingConcepts: [],
            evaluatedAt: new Date()
          },
          {
            id: 'eval-2',
            overallScore: 40,
            sourceType: 'CODING_SUBMISSION',
            strengths: [],
            weaknesses: ['Inefficient Python memory usage'],
            missingConcepts: ['Python generator protocol'],
            evaluatedAt: new Date()
          }
        ];

        db.codingSubmission.findMany = async () => [];

        const gaps = await SkillGapService.getSkillGaps('user-alice', { preparationSessionId: 'prep-1' });

        assert.ok(gaps.totalSkills >= 4);

        const k8sSkill = gaps.skills.find((s) => s.skillName === 'Kubernetes');
        assert.ok(k8sSkill);
        assert.equal(k8sSkill.status, 'STRONG');
        assert.equal(k8sSkill.jobRelevance, 'REQUIRED');

        const pythonSkill = gaps.skills.find((s) => s.skillName === 'Python');
        assert.ok(pythonSkill);
        assert.equal(pythonSkill.status, 'NEEDS_IMPROVEMENT');
        assert.equal(pythonSkill.improvementPriority, 'HIGH');

        const tfSkill = gaps.skills.find((s) => s.skillName === 'Terraform');
        assert.ok(tfSkill);
        assert.equal(tfSkill.status, 'NOT_ASSESSED');
        assert.equal(tfSkill.currentScore, null);
      } finally {
        db.preparationSession.findUnique = origFindPrep;
        db.userProfile.findUnique = origFindProfile;
        db.interviewEvaluation.findMany = origFindEvaluations;
        db.codingSubmission.findMany = origFindSubmissions;
      }
    });
  });

  // ==========================================
  // 3. Learning Task Management & Progress Recalculation
  // ==========================================
  describe('3. Learning Task Lifecycle & Mathematical Invariants', () => {
    test('LearningTaskService.recalculatePlanProgress computes exact percentage excluding skipped tasks', async () => {
      const origFindMany = db.learningTask.findMany;
      const origUpdate = db.improvementPlan.update;

      try {
        let updatedPercentage = null;
        db.improvementPlan.update = async ({ data }) => {
          updatedPercentage = data.completionPercentage;
          return { id: 'plan-1', completionPercentage: updatedPercentage };
        };

        // 3 completed, 1 in progress, 1 pending, 1 skipped -> Eligible: 5 tasks, Completed: 3 -> 60%
        db.learningTask.findMany = async () => [
          { status: 'COMPLETED' },
          { status: 'COMPLETED' },
          { status: 'COMPLETED' },
          { status: 'IN_PROGRESS' },
          { status: 'PENDING' },
          { status: 'SKIPPED' } // Excluded from denominator
        ];

        const pct = await LearningTaskService.recalculatePlanProgress('plan-1');
        assert.equal(pct, 60);
        assert.equal(updatedPercentage, 60);
      } finally {
        db.learningTask.findMany = origFindMany;
        db.improvementPlan.update = origUpdate;
      }
    });

    test('recalculatePlanProgress handles empty tasks without division by zero', async () => {
      const origFindMany = db.learningTask.findMany;
      const origUpdate = db.improvementPlan.update;

      try {
        db.improvementPlan.update = async ({ data }) => ({ id: 'plan-empty', ...data });
        db.learningTask.findMany = async () => [];

        const pct = await LearningTaskService.recalculatePlanProgress('plan-empty');
        assert.equal(pct, 0);
      } finally {
        db.learningTask.findMany = origFindMany;
        db.improvementPlan.update = origUpdate;
      }
    });

    test('updateTask sets completedAt timestamp on COMPLETED and clears on reopen', async () => {
      const origFindUnique = db.learningTask.findUnique;
      const origUpdate = db.learningTask.update;
      const origFindMany = db.learningTask.findMany;
      const origUpdatePlan = db.improvementPlan.update;

      try {
        db.learningTask.findUnique = async () => ({
          id: 'task-1',
          status: 'PENDING',
          completedAt: null,
          improvementPlanId: 'plan-1',
          improvementPlan: { userId: 'user-alice' }
        });

        let updatedData = null;
        db.learningTask.update = async ({ data }) => {
          updatedData = data;
          return { id: 'task-1', ...data };
        };

        db.learningTask.findMany = async () => [{ status: 'COMPLETED' }];
        db.improvementPlan.update = async () => ({});

        const completed = await LearningTaskService.updateTaskStatus('task-1', 'user-alice', 'COMPLETED');
        assert.ok(updatedData.completedAt instanceof Date);

        // Reopen task
        db.learningTask.findUnique = async () => ({
          id: 'task-1',
          status: 'COMPLETED',
          completedAt: new Date(),
          improvementPlanId: 'plan-1',
          improvementPlan: { userId: 'user-alice' }
        });

        const reopened = await LearningTaskService.updateTaskStatus('task-1', 'user-alice', 'IN_PROGRESS');
        assert.equal(updatedData.completedAt, null);
      } finally {
        db.learningTask.findUnique = origFindUnique;
        db.learningTask.update = origUpdate;
        db.learningTask.findMany = origFindMany;
        db.improvementPlan.update = origUpdatePlan;
      }
    });
  });

  // ==========================================
  // 4. Progress Overview & Multi-Tenant Security
  // ==========================================
  describe('4. Progress Tracking & Multi-Tenant Access Control', () => {
    test('LearningTaskService blocks cross-user task access with 403 Forbidden', async () => {
      const origFindUnique = db.learningTask.findUnique;

      try {
        db.learningTask.findUnique = async () => ({
          id: 'task-bob',
          improvementPlanId: 'plan-bob',
          improvementPlan: { userId: 'user-bob' }
        });

        await assert.rejects(
          async () => {
            await LearningTaskService.getTaskById('task-bob', 'user-alice');
          },
          (err) => err.status === 403 && err.message.includes('Access denied')
        );
      } finally {
        db.learningTask.findUnique = origFindUnique;
      }
    });

    test('ImprovementPlanService.regeneratePlan identifies weak competencies and appends remediation tasks', async () => {
      const origFindUnique = db.improvementPlan.findUnique;
      const origFindPrep = db.preparationSession.findUnique;
      const origFindEvaluations = db.interviewEvaluation.findMany;
      const origFindSubmissions = db.codingSubmission.findMany;
      const origCreateTask = db.learningTask.create;

      try {
        db.improvementPlan.findUnique = async () => ({
          id: 'plan-regen-1',
          userId: 'user-alice',
          preparationSessionId: 'prep-1',
          tasks: [
            { id: 't-1', title: 'Remediate Kubernetes: Practice targeted interview scenarios' }
          ]
        });

        db.preparationSession.findUnique = async () => ({
          id: 'prep-1',
          jobTitle: 'Cloud Architect',
          jobAnalysis: {
            technicalSkills: [
              { skill: 'Kubernetes', required: true },
              { skill: 'Docker', required: true }
            ]
          }
        });

        db.interviewEvaluation.findMany = async () => [
          {
            id: 'ev-1',
            overallScore: 45,
            strengths: [],
            weaknesses: ['Weak Docker multi-stage builds'],
            missingConcepts: ['Docker layer caching'],
            evaluatedAt: new Date()
          }
        ];
        db.codingSubmission.findMany = async () => [];

        const createdTasks = [];
        db.learningTask.create = async ({ data }) => {
          createdTasks.push(data);
          return { id: `task-${createdTasks.length}`, ...data };
        };

        const regenerated = await ImprovementPlanService.regeneratePlan('plan-regen-1', 'user-alice');
        assert.ok(regenerated);
        // Docker should be identified as weak (score 45) and appended because it's not already in existingTaskTitles
        assert.ok(createdTasks.some((t) => t.skillName === 'Docker'));
      } finally {
        db.improvementPlan.findUnique = origFindUnique;
        db.preparationSession.findUnique = origFindPrep;
        db.interviewEvaluation.findMany = origFindEvaluations;
        db.codingSubmission.findMany = origFindSubmissions;
        db.learningTask.create = origCreateTask;
      }
    });

    test('HTTP Phase 12 endpoints reject unauthenticated requests with 401 Unauthorized', async () => {
      const endpoints = [
        '/api/analytics/overview',
        '/api/analytics/performance',
        '/api/analytics/categories',
        '/api/analytics/skills',
        '/api/analytics/trends',
        '/api/analytics/activity',
        '/api/skill-gaps',
        '/api/improvement-plans',
        '/api/learning-tasks',
        '/api/progress/overview',
        '/api/progress/history',
        '/api/progress/skills',
        '/api/progress/activity'
      ];

      function requestApp(app, { method = 'GET', url = '/', headers = {}, body = null }) {
        return new Promise((resolve, reject) => {
          const socket = new stream.Duplex({
            read() {},
            write(chunk, encoding, callback) { callback(); }
          });
          socket.remoteAddress = '127.0.0.1';
          socket.encrypted = false;

          const req = new http.IncomingMessage(socket);
          req.method = method.toUpperCase();
          req.url = url;
          req.headers = { host: 'localhost', ...headers };

          const res = new http.ServerResponse(req);
          res.assignSocket(socket);

          const chunks = [];
          res.write = function (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
          };
          res.end = function (chunk) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            const rawResponse = Buffer.concat(chunks).toString('utf-8');
            let parsedBody = null;
            try { parsedBody = JSON.parse(rawResponse); } catch (e) { parsedBody = rawResponse; }
            resolve({ statusCode: res.statusCode, headers: res.getHeaders(), body: parsedBody });
          };

          app(req, res);
        });
      }

      for (const ep of endpoints) {
        const response = await requestApp(app, { method: 'GET', url: ep });
        assert.equal(response.statusCode, 401, `Endpoint ${ep} must require authentication (401)`);
      }
    });
  });

  // ==========================================
  // 5. QuestionAttempt and PreparationSession Analytics Query Field Integrity
  // ==========================================
  describe('5. QuestionAttempt & PreparationSession Field Integrity Guards', () => {
    test('AnalyticsService.getOverview queries QuestionAttempt with attemptedAt and never with createdAt', async () => {
      const origCountAttempt = db.questionAttempt.count;
      const origFindAttempts = db.questionAttempt.findMany;
      const origCountSub = db.codingSubmission.count;
      const origCountMock = db.mockInterview.count;
      const origFindEval = db.interviewEvaluation.findMany;
      const origFindTasks = db.learningTask.findMany;
      const origFindSubs = db.codingSubmission.findMany;
      const origFindMocks = db.mockInterview.findMany;

      const queriedAttemptArgs = [];
      try {
        db.questionAttempt.count = async (args) => {
          queriedAttemptArgs.push(args);
          return 5;
        };
        db.questionAttempt.findMany = async (args) => {
          queriedAttemptArgs.push(args);
          return [{ attemptedAt: new Date() }];
        };
        db.codingSubmission.count = async () => 2;
        db.mockInterview.count = async () => 1;
        db.interviewEvaluation.findMany = async () => [];
        db.learningTask.findMany = async () => [];
        db.codingSubmission.findMany = async () => [];
        db.mockInterview.findMany = async () => [];

        const overview = await AnalyticsService.getOverview('user-test-uuid', { dateRange: '30d' });

        assert.ok(overview);
        assert.equal(overview.totalAttempts, 5);
        assert.equal(overview.hasData, true);

        // Verify every QuestionAttempt query uses attemptedAt and NEVER createdAt
        for (const args of queriedAttemptArgs) {
          if (args.where) {
            assert.equal(args.where.createdAt, undefined, 'QuestionAttempt query must not reference createdAt');
            if (args.where.attemptedAt) {
              assert.ok(args.where.attemptedAt.gte, 'attemptedAt filter must contain gte for 30d');
            }
          }
          if (args.select) {
            assert.equal(args.select.createdAt, undefined, 'select must not request createdAt');
            assert.equal(args.select.attemptedAt, true, 'select must request attemptedAt');
          }
          if (args.orderBy) {
            assert.equal(args.orderBy.createdAt, undefined, 'orderBy must not reference createdAt');
            assert.equal(args.orderBy.attemptedAt, 'desc', 'orderBy must sort by attemptedAt');
          }
        }
      } finally {
        db.questionAttempt.count = origCountAttempt;
        db.questionAttempt.findMany = origFindAttempts;
        db.codingSubmission.count = origCountSub;
        db.mockInterview.count = origCountMock;
        db.interviewEvaluation.findMany = origFindEval;
        db.learningTask.findMany = origFindTasks;
        db.codingSubmission.findMany = origFindSubs;
        db.mockInterview.findMany = origFindMocks;
      }
    });

    test('AnalyticsService.getActivity queries QuestionAttempt with attemptedAt and never with createdAt', async () => {
      const origFindAttempts = db.questionAttempt.findMany;
      const origFindSubs = db.codingSubmission.findMany;
      const origFindMocks = db.mockInterview.findMany;

      let attemptFindArgs = null;
      try {
        db.questionAttempt.findMany = async (args) => {
          attemptFindArgs = args;
          return [{ attemptedAt: new Date() }];
        };
        db.codingSubmission.findMany = async () => [];
        db.mockInterview.findMany = async () => [];

        const activity = await AnalyticsService.getActivity('user-test-uuid', { dateRange: '7d' });
        assert.ok(activity);
        assert.ok(Array.isArray(activity.activity));

        assert.ok(attemptFindArgs);
        assert.equal(attemptFindArgs.where.createdAt, undefined, 'where must not have createdAt');
        assert.ok(attemptFindArgs.where.attemptedAt, 'where must use attemptedAt');
        assert.equal(attemptFindArgs.select.createdAt, undefined, 'select must not have createdAt');
        assert.equal(attemptFindArgs.select.attemptedAt, true, 'select must have attemptedAt: true');
      } finally {
        db.questionAttempt.findMany = origFindAttempts;
        db.codingSubmission.findMany = origFindSubs;
        db.mockInterview.findMany = origFindMocks;
      }
    });

    test('AnalyticsService.getFilters queries PreparationSession with deletedAt: null and never with isArchived', async () => {
      const origFindPreps = db.preparationSession.findMany;

      let prepFindArgs = null;
      try {
        db.preparationSession.findMany = async (args) => {
          prepFindArgs = args;
          return [
            { id: 'prep-1', jobTitle: 'Full Stack Engineer', companyName: 'Cloud Demystify', createdAt: new Date() }
          ];
        };

        const filters = await AnalyticsService.getFilters('user-test-uuid');
        assert.ok(filters);
        assert.equal(filters.preparations.length, 1);

        assert.ok(prepFindArgs);
        assert.equal(prepFindArgs.where.isArchived, undefined, 'PreparationSession query must not reference isArchived');
        assert.equal(prepFindArgs.where.deletedAt, null, 'PreparationSession query must filter deletedAt: null');
      } finally {
        db.preparationSession.findMany = origFindPreps;
      }
    });
  });
});

