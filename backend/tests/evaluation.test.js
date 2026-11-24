import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVALUATION_RUBRICS,
  getRubricForCategory,
  calculateWeightedScore,
  classifyPerformance,
  normalizeCriterionScores,
  RUBRIC_VERSION
} from '../src/services/evaluation/rubrics.js';
import {
  buildAnswerEvaluationSystemPrompt,
  buildAnswerEvaluationTurnPrompt,
  buildCodingEvaluationSystemPrompt,
  buildCodingEvaluationTurnPrompt,
  buildMockInterviewEvaluationSystemPrompt,
  buildMockInterviewEvaluationTurnPrompt
} from '../src/prompts/evaluation.prompt.js';
import { AnswerEvaluationService } from '../src/services/evaluation/answerEvaluation.service.js';
import { CodingEvaluationService } from '../src/services/evaluation/codingEvaluation.service.js';
import { MockInterviewEvaluationService } from '../src/services/evaluation/mockInterviewEvaluation.service.js';
import { PerformanceAnalyticsService } from '../src/services/evaluation/performanceAnalytics.service.js';
import { PerformanceReportService } from '../src/services/evaluation/performanceReport.service.js';
import { RecommendationService } from '../src/services/evaluation/recommendation.service.js';
import {
  queryEvaluationsSchema,
  generateReportSchema,
  aiAnswerEvaluationOutputSchema,
  aiCodingEvaluationOutputSchema,
  aiMockInterviewEvaluationOutputSchema
} from '../src/validators/evaluation.validator.js';
import { db } from '../src/config/prisma.js';

