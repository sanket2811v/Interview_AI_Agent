import { db } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { PistonExecutionProvider } from './providers/piston.provider.js';
import { OnlineCompilerExecutionProvider } from './providers/onlinecompiler.provider.js';
import { Judge0ExecutionProvider } from './providers/judge0.provider.js';
import { MockExecutionProvider } from './providers/mock.provider.js';
import {
  getAvailableLanguages,
  isLanguageSupported,
  getLanguageConfig
} from './languageConfig.js';
import { compareOutput } from './outputComparator.js';

// User rate-limit tracker (sliding window: 10 requests / 60 seconds per user)
const userRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 12;

export class CodeExecutionService {
  static providerInstance = null;

  /**
   * Allows injecting a custom execution provider (useful for testing and pluggable providers)
   */
  static setProvider(provider) {
    this.providerInstance = provider;
  }

  /**
   * Instantiates the configured execution provider
   */
  static getProvider() {
    if (this.providerInstance) {
      return this.providerInstance;
    }

    const providerType = (process.env.CODE_EXECUTION_PROVIDER || 'piston').toLowerCase();
    const isExplicitlyDisabled = process.env.CODE_EXECUTION_ENABLED === 'false';

    // Use mock provider in test environment or when explicitly chosen
    if (process.env.NODE_ENV === 'test' || providerType === 'mock') {
      return new MockExecutionProvider();
    }

    if (isExplicitlyDisabled) {
      const err = new Error(
        'Code execution service is currently disabled. Please contact the administrator or enable it in configuration.'
      );
      err.status = 503;
      throw err;
    }

    if (providerType === 'judge0') {
      return new Judge0ExecutionProvider();
    }

    if (providerType === 'onlinecompiler' || providerType === 'onecompiler') {
      return new OnlineCompilerExecutionProvider();
    }

    if (providerType === 'piston') {
      return new PistonExecutionProvider();
    }

    // Default to Piston
    return new PistonExecutionProvider();
  }

  /**
   * Checks and enforces in-memory rate limiting per user
   */
  static checkRateLimit(userId) {
    const now = Date.now();
    const history = userRateLimits.get(userId) || [];
    const validHistory = history.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);