describe('InterviewAI Phase 11: AI Evaluation, Answer Analysis & Performance Reporting Engine', () => {
  // ==========================================
  // 1. Evaluation Rubrics & Scoring Math
  // ==========================================
  describe('1. Versioned Rubrics & Mathematical Invariants', () => {
    test('All 6 evaluation rubrics have criteria weights summing exactly to 1.0 (100%)', () => {
      const categories = ['TECHNICAL', 'HR', 'SYSTEM_DESIGN', 'SCENARIO', 'CODING', 'MIXED'];
      for (const cat of categories) {
        const rubric = EVALUATION_RUBRICS[cat];
        assert.ok(rubric, `Rubric for ${cat} must exist`);
        assert.equal(rubric.version, RUBRIC_VERSION);
        assert.ok(Array.isArray(rubric.criteria));
        assert.ok(rubric.criteria.length >= 5);

        const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
        assert.ok(Math.abs(totalWeight - 1.0) < 0.0001, `Criteria weights for ${cat} must sum to 1.0, got ${totalWeight}`);
      }
    });

    test('getRubricForCategory accurately maps category variants and defaults to TECHNICAL', () => {
      assert.equal(getRubricForCategory('TECHNICAL').name, 'Technical Interview Rubric');
      assert.equal(getRubricForCategory('HR').name, 'HR & Behavioral Interview Rubric');
      assert.equal(getRubricForCategory('BEHAVIORAL').name, 'HR & Behavioral Interview Rubric');
      assert.equal(getRubricForCategory('CODING').name, 'Coding & Algorithmic Rubric');
      assert.equal(getRubricForCategory('SYSTEM_DESIGN').name, 'System Design Rubric');
      assert.equal(getRubricForCategory('SCENARIO').name, 'Scenario-Based & Incident Rubric');
      assert.equal(getRubricForCategory('MIXED').name, 'Comprehensive Mixed Rubric');
      assert.equal(getRubricForCategory('UNKNOWN_CATEGORY').name, 'Technical Interview Rubric');
    });

    test('classifyPerformance classifies standard educational performance brackets and all boundary values', () => {
      // Prompt required boundary values: 0, 39, 40, 59, 60, 69, 70, 79, 80, 89, 90, 100
      assert.equal(classifyPerformance(0), 'Poor');
      assert.equal(classifyPerformance(39), 'Poor');
      assert.equal(classifyPerformance(40), 'Needs Improvement');
      assert.equal(classifyPerformance(59), 'Needs Improvement');
      assert.equal(classifyPerformance(60), 'Average');
      assert.equal(classifyPerformance(69), 'Average');
      assert.equal(classifyPerformance(70), 'Good');
      assert.equal(classifyPerformance(79), 'Good');
      assert.equal(classifyPerformance(80), 'Very Good');
      assert.equal(classifyPerformance(89), 'Very Good');
      assert.equal(classifyPerformance(90), 'Excellent');
      assert.equal(classifyPerformance(100), 'Excellent');

      // Clamping bounds
      assert.equal(classifyPerformance(-10), 'Poor');
      assert.equal(classifyPerformance(110), 'Excellent');
    });

    test('calculateWeightedScore computes exact mathematically weighted score', () => {
      const rubric = EVALUATION_RUBRICS.TECHNICAL;
      const criterionScores = [
        { criterion: 'technicalAccuracy', score: 100 }, // 30% -> 30
        { criterion: 'conceptualUnderstanding', score: 80 }, // 20% -> 16
        { criterion: 'problemSolvingAbility', score: 80 }, // 20% -> 16
        { criterion: 'practicalApplication', score: 80 }, // 15% -> 12
        { criterion: 'communicationAndExplanation', score: 70 }, // 10% -> 7
        { criterion: 'completeness', score: 80 } // 5% -> 4
      ];
      // Expected: 30 + 16 + 16 + 12 + 7 + 4 = 85
      const overall = calculateWeightedScore(criterionScores, rubric);
      assert.equal(overall, 85);
    });

    test('calculateWeightedScore does not silently treat unverified criteria as zero', () => {
      const rubric = EVALUATION_RUBRICS.CODING;
      // Functional correctness is unverified (40% weight). Evaluated criteria sum to 60% weight.
      const criterionScores = [
        { criterion: 'functionalCorrectness', score: null, isUnverified: true, status: 'UNVERIFIED' },
        { criterion: 'algorithmicEfficiency', score: 80 }, // 20%
        { criterion: 'codeQuality', score: 80 }, // 15%
        { criterion: 'edgeCaseHandling', score: 80 }, // 10%
        { criterion: 'readabilityAndMaintainability', score: 80 }, // 10%
        { criterion: 'explanation', score: 80 } // 5%
      ];
      // Evaluated criteria all have score 80. The normalized score must be 80, NOT 48 (which would happen if unverified was counted as 0)
      const overall = calculateWeightedScore(criterionScores, rubric);
      assert.equal(overall, 80);
    });
  });

  // ==========================================
  // 2. Prompt Engineering & Anti-Jailbreak Protection
  // ==========================================
  describe('2. Evaluation Prompt Engineering & Anti-Jailbreak Safeguards', () => {
    test('buildAnswerEvaluationSystemPrompt injects rubric criteria and anti-jailbreak directives', () => {
      const rubric = EVALUATION_RUBRICS.TECHNICAL;
      const prompt = buildAnswerEvaluationSystemPrompt({ category: 'TECHNICAL', rubric });

      assert.ok(prompt.includes('Technical Interview Rubric'));
      assert.ok(prompt.includes('Technical Accuracy'));
      assert.ok(prompt.includes('ANTI-JAILBREAK DIRECTIVE'));
      assert.ok(prompt.includes('<candidate_response>'));
      assert.ok(prompt.includes('criterionScores'));
    });

    test('buildCodingEvaluationSystemPrompt prioritizes execution results over AI subjectivity', () => {
      const rubric = EVALUATION_RUBRICS.CODING;
      const prompt = buildCodingEvaluationSystemPrompt({ rubric });

      assert.ok(prompt.includes('FUNCTIONAL CORRECTNESS IS GROUNDED IN EXECUTION RESULTS'));
      assert.ok(prompt.includes('NEVER EXPOSE HIDDEN TEST CASES'));
      assert.ok(prompt.includes('<candidate_code>'));
    });

    test('buildMockInterviewEvaluationSystemPrompt incorporates full conversation directives', () => {
      const rubric = EVALUATION_RUBRICS.HR;
      const prompt = buildMockInterviewEvaluationSystemPrompt({
        interviewType: 'HR',
        difficulty: 'MEDIUM',
        experienceLevel: 'MID',
        rubric
      });

      assert.ok(prompt.includes('HR & Behavioral Interview Rubric'));
      assert.ok(prompt.includes('questionEvaluations'));
      assert.ok(prompt.includes('strengths'));
      assert.ok(prompt.includes('weaknesses'));
    });
  });

  // ==========================================
  // 3. Phase 8 Practice Answer Evaluation
  // ==========================================
  describe('3. Phase 8 Individual Practice Answer Evaluation Workflow', () => {
    test('evaluateAttempt rejects unsubmitted draft attempts (400 Bad Request)', async () => {
      const origFindUnique = db.questionAttempt.findUnique;
      try {
        db.questionAttempt.findUnique = async () => ({
          id: 'att-draft',
          userId: 'user-alice',
          status: 'DRAFT', // Unsubmitted draft
          answer: 'Partial draft notes',
          question: { category: 'TECHNICAL' }
        });

        await assert.rejects(
          async () => {
            await AnswerEvaluationService.evaluateAttempt('att-draft', 'user-alice');
          },
          (err) => err.status === 400 && err.message.includes('draft')
        );
      } finally {
        db.questionAttempt.findUnique = origFindUnique;
      }
    });

    test('evaluateAttempt enforces user ownership and rejects cross-user access (403 Forbidden)', async () => {
      const origFindUnique = db.questionAttempt.findUnique;
      try {
        db.questionAttempt.findUnique = async () => ({
          id: 'att-bob',
          userId: 'user-bob', // Bob owns it
          status: 'SUBMITTED',
          question: { category: 'TECHNICAL' }
        });

        await assert.rejects(
          async () => {
            await AnswerEvaluationService.evaluateAttempt('att-bob', 'user-mallory');
          },
          (err) => err.status === 403
        );
      } finally {
        db.questionAttempt.findUnique = origFindUnique;
      }
    });

    test('evaluateAttempt evaluates submitted answer, scores criteria, and persists record', async () => {
      const origFindUnique = db.questionAttempt.findUnique;
      const origFindFirst = db.interviewEvaluation.findFirst;
      const origCreateEvaluation = db.interviewEvaluation.create;
      const origUpdateAttempt = db.questionAttempt.update;
      const origCreateRec = db.improvementRecommendation.create;

      try {
        db.questionAttempt.findUnique = async () => ({
          id: 'att-100',
          userId: 'user-alice',
          status: 'SUBMITTED',
          answer: 'The event loop in Node.js continuously processes microtasks before timers and IO macrotasks.',
          question: {
            id: 'q-1',
            question: 'Explain the Node.js Event Loop phases.',
            category: 'TECHNICAL',
            difficulty: 'MEDIUM',
            expectedConcepts: ['Microtask Queue', 'Timers', 'Poll Phase', 'Check Phase'],
            referenceAnswer: 'The event loop executes timers, pending callbacks, idle/prepare, poll, check, close callbacks, checking process.nextTick and Promise microtasks between phases.'
          }
        });

        db.interviewEvaluation.findFirst = async () => null;

        let persistedData = null;
        db.interviewEvaluation.create = async ({ data }) => {
          persistedData = data;
          return { id: 'eval-1', ...data };
        };

        db.questionAttempt.update = async ({ data }) => ({ id: 'att-100', ...data });
        db.improvementRecommendation.create = async ({ data }) => ({ id: 'rec-1', ...data });

        // Set deterministic test mock handler
        AnswerEvaluationService.__setMockHandler(async () => ({
          criterionScores: [
            { criterion: 'technicalAccuracy', score: 90, explanation: 'Clear explanation of microtask queue.' },
            { criterion: 'conceptualUnderstanding', score: 85, explanation: 'Understands phase sequencing.' },
            { criterion: 'problemSolvingAbility', score: 80, explanation: 'Good practical framing.' },
            { criterion: 'practicalApplication', score: 80, explanation: 'Mentioned real-world concurrency.' },
            { criterion: 'communicationAndExplanation', score: 85, explanation: 'Concise terminology.' },
            { criterion: 'completeness', score: 80, explanation: 'Covered major concepts.' }
          ],
          strengths: ['Accurate microtask priority explanation', 'Clear asynchronous terminology'],
          weaknesses: ['Could mention IO poll phase in more detail'],
          missingConcepts: ['Poll phase'],
          improvementSuggestions: ['Elaborate on how the poll phase handles incoming HTTP connections'],
          improvedAnswer: 'The Node.js event loop handles concurrency via libuv phases: Timers, Poll, and Check, with Promise microtasks evaluated immediately after each operation.',
          detailedFeedback: 'Solid technical response demonstrating understanding of event-driven execution.',
          confidence: 0.95
        }));

        const result = await AnswerEvaluationService.evaluateAttempt('att-100', 'user-alice');

        assert.equal(result.id, 'eval-1');
        assert.equal(result.sourceType, 'PRACTICE_ANSWER');
        assert.ok(result.overallScore >= 80 && result.overallScore <= 90);
        assert.equal(result.classification, 'Very Good');
        assert.ok(persistedData.strengths.length >= 2);
        assert.ok(persistedData.missingConcepts.includes('Poll phase'));
      } finally {
        AnswerEvaluationService.__setMockHandler(null);
        db.questionAttempt.findUnique = origFindUnique;
        db.interviewEvaluation.findFirst = origFindFirst;
        db.interviewEvaluation.create = origCreateEvaluation;
        db.questionAttempt.update = origUpdateAttempt;
        db.improvementRecommendation.create = origCreateRec;
      }
    });
  });

  // ==========================================
  // 4. Phase 9 Coding Submission Evaluation
  // ==========================================
  describe('4. Phase 9 Coding Submission Evaluation & Security Guards', () => {
    test('evaluateSubmission grounds functional correctness in actual test case pass rate', async () => {
      const origFindUnique = db.codingSubmission.findUnique;
      const origFindFirst = db.interviewEvaluation.findFirst;
      const origCreateEvaluation = db.interviewEvaluation.create;
      const origCreateRec = db.improvementRecommendation.create;

      try {
        db.codingSubmission.findUnique = async () => ({
          id: 'sub-1',
          userId: 'user-alice',
          language: 'javascript',
          sourceCode: 'function twoSum(nums, target) { /* ... */ }',
          executionStatus: 'ACCEPTED',
          testCasesPassed: 10,
          totalTestCases: 10,
          executionTime: 45,
          challenge: {
            id: 'chal-1',
            title: 'Two Sum Optimal',
            description: 'Find indices of two numbers adding to target.'
          }
        });

        db.interviewEvaluation.findFirst = async () => null;

        let persistedEval = null;
        db.interviewEvaluation.create = async ({ data }) => {
          persistedEval = data;
          return { id: 'eval-coding-1', ...data };
        };

        db.improvementRecommendation.create = async () => ({ id: 'rec-coding-1' });

        CodingEvaluationService.__setMockHandler(async () => ({
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(n)',
          complexityExplanation: 'Single-pass hash map lookup',
          codeQualityScore: 90,
          algorithmicEfficiencyScore: 95,
          edgeCaseHandlingScore: 85,
          readabilityScore: 90,
          strengths: ['Optimal single-pass hash map approach', 'Clean variable naming'],
          weaknesses: ['Could add explicit array length checks'],
          improvementSuggestions: ['Add early exit if array length is less than 2'],
          alternativeApproaches: ['Two-pointer approach if array is sorted'],
          detailedFeedback: 'Excellent idiomatic JavaScript implementation.',
          confidence: 0.98
        }));

        const result = await CodingEvaluationService.evaluateSubmission('sub-1', 'user-alice');

        assert.equal(result.sourceType, 'CODING_SUBMISSION');
        assert.ok(result.overallScore >= 90);
        assert.equal(result.classification, 'Excellent');

        // Verify functionalCorrectness criterion uses 100% from 10/10 test cases
        const functionalCrit = persistedEval.criterionScores.find((c) => c.criterion === 'functionalCorrectness');
        assert.ok(functionalCrit);
        assert.equal(functionalCrit.score, 100);
      } finally {
        CodingEvaluationService.__setMockHandler(null);
        db.codingSubmission.findUnique = origFindUnique;
        db.interviewEvaluation.findFirst = origFindFirst;
        db.interviewEvaluation.create = origCreateEvaluation;
        db.improvementRecommendation.create = origCreateRec;
      }
    });

    test('evaluateSubmission protects hidden test cases from being leaked in feedback', async () => {
      const origFindUnique = db.codingSubmission.findUnique;
      const origFindFirst = db.interviewEvaluation.findFirst;
      const origCreateEvaluation = db.interviewEvaluation.create;

      try {
        db.codingSubmission.findUnique = async () => ({
          id: 'sub-wrong',
          userId: 'user-alice',
          language: 'python',
          sourceCode: 'def solve(): pass',
          executionStatus: 'WRONG_ANSWER',
          testCasesPassed: 2,
          totalTestCases: 5,
          challenge: { id: 'chal-2', title: 'Graph Traversal' }
        });

        db.interviewEvaluation.findFirst = async () => null;

        let persistedEval = null;
        db.interviewEvaluation.create = async ({ data }) => {
          persistedEval = data;
          return { id: 'eval-wrong', ...data };
        };

        CodingEvaluationService.__setMockHandler(async () => ({
          timeComplexity: 'O(V + E)',
          spaceComplexity: 'O(V)',
          codeQualityScore: 70,
          algorithmicEfficiencyScore: 70,
          strengths: ['Identified BFS pattern'],
          weaknesses: ['Failed on disconnected graphs'],
          detailedFeedback: 'Code failed hidden boundary test cases.'
        }));

        const result = await CodingEvaluationService.evaluateSubmission('sub-wrong', 'user-alice');
        // Functional correctness score should reflect 2/5 -> 40
        const functionalCrit = persistedEval.criterionScores.find((c) => c.criterion === 'functionalCorrectness');
        assert.equal(functionalCrit.score, 40);
      } finally {
        CodingEvaluationService.__setMockHandler(null);
        db.codingSubmission.findUnique = origFindUnique;
        db.interviewEvaluation.findFirst = origFindFirst;
        db.interviewEvaluation.create = origCreateEvaluation;
      }
    });

    test('evaluateSubmission marks unexecuted code as UNVERIFIED without inventing a score', async () => {
      const origFindUnique = db.codingSubmission.findUnique;
      const origFindFirst = db.interviewEvaluation.findFirst;
      const origCreateEvaluation = db.interviewEvaluation.create;

      try {
        db.codingSubmission.findUnique = async () => ({
          id: 'sub-unexecuted',
          userId: 'user-alice',
          language: 'python',
          sourceCode: 'def solve(): pass',
          executionStatus: 'PENDING',
          testCasesPassed: 0,
          totalTestCases: 0,
          challenge: { id: 'chal-3', title: 'Dynamic Programming' }
        });

        db.interviewEvaluation.findFirst = async () => null;

        let persistedEval = null;
        db.interviewEvaluation.create = async ({ data }) => {
          persistedEval = data;
          return { id: 'eval-unexecuted', ...data };
        };

        CodingEvaluationService.__setMockHandler(async () => ({
          timeComplexity: 'O(n^2)',
          spaceComplexity: 'O(n)',
          codeQualityScore: 85,
          algorithmicEfficiencyScore: 80,
          edgeCaseHandlingScore: 80,
          readabilityScore: 85,
          strengths: ['Clear recursive formulation'],
          weaknesses: ['Lacks memoization'],
          detailedFeedback: 'Code has not been executed yet.'
        }));

        const result = await CodingEvaluationService.evaluateSubmission('sub-unexecuted', 'user-alice');
        const functionalCrit = persistedEval.criterionScores.find((c) => c.criterion === 'functionalCorrectness');
        assert.ok(functionalCrit);
        assert.equal(functionalCrit.isUnverified, true);
        assert.equal(functionalCrit.status, 'UNVERIFIED');
        assert.equal(functionalCrit.score, null);
        assert.ok(functionalCrit.explanation.includes('UNVERIFIED'));
      } finally {
        CodingEvaluationService.__setMockHandler(null);
        db.codingSubmission.findUnique = origFindUnique;
        db.interviewEvaluation.findFirst = origFindFirst;
        db.interviewEvaluation.create = origCreateEvaluation;
      }
    });
  });

  // ==========================================
  // 5. Phase 10 Mock Interview Evaluation
  // ==========================================
  describe('5. Phase 10 Mock Interview Conversation Evaluation', () => {
    test('evaluateInterview rejects in-progress or paused interviews (400 Bad Request)', async () => {
      const origFindUnique = db.mockInterview.findUnique;
      try {
        db.mockInterview.findUnique = async () => ({
          id: 'mock-active',
          userId: 'user-alice',
          status: 'IN_PROGRESS', // Not yet concluded
          messages: []
        });

        await assert.rejects(
          async () => {
            await MockInterviewEvaluationService.evaluateInterview('mock-active', 'user-alice');
          },
          (err) => err.status === 400 && err.message.includes('must be concluded')
        );
      } finally {
        db.mockInterview.findUnique = origFindUnique;
      }
    });

    test('evaluateInterview evaluates completed session and updates overallScore', async () => {
      const origFindUnique = db.mockInterview.findUnique;
      const origFindFirst = db.interviewEvaluation.findFirst;
      const origUpsert = db.interviewEvaluation.upsert;
      const origUpdateInterview = db.mockInterview.update;
      const origCreateRec = db.improvementRecommendation.create;

      try {
        db.mockInterview.findUnique = async () => ({
          id: 'mock-comp-1',
          userId: 'user-alice',
          status: 'COMPLETED',
          interviewType: 'TECHNICAL',
          difficulty: 'MEDIUM',
          experienceLevel: 'MID',
          durationMinutes: 30,
          title: 'Full-Stack Technical Interview',
          preparationSession: { companyName: 'Stripe', jobTitle: 'Full-Stack Engineer' },
          messages: [
            { sequenceNumber: 1, role: 'ASSISTANT', content: 'What is optimistic locking?' },
            { sequenceNumber: 2, role: 'USER', content: 'It uses a version column without blocking reads.' },
            { sequenceNumber: 3, role: 'ASSISTANT', content: 'Good. What happens during conflicts?' },
            { sequenceNumber: 4, role: 'USER', content: 'The update fails if the version changed, prompting a retry.' }
          ]
        });

        db.interviewEvaluation.findFirst = async () => null;

        let persistedScore = null;
        db.interviewEvaluation.upsert = async ({ create }) => {
          persistedScore = create.overallScore;
          return { id: 'eval-mock-1', ...create };
        };

        let updatedInterviewScore = null;
        db.mockInterview.update = async ({ data }) => {
          updatedInterviewScore = data.overallScore;
          return { id: 'mock-comp-1', ...data };
        };

        db.improvementRecommendation.create = async () => ({ id: 'rec-mock-1' });

        MockInterviewEvaluationService.__setMockHandler(async () => ({
          criterionScores: [
            { criterion: 'technicalAccuracy', score: 85, explanation: 'Accurate description of concurrency.' },
            { criterion: 'conceptualUnderstanding', score: 85, explanation: 'Grasped versioning semantics.' },
            { criterion: 'problemSolvingAbility', score: 80, explanation: 'Handled conflict retry probing.' },
            { criterion: 'practicalApplication', score: 80, explanation: 'Good DB knowledge.' },
            { criterion: 'communicationAndExplanation', score: 85, explanation: 'Clear concise answers.' },
            { criterion: 'completeness', score: 80, explanation: 'Covered retry pattern.' }
          ],
          questionEvaluations: [
            { questionNumber: 1, topic: 'Database Concurrency', score: 83, strengths: ['Clear locking explanation'] }
          ],
          strengths: ['Solid concurrency understanding', 'Composed under follow-up questioning'],
          weaknesses: ['Could mention exponential backoff on retry storms'],
          technicalAccuracyScore: 85,
          communicationScore: 85,
          summary: 'Candidate demonstrated strong foundational database knowledge.',
          recommendations: ['Study jittered exponential backoff for distributed retries.']
        }));

        const result = await MockInterviewEvaluationService.evaluateInterview('mock-comp-1', 'user-alice');

        assert.equal(result.evaluation.id, 'eval-mock-1');
        assert.ok(result.evaluation.overallScore >= 80);
        assert.equal(updatedInterviewScore, result.evaluation.overallScore);
        assert.equal(result.questionEvaluations.length, 1);
      } finally {
        MockInterviewEvaluationService.__setMockHandler(null);
        db.mockInterview.findUnique = origFindUnique;
        db.interviewEvaluation.findFirst = origFindFirst;
        db.interviewEvaluation.upsert = origUpsert;
        db.mockInterview.update = origUpdateInterview;
        db.improvementRecommendation.create = origCreateRec;
      }
    });
  });

  // ==========================================
  // 6. Performance Analytics Engine
  // ==========================================
  describe('6. Performance Analytics Engine & Trend Aggregations', () => {
    test('getOverview accurately calculates average scores and category counts', async () => {
      const origFindManyEval = db.interviewEvaluation.findMany;
      const origFindManySub = db.codingSubmission.findMany;

      try {
        db.interviewEvaluation.findMany = async () => [
          { overallScore: 80, sourceType: 'PRACTICE_ANSWER' },
          { overallScore: 90, sourceType: 'PRACTICE_ANSWER' },
          { overallScore: 85, sourceType: 'MOCK_INTERVIEW' },
          { overallScore: 75, sourceType: 'CODING_SUBMISSION' }
        ];

        db.codingSubmission.findMany = async () => [
          { executionStatus: 'ACCEPTED' },
          { executionStatus: 'ACCEPTED' },
          { executionStatus: 'WRONG_ANSWER' }
        ];

        const overview = await PerformanceAnalyticsService.getOverview('user-alice');

        assert.equal(overview.totalEvaluations, 4);
        assert.equal(overview.totalAnswersEvaluated, 2);
        assert.equal(overview.totalInterviewsEvaluated, 1);
        assert.equal(overview.totalCodingEvaluated, 1);
        // Average: (80 + 90 + 85 + 75) / 4 = 82.5 -> 83
        assert.equal(overview.averageScore, 83);
        assert.equal(overview.averagePracticeScore, 85);
        assert.equal(overview.averageInterviewScore, 85);
        // Coding success rate: 2/3 -> 67%
        assert.equal(overview.codingSuccessRate, 67);
      } finally {
        db.interviewEvaluation.findMany = origFindManyEval;
        db.codingSubmission.findMany = origFindManySub;
      }
    });

    test('getOverview handles empty state gracefully without divide-by-zero errors', async () => {
      const origFindManyEval = db.interviewEvaluation.findMany;

      try {
        db.interviewEvaluation.findMany = async () => [];

        const overview = await PerformanceAnalyticsService.getOverview('user-new');

        assert.equal(overview.totalEvaluations, 0);
        assert.equal(overview.averageScore, 0);
        assert.equal(overview.insufficientData, true);
      } finally {
        db.interviewEvaluation.findMany = origFindManyEval;
      }
    });
  });

  // ==========================================
  // 7. Recommendations Lifecycle & Improvement Plan Integration
  // ==========================================
  describe('7. Recommendation Lifecycle & ImprovementPlan Task Generation', () => {
    test('acceptRecommendation marks recommendation as ACCEPTED and creates LearningTask', async () => {
      const origFindRec = db.improvementRecommendation.findUnique;
      const origUpdateRec = db.improvementRecommendation.update;
      const origFindPlan = db.improvementPlan.findFirst;
      const origCreateTask = db.learningTask.create;

      try {
        db.improvementRecommendation.findUnique = async () => ({
          id: 'rec-target',
          userId: 'user-alice',
          skill: 'React',
          weakness: 'Concurrent rendering hooks',
          recommendedAction: 'Practice useTransition and useDeferredValue',
          priority: 'HIGH',
          estimatedMinutes: 30
        });

        db.improvementRecommendation.update = async ({ data }) => ({
          id: 'rec-target',
          status: data.status
        });

        db.improvementPlan.findFirst = async () => ({
          id: 'plan-active',
          userId: 'user-alice',
          status: 'ACTIVE'
        });

        let createdTaskData = null;
        db.learningTask.create = async ({ data }) => {
          createdTaskData = data;
          return { id: 'task-100', ...data };
        };

        const result = await RecommendationService.acceptRecommendation('rec-target', 'user-alice');

        assert.equal(result.recommendation.status, 'ACCEPTED');
        assert.equal(result.createdTask.id, 'task-100');
        assert.equal(createdTaskData.improvementPlanId, 'plan-active');
        assert.ok(createdTaskData.title.includes('useTransition'));
      } finally {
        db.improvementRecommendation.findUnique = origFindRec;
        db.improvementRecommendation.update = origUpdateRec;
        db.improvementPlan.findFirst = origFindPlan;
        db.learningTask.create = origCreateTask;
      }
    });

    test('dismissRecommendation marks recommendation as DISMISSED', async () => {
      const origFindRec = db.improvementRecommendation.findUnique;
      const origUpdateRec = db.improvementRecommendation.update;

      try {
        db.improvementRecommendation.findUnique = async () => ({
          id: 'rec-dismiss',
          userId: 'user-alice'
        });

        let updatedStatus = null;
        db.improvementRecommendation.update = async ({ data }) => {
          updatedStatus = data.status;
          return { id: 'rec-dismiss', ...data };
        };

        const result = await RecommendationService.dismissRecommendation('rec-dismiss', 'user-alice');

        assert.equal(result.recommendation.status, 'DISMISSED');
        assert.equal(updatedStatus, 'DISMISSED');
      } finally {
        db.improvementRecommendation.findUnique = origFindRec;
        db.improvementRecommendation.update = origUpdateRec;
      }
    });
  });

  // ==========================================
  // 8. Performance Reports Synthesis & Security
  // ==========================================
  describe('8. Performance Reports Persistence & Multi-Tenant Authorization', () => {
    test('generateReport persists report synthesizing user evaluation history', async () => {
      const origFindManyEval = db.interviewEvaluation.findMany;
      const origFindManySub = db.codingSubmission.findMany;
      const origCreateReport = db.performanceReport.create;

      try {
        db.interviewEvaluation.findMany = async () => [
          { overallScore: 85, sourceType: 'PRACTICE_ANSWER', strengths: ['Clear algorithms'], weaknesses: ['Rambling'] }
        ];
        db.codingSubmission.findMany = async () => [];

        let savedReport = null;
        db.performanceReport.create = async ({ data }) => {
          savedReport = data;
          return { id: 'rep-101', ...data };
        };

        const report = await PerformanceReportService.generateReport('user-alice', {
          title: 'Official Benchmark Report'
        });

        assert.equal(report.id, 'rep-101');
        assert.equal(savedReport.userId, 'user-alice');
        assert.equal(savedReport.overallScore, 85);
        assert.equal(savedReport.classification, 'Very Good');
        assert.ok(savedReport.summary.includes('readiness score'));
      } finally {
        db.interviewEvaluation.findMany = origFindManyEval;
        db.codingSubmission.findMany = origFindManySub;
        db.performanceReport.create = origCreateReport;
      }
    });

    test('getReportById enforces multi-tenant ownership check (403 Forbidden)', async () => {
      const origFindUnique = db.performanceReport.findUnique;

      try {
        db.performanceReport.findUnique = async () => ({
          id: 'rep-secret',
          userId: 'user-bob', // Bob owns it
          title: 'Bob Confidential Review'
        });

        await assert.rejects(
          async () => {
            await PerformanceReportService.getReportById('rep-secret', 'user-mallory');
          },
          (err) => err.status === 403
        );
      } finally {
        db.performanceReport.findUnique = origFindUnique;
      }
    });
  });
});