    if (validHistory.length >= MAX_REQUESTS_PER_WINDOW) {
      const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - validHistory[0])) / 1000);
      const err = new Error(`Execution rate limit exceeded. Please wait ${retryAfterSec} seconds.`);
      err.status = 429;
      err.retryAfter = retryAfterSec;
      throw err;
    }

    validHistory.push(now);
    userRateLimits.set(userId, validHistory);
  }

  /**
   * Returns list of supported programming languages
   */
  static getSupportedLanguages() {
    return getAvailableLanguages();
  }

  /**
   * Retrieves default starter code for standalone mode without requiring a challenge
   */
  static getStandaloneStarterCode(language = 'javascript') {
    if (!isLanguageSupported(language)) {
      const err = new Error(`Unsupported programming language: ${language}`);
      err.status = 400;
      throw err;
    }

    const langConfig = getLanguageConfig(language);
    return {
      language: langConfig.id,
      languageName: langConfig.name,
      fileName: langConfig.fileName,
      extension: langConfig.extension,
      monacoLanguage: langConfig.monacoLanguage,
      starterCode: langConfig.starterCode,
      timeLimitMs: langConfig.timeLimitMs,
      memoryLimitMb: langConfig.memoryLimitMb
    };
  }

  /**
   * Executes code in Standalone Mode (no challenge or database record required)
   */
  static async executeStandalone({ userId, language, sourceCode, stdin = '' }) {
    if (userId) {
      this.checkRateLimit(userId);
    }

    if (!isLanguageSupported(language)) {
      const err = new Error(`Unsupported programming language: ${language}`);
      err.status = 400;
      throw err;
    }

    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      const err = new Error('Source code cannot be empty');
      err.status = 400;
      throw err;
    }

    if (sourceCode.length > 50000) {
      const err = new Error('Source code exceeds maximum allowed size (50,000 characters)');
      err.status = 400;
      throw err;
    }

    const provider = this.getProvider();
    const langConfig = getLanguageConfig(language);

    try {
      const execution = await provider.execute({
        language,
        sourceCode,
        stdin: stdin || '',
        timeLimit: langConfig?.timeLimitMs || 5000,
        memoryLimit: langConfig?.memoryLimitMb || 256
      });

      return {
        success: execution.status === 'SUCCESS',
        status: execution.status,
        language: langConfig.id,
        fileName: langConfig.fileName,
        stdout: execution.stdout || '',
        stderr: execution.stderr || '',
        compileOutput: execution.compileOutput || (execution.status === 'COMPILATION_ERROR' ? execution.stderr : ''),
        exitCode: execution.exitCode !== undefined ? execution.exitCode : (execution.status === 'SUCCESS' ? 0 : 1),
        executionTimeMs: execution.executionTimeMs || 0,
        memoryUsedKb: execution.memoryUsedKb || null,
        errorType: execution.errorType || (execution.status === 'AUTH_ERROR' ? 'AUTH_ERROR' : null)
      };
    } catch (err) {
      logger.error('Standalone code execution error', { error: err.message, language });
      if (err.status === 429 || err.status === 503) {
        throw err;
      }
      const isAuthErr = err.status === 401 || err.isAuthError || err.message?.includes('401');
      return {
        success: false,
        status: isAuthErr ? 'AUTH_ERROR' : 'PROVIDER_ERROR',
        language: langConfig.id,
        fileName: langConfig.fileName,
        stdout: '',
        stderr: err.message || 'Execution provider encountered an error',
        compileOutput: '',
        exitCode: 1,
        executionTimeMs: 0,
        memoryUsedKb: null,
        errorType: isAuthErr ? 'AUTH_ERROR' : 'PROVIDER_ERROR'
      };
    }
  }

  /**
   * Retrieves starter code for a specific challenge and language
   */
  static async getStarterCode(challengeId, language, userId) {
    if (!isLanguageSupported(language)) {
      const err = new Error(`Unsupported programming language: ${language}`);
      err.status = 400;
      throw err;
    }

    const challenge = await db.codingChallenge.findUnique({
      where: { id: challengeId },
      include: {
        preparationSession: {
          select: { userId: true }
        }
      }
    });

    if (!challenge) {
      const err = new Error('Coding challenge not found');
      err.status = 404;
      throw err;
    }

    if (challenge.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not own this coding challenge');
      err.status = 403;
      throw err;
    }

    const langConfig = getLanguageConfig(language);
    return {
      challengeId: challenge.id,
      language: langConfig.id,
      languageName: langConfig.name,
      starterCode: langConfig.starterCode,
      timeLimitMs: challenge.timeLimit || langConfig.timeLimitMs,
      memoryLimitMb: challenge.memoryLimit || langConfig.memoryLimitMb
    };
  }

  /**
   * Runs code against sample / public test cases only
   */
  static async runSampleTestCases(challengeId, userId, { language, sourceCode }) {
    this.checkRateLimit(userId);

    if (!isLanguageSupported(language)) {
      const err = new Error(`Unsupported programming language: ${language}`);
      err.status = 400;
      throw err;
    }

    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      const err = new Error('Source code cannot be empty');
      err.status = 400;
      throw err;
    }

    if (sourceCode.length > 50000) {
      const err = new Error('Source code exceeds maximum allowed size (50 KB)');
      err.status = 400;
      throw err;
    }

    // Fetch challenge and verify ownership
    const challenge = await db.codingChallenge.findUnique({
      where: { id: challengeId },
      include: {
        preparationSession: { select: { userId: true } },
        testCases: {
          where: { isHidden: false },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!challenge) {
      const err = new Error('Coding challenge not found');
      err.status = 404;
      throw err;
    }

    if (challenge.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to execute this challenge');
      err.status = 403;
      throw err;
    }

    // Build sample test cases list (fallback to challenge.sampleInput/sampleOutput if no testCases exist)
    let sampleCases = challenge.testCases;
    if (sampleCases.length === 0 && challenge.sampleInput) {
      sampleCases = [
        {
          id: 'sample-0',
          input: challenge.sampleInput,
          expectedOutput: challenge.sampleOutput || '',
          isHidden: false,
          isSample: true,
          displayOrder: 0
        }
      ];
    }

    if (sampleCases.length === 0) {
      const err = new Error('No sample test cases configured for this challenge');
      err.status = 400;
      throw err;
    }

    const provider = this.getProvider();
    const testResults = [];
    let allPassed = true;
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let overallVerdict = 'ACCEPTED';
    let fatalError = null;

    for (let i = 0; i < sampleCases.length; i++) {
      const tc = sampleCases[i];
      try {
        const execution = await provider.execute({
          language,
          sourceCode,
          stdin: tc.input || '',
          timeLimit: challenge.timeLimit,
          memoryLimit: challenge.memoryLimit
        });

        maxTimeMs = Math.max(maxTimeMs, execution.executionTimeMs || 0);
        maxMemoryKb = Math.max(maxMemoryKb, execution.memoryUsedKb || 0);

        if (execution.status === 'COMPILATION_ERROR') {
          overallVerdict = 'COMPILATION_ERROR';
          fatalError = execution.stderr || 'Compilation error occurred';
          testResults.push({
            testCaseIndex: i + 1,
            isSample: true,
            status: 'COMPILATION_ERROR',
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            error: fatalError,
            passed: false,
            executionTimeMs: execution.executionTimeMs
          });
          break; // Stop further execution on compiler failure
        }

        if (execution.status === 'TIME_LIMIT_EXCEEDED') {
          allPassed = false;
          overallVerdict = 'TIME_LIMIT_EXCEEDED';
          testResults.push({
            testCaseIndex: i + 1,
            isSample: true,
            status: 'TIME_LIMIT_EXCEEDED',
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            error: execution.stderr || 'Time Limit Exceeded',
            passed: false,
            executionTimeMs: execution.executionTimeMs
          });
          continue;
        }

        if (execution.status === 'RUNTIME_ERROR') {
          allPassed = false;
          if (overallVerdict === 'ACCEPTED') overallVerdict = 'RUNTIME_ERROR';
          testResults.push({
            testCaseIndex: i + 1,
            isSample: true,
            status: 'RUNTIME_ERROR',
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: execution.stdout || '',
            error: execution.stderr || 'Runtime error occurred',
            passed: false,
            executionTimeMs: execution.executionTimeMs
          });
          continue;
        }

        // Compare output
        const comparison = compareOutput(execution.stdout, tc.expectedOutput);
        if (!comparison.isMatch) {
          allPassed = false;
          if (overallVerdict === 'ACCEPTED') overallVerdict = 'WRONG_ANSWER';
        }

        testResults.push({
          testCaseIndex: i + 1,
          isSample: true,
          status: comparison.isMatch ? 'ACCEPTED' : 'WRONG_ANSWER',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execution.stdout,
          passed: comparison.isMatch,
          executionTimeMs: execution.executionTimeMs
        });
      } catch (execErr) {
        if (execErr.status === 429 || execErr.status === 503) throw execErr;
        overallVerdict = 'INTERNAL_ERROR';
        fatalError = execErr.message;
        testResults.push({
          testCaseIndex: i + 1,
          isSample: true,
          status: 'INTERNAL_ERROR',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          error: execErr.message,
          passed: false
        });
        break;
      }
    }

    return {
      challengeId: challenge.id,
      language,
      verdict: overallVerdict,
      allPassed: overallVerdict === 'ACCEPTED',
      passedTestCases: testResults.filter((r) => r.passed).length,
      totalTestCases: sampleCases.length,
      executionTimeMs: maxTimeMs,
      memoryUsedKb: maxMemoryKb,
      testResults,
      errorMessage: fatalError
    };
  }

  /**
   * Submits code against ALL test cases (visible + hidden) and persists submission
   */
  static async submitSolution(challengeId, userId, { language, sourceCode, practiceSessionId }) {
    this.checkRateLimit(userId);

    if (!isLanguageSupported(language)) {
      const err = new Error(`Unsupported programming language: ${language}`);
      err.status = 400;
      throw err;
    }

    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      const err = new Error('Source code cannot be empty');
      err.status = 400;
      throw err;
    }

    if (sourceCode.length > 50000) {
      const err = new Error('Source code exceeds maximum allowed size (50 KB)');
      err.status = 400;
      throw err;
    }

    const challenge = await db.codingChallenge.findUnique({
      where: { id: challengeId },
      include: {
        preparationSession: { select: { userId: true } },
        testCases: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!challenge) {
      const err = new Error('Coding challenge not found');
      err.status = 404;
      throw err;
    }

    if (challenge.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to submit to this challenge');
      err.status = 403;
      throw err;
    }

    // Verify practiceSession if supplied
    if (practiceSessionId) {
      const practiceSession = await db.practiceSession.findUnique({
        where: { id: practiceSessionId }
      });
      if (!practiceSession || practiceSession.userId !== userId) {
        const err = new Error('Invalid or inaccessible practice session');
        err.status = 400;
        throw err;
      }
    }

    let allTestCases = challenge.testCases;
    if (allTestCases.length === 0 && challenge.sampleInput) {
      allTestCases = [
        {
          id: 'tc-fallback',
          input: challenge.sampleInput,
          expectedOutput: challenge.sampleOutput || '',
          isHidden: false,
          isSample: true,
          displayOrder: 0
        }
      ];
    }

    const provider = this.getProvider();
    const evaluatedResults = [];
    let overallStatus = 'ACCEPTED';
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let compilationError = null;
    let runtimeError = null;

    for (let i = 0; i < allTestCases.length; i++) {
      const tc = allTestCases[i];
      try {
        const execution = await provider.execute({
          language,
          sourceCode,
          stdin: tc.input || '',
          timeLimit: challenge.timeLimit,
          memoryLimit: challenge.memoryLimit
        });

        maxTimeMs = Math.max(maxTimeMs, execution.executionTimeMs || 0);
        maxMemoryKb = Math.max(maxMemoryKb, execution.memoryUsedKb || 0);

        if (execution.status === 'COMPILATION_ERROR') {
          overallStatus = 'COMPILATION_ERROR';
          compilationError = execution.stderr || 'Compilation error';
          evaluatedResults.push({
            testCaseNumber: i + 1,
            isSample: !tc.isHidden,
            isHidden: tc.isHidden,
            status: 'COMPILATION_ERROR',
            passed: false,
            executionTimeMs: execution.executionTimeMs
          });
          break;
        }

        if (execution.status === 'TIME_LIMIT_EXCEEDED') {
          overallStatus = 'TIME_LIMIT_EXCEEDED';
          evaluatedResults.push({
            testCaseNumber: i + 1,
            isSample: !tc.isHidden,
            isHidden: tc.isHidden,
            status: 'TIME_LIMIT_EXCEEDED',
            passed: false,
            executionTimeMs: execution.executionTimeMs
          });
          continue;
        }

        if (execution.status === 'RUNTIME_ERROR') {
          if (overallStatus === 'ACCEPTED') overallStatus = 'RUNTIME_ERROR';
          runtimeError = execution.stderr || 'Runtime error occurred';
          evaluatedResults.push({
            testCaseNumber: i + 1,
            isSample: !tc.isHidden,
            isHidden: tc.isHidden,
            status: 'RUNTIME_ERROR',
            passed: false,
            executionTimeMs: execution.executionTimeMs
          });
          continue;
        }

        const comparison = compareOutput(execution.stdout, tc.expectedOutput);
        const isPassed = comparison.isMatch;
        if (!isPassed && overallStatus === 'ACCEPTED') {
          overallStatus = 'WRONG_ANSWER';
        }

        // Store result: NEVER leak hidden test inputs or outputs
        if (tc.isHidden) {
          evaluatedResults.push({
            testCaseNumber: i + 1,
            isSample: false,
            isHidden: true,
            status: isPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
            passed: isPassed,
            executionTimeMs: execution.executionTimeMs
          });
        } else {
          evaluatedResults.push({
            testCaseNumber: i + 1,
            isSample: true,
            isHidden: false,
            status: isPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
            passed: isPassed,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: execution.stdout,
            executionTimeMs: execution.executionTimeMs
          });
        }
      } catch (err) {
        if (err.status === 429 || err.status === 503) throw err;
        overallStatus = 'INTERNAL_ERROR';
        runtimeError = err.message;
        evaluatedResults.push({
          testCaseNumber: i + 1,
          isSample: !tc.isHidden,
          isHidden: tc.isHidden,
          status: 'INTERNAL_ERROR',
          passed: false,
          error: err.message
        });
        break;
      }
    }

    const passedCount = evaluatedResults.filter((r) => r.passed).length;

    // Persist submission in database
    const submission = await db.codingSubmission.create({
      data: {
        challengeId: challenge.id,
        userId,
        practiceSessionId: practiceSessionId || null,
        language,
        sourceCode,
        executionStatus: overallStatus,
        testCasesPassed: passedCount,
        totalTestCases: allTestCases.length,
        executionTime: maxTimeMs,
        memoryUsed: maxMemoryKb,
        compilationError,
        runtimeError,
        testResults: evaluatedResults,
        submittedAt: new Date()
      }
    });

    // If part of practice session, update progress
    if (practiceSessionId) {
      try {
        await db.practiceSession.update({
          where: { id: practiceSessionId },
          data: {
            lastActivityAt: new Date()
          }
        });
      } catch (updateErr) {
        logger.warn('Failed to update practice session after submission:', updateErr.message);
      }
    }

    logger.info('Coding submission processed successfully', {
      submissionId: submission.id,
      challengeId: challenge.id,
      userId,
      verdict: overallStatus,
      passedCount,
      totalCount: allTestCases.length
    });

    return {
      submissionId: submission.id,
      challengeId: challenge.id,
      userId,
      language,
      status: submission.executionStatus,
      isAccepted: submission.executionStatus === 'ACCEPTED',
      testCasesPassed: passedCount,
      totalTestCases: allTestCases.length,
      executionTimeMs: submission.executionTime,
      memoryUsedKb: submission.memoryUsed,
      compilationError: submission.compilationError,
      runtimeError: submission.runtimeError,
      testResults: evaluatedResults,
      submittedAt: submission.submittedAt
    };
  }

  /**
   * Retrieves single submission details, verifying user authorization
   */
  static async getSubmissionById(submissionId, userId) {
    const submission = await db.codingSubmission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            category: true
          }
        }
      }
    });

    if (!submission) {
      const err = new Error('Coding submission not found');
      err.status = 404;
      throw err;
    }

    if (submission.userId !== userId) {
      const err = new Error('Access denied: You cannot view submissions by another user');
      err.status = 403;
      throw err;
    }

    return submission;
  }

  /**
   * Retrieves user's submission history for a specific challenge
   */
  static async getChallengeSubmissions(challengeId, userId, { page = 1, limit = 10 } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 50);
    const take = Math.min(Math.max(1, limit), 50);

    const [submissions, total] = await Promise.all([
      db.codingSubmission.findMany({
        where: { challengeId, userId },
        orderBy: { submittedAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          challengeId: true,
          language: true,
          executionStatus: true,
          testCasesPassed: true,
          totalTestCases: true,
          executionTime: true,
          memoryUsed: true,
          submittedAt: true
        }
      }),
      db.codingSubmission.count({
        where: { challengeId, userId }
      })
    ]);

    return {
      submissions,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  /**
   * Retrieves global coding history for authenticated user across all challenges
   */
  static async getUserCodingHistory(userId, { page = 1, limit = 15 } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 50);
    const take = Math.min(Math.max(1, limit), 50);

    const [submissions, total] = await Promise.all([
      db.codingSubmission.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        skip,
        take,
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              category: true
            }
          }
        }
      }),
      db.codingSubmission.count({
        where: { userId }
      })
    ]);

    return {
      submissions,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  /**
   * Computes accurate coding statistics for the authenticated user
   */
  static async getCodingStats(userId) {
    const [totalSubmissions, acceptedSubmissions, allSubmissions] = await Promise.all([
      db.codingSubmission.count({ where: { userId } }),
      db.codingSubmission.count({ where: { userId, executionStatus: 'ACCEPTED' } }),
      db.codingSubmission.findMany({
        where: { userId },
        select: {
          challengeId: true,
          executionStatus: true,
          language: true,
          challenge: { select: { difficulty: true } }
        }
      })
    ]);

    // Unique challenges attempted & solved
    const attemptedChallenges = new Set();
    const solvedChallenges = new Set();
    const languageCounts = {};
    const difficultySolved = { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 };

    for (const sub of allSubmissions) {
      attemptedChallenges.add(sub.challengeId);
      if (sub.executionStatus === 'ACCEPTED') {
        solvedChallenges.add(sub.challengeId);
        const diff = sub.challenge?.difficulty || 'MEDIUM';
        difficultySolved[diff] = (difficultySolved[diff] || 0) + 1;
      }
      languageCounts[sub.language] = (languageCounts[sub.language] || 0) + 1;
    }

    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100 * 10) / 10
        : 0;

    return {
      totalSubmissions,
      acceptedSubmissions,
      rejectedSubmissions: totalSubmissions - acceptedSubmissions,
      challengesAttempted: attemptedChallenges.size,
      challengesSolved: solvedChallenges.size,
      acceptanceRate,
      languageBreakdown: languageCounts,
      difficultyBreakdown: difficultySolved
    };
  }
}
