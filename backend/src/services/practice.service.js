import { db } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { getPaginationParams, formatPaginatedResponse } from './db.service.js';
import {
  normalizeCategory,
  normalizeDifficulty,
  normalizeScope,
  getCategoryLabel,
  getDifficultyLabel,
  getScopeLabel
} from '../utils/practiceNormalization.js';

/**
 * Service managing Phase 8: Interview Practice Engine
 * Handles interactive practice sessions, drafts, submissions, hints, reference answers,
 * self-assessment, and practice history/statistics.
 */
export class PracticeService {
  /**
   * Calculates question breakdown by category and difficulty for a preparation
   *
   * @param {string} preparationId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  static async getQuestionAvailability(preparationId, userId) {
    const preparation = await db.preparationSession.findUnique({
      where: { id: preparationId }
    });

    if (!preparation) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (preparation.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to access this preparation');
      err.status = 403;
      throw err;
    }

    const questions = await db.interviewQuestion.findMany({
      where: { preparationSessionId: preparationId },
      orderBy: { displayOrder: 'asc' }
    });

    const breakdown = {
      total: questions.length,
      byCategory: {
        TECHNICAL: 0,
        HR: 0,
        CODING: 0,
        SYSTEM_DESIGN: 0,
        SCENARIO: 0
      },
      byDifficulty: {
        EASY: 0,
        MEDIUM: 0,
        HARD: 0,
        EXPERT: 0
      },
      matrix: {
        TECHNICAL: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        HR: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        CODING: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        SYSTEM_DESIGN: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        SCENARIO: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 }
      }
    };

    questions.forEach((q) => {
      const cat = q.category;
      const diff = q.difficulty;

      if (breakdown.byCategory[cat] !== undefined) {
        breakdown.byCategory[cat]++;
      } else {
        breakdown.byCategory[cat] = 1;
      }

      if (breakdown.byDifficulty[diff] !== undefined) {
        breakdown.byDifficulty[diff]++;
      } else {
        breakdown.byDifficulty[diff] = 1;
      }

      if (!breakdown.matrix[cat]) {
        breakdown.matrix[cat] = { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 };
      }
      breakdown.matrix[cat][diff] = (breakdown.matrix[cat][diff] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Starts a new practice session for an existing preparation
   *
   * @param {string} preparationId
   * @param {string} userId
   * @param {object} options
   */
  static async startSession(preparationId, userId, options = {}) {
    const {
      category = 'ALL',
      selectedCategories = [],
      difficulty = 'MIXED',
      count = 10,
      skills = [],
      filter = 'ALL',
      strictCount = false,
      allowPartial = true
    } = options;

    const normCategory = normalizeCategory(category);
    const normDifficulty = normalizeDifficulty(difficulty);
    const normFilter = normalizeScope(filter);
    const normCount = Math.max(1, Math.min(50, Number(count) || 10));
    const normSelectedCategories = Array.isArray(selectedCategories)
      ? selectedCategories.map((c) => normalizeCategory(c)).filter(Boolean)
      : [];

    const catLabel = getCategoryLabel(normCategory);
    const diffLabel = getDifficultyLabel(normDifficulty);
    const scopeLabel = getScopeLabel(normFilter);

    // 1. Verify preparation session ownership
    const preparation = await db.preparationSession.findUnique({
      where: { id: preparationId }
    });

    if (!preparation) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (preparation.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to practice this preparation');
      err.status = 403;
      throw err;
    }

    // 2. Query all existing questions for this preparation
    const allPrepQuestions = await db.interviewQuestion.findMany({
      where: { preparationSessionId: preparationId },
      orderBy: { displayOrder: 'asc' }
    });

    // If no questions exist at all for this preparation
    if (allPrepQuestions.length === 0) {
      const err = new Error(
        'No interview questions have been generated for this preparation yet. Please generate questions in the Question Bank (Phase 7) first.'
      );
      err.status = 400;
      err.code = 'NO_QUESTIONS_AVAILABLE';
      err.details = {
        category: normCategory,
        categoryLabel: catLabel,
        difficulty: normDifficulty,
        difficultyLabel: diffLabel,
        scope: normFilter,
        scopeLabel,
        requestedCount: normCount,
        availableCount: 0,
        totalInPreparation: 0,
        suggestion: 'Navigate to Question Bank and click "Generate Questions" with your desired categories.'
      };
      throw err;
    }

    // 3. Compute question bank breakdown across categories and difficulties
    const breakdown = {
      total: allPrepQuestions.length,
      byCategory: {
        TECHNICAL: 0,
        HR: 0,
        CODING: 0,
        SYSTEM_DESIGN: 0,
        SCENARIO: 0
      },
      byDifficulty: {
        EASY: 0,
        MEDIUM: 0,
        HARD: 0,
        EXPERT: 0
      },
      matrix: {
        TECHNICAL: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        HR: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        CODING: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        SYSTEM_DESIGN: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 },
        SCENARIO: { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 }
      }
    };

    allPrepQuestions.forEach((q) => {
      const c = q.category;
      const d = q.difficulty;
      if (breakdown.byCategory[c] !== undefined) breakdown.byCategory[c]++;
      else breakdown.byCategory[c] = 1;

      if (breakdown.byDifficulty[d] !== undefined) breakdown.byDifficulty[d]++;
      else breakdown.byDifficulty[d] = 1;

      if (!breakdown.matrix[c]) {
        breakdown.matrix[c] = { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 };
      }
      breakdown.matrix[c][d] = (breakdown.matrix[c][d] || 0) + 1;
    });

    // 4. Apply filters to all preparation questions
    let filteredQuestions = [...allPrepQuestions];

    // A. Category filter
    if (normSelectedCategories.length > 0) {
      filteredQuestions = filteredQuestions.filter((q) => normSelectedCategories.includes(q.category));
    } else if (normCategory && normCategory !== 'ALL') {
      filteredQuestions = filteredQuestions.filter((q) => q.category === normCategory);
    }

    // B. Difficulty filter (MIXED accepts any difficulty level)
    if (normDifficulty && normDifficulty !== 'MIXED') {
      filteredQuestions = filteredQuestions.filter((q) => q.difficulty === normDifficulty);
    }

    // C. Skills filter
    if (skills && skills.length > 0) {
      const lowerSkills = skills.map((s) => String(s).toLowerCase().trim());
      filteredQuestions = filteredQuestions.filter((q) => {
        const qTags = (q.tags || []).map((t) => String(t).toLowerCase().trim());
        return lowerSkills.some((s) => qTags.includes(s));
      });
    }

    // D. Scope / Attempt filter
    if (normFilter !== 'ALL') {
      const userAttempts = await db.questionAttempt.findMany({
        where: {
          userId,
          questionId: { in: filteredQuestions.map((q) => q.id) }
        },
        select: { questionId: true, status: true, needsReview: true, isBookmarked: true }
      });

      const attemptedMap = new Map();
      userAttempts.forEach((a) => {
        attemptedMap.set(a.questionId, a);
      });

      if (normFilter === 'UNATTEMPTED') {
        filteredQuestions = filteredQuestions.filter((q) => !attemptedMap.has(q.id));
      } else if (normFilter === 'ATTEMPTED') {
        filteredQuestions = filteredQuestions.filter((q) => attemptedMap.has(q.id));
      } else if (normFilter === 'NEEDS_REVIEW') {
        filteredQuestions = filteredQuestions.filter((q) => attemptedMap.get(q.id)?.needsReview);
      } else if (normFilter === 'BOOKMARKED') {
        filteredQuestions = filteredQuestions.filter((q) => attemptedMap.get(q.id)?.isBookmarked);
      }
    }

    const matchingCount = filteredQuestions.length;

    // 5. Handle zero matching questions
    if (matchingCount === 0) {
      let suggestion = 'Try choosing "Mixed / Any Difficulty" or broadening your category filter.';

      // Check how many questions exist in the requested category at other difficulties
      const sameCategoryQuestions = allPrepQuestions.filter(
        (q) => normCategory === 'ALL' || q.category === normCategory
      );

      if (normCategory !== 'ALL' && sameCategoryQuestions.length > 0) {
        const availableDiffs = Array.from(new Set(sameCategoryQuestions.map((q) => q.difficulty)));
        const diffSummaries = availableDiffs
          .map((d) => `${sameCategoryQuestions.filter((q) => q.difficulty === d).length} ${getDifficultyLabel(d)}`)
          .join(', ');

        const recommendedDiff = availableDiffs.includes('MEDIUM') ? 'Medium' : availableDiffs[0];
        suggestion = `${sameCategoryQuestions.length} ${catLabel} question(s) are available (${diffSummaries}). Switch difficulty to ${recommendedDiff} or "Mixed" to practice.`;
      } else if (normCategory !== 'ALL' && sameCategoryQuestions.length === 0) {
        suggestion = `No ${catLabel} questions have been generated yet. Switch to "All Categories" or generate ${catLabel} questions in Phase 7.`;
      }

      const err = new Error(
        `No questions match your selected ${catLabel} and ${diffLabel} filters. ${suggestion}`
      );
      err.status = 400;
      err.code = 'NO_QUESTIONS_AVAILABLE';
      err.details = {
        category: normCategory,
        categoryLabel: catLabel,
        difficulty: normDifficulty,
        difficultyLabel: diffLabel,
        scope: normFilter,
        scopeLabel,
        requestedCount: normCount,
        availableCount: 0,
        totalInPreparation: allPrepQuestions.length,
        breakdown,
        suggestion
      };
      throw err;
    }

    // 6. Handle fewer matching questions than requested when strict count is requested
    if (matchingCount < normCount && strictCount && !allowPartial) {
      const err = new Error(
        `Only ${matchingCount} question(s) match your current filters. Reduce the session size to ${matchingCount} or broaden your filters.`
      );
      err.status = 400;
      err.code = 'INSUFFICIENT_QUESTIONS';
      err.details = {
        category: normCategory,
        categoryLabel: catLabel,
        difficulty: normDifficulty,
        difficultyLabel: diffLabel,
        scope: normFilter,
        scopeLabel,
        requestedCount: normCount,
        availableCount: matchingCount,
        totalInPreparation: allPrepQuestions.length,
        breakdown,
        suggestion: `Start practice with the ${matchingCount} available matching question(s), or switch to 'All Categories' / 'Mixed Difficulty'.`
      };
      throw err;
    }

    // 7. Select question records (slice to requested count, never exceeding matchingCount)
    const selectedCount = Math.min(normCount, matchingCount);
    const selectedQuestions = filteredQuestions.slice(0, selectedCount);

    // 8. Create PracticeSession record in PostgreSQL
    const sessionTitle = `${preparation.jobTitle || 'Interview Prep'} - ${
      normCategory === 'ALL' ? 'Comprehensive Practice' : `${catLabel} Practice`
    }`;

    const categoriesList =
      normSelectedCategories.length > 0
        ? normSelectedCategories
        : normCategory === 'ALL'
        ? ['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO']
        : [normCategory];

    const practiceSession = await db.practiceSession.create({
      data: {
        userId,
        preparationSessionId: preparationId,
        title: sessionTitle,
        selectedCategories: categoriesList,
        difficulty: normDifficulty === 'MIXED' ? 'MEDIUM' : normDifficulty,
        totalQuestions: selectedQuestions.length,
        attemptedQuestions: 0,
        completedQuestions: 0,
        skippedQuestions: 0,
        currentQuestionIndex: 0,
        status: 'IN_PROGRESS'
      }
    });

    // 9. Create initial DRAFT placeholder attempts to explicitly link questions to session
    // Ensures questions are guaranteed persistent across browser refreshes and resumptions
    const placeholderAttempts = [];
    for (let i = 0; i < selectedQuestions.length; i++) {
      const q = selectedQuestions[i];
      try {
        const attempt = await db.questionAttempt.create({
          data: {
            userId,
            questionId: q.id,
            practiceSessionId: practiceSession.id,
            attemptNumber: 1,
            answer: '',
            answerFormat: 'TEXT',
            revealedHints: [],
            status: 'DRAFT'
          }
        });
        placeholderAttempts.push(attempt);
      } catch (attErr) {
        logger.warn('Non-blocking attempt scaffold warning:', attErr.message);
      }
    }

    // 10. Format sanitized questions for practice arena
    const sanitizedQuestions = selectedQuestions.map((q, idx) => {
      const att = placeholderAttempts.find((a) => a.questionId === q.id);
      return {
        id: q.id,
        category: q.category,
        question: q.question,
        description: q.description,
        difficulty: q.difficulty,
        estimatedTime: q.estimatedTime || 5,
        tags: q.tags || [],
        expectedConcepts: q.expectedConcepts || [],
        hintsCount: Array.isArray(q.hints) ? q.hints.length : 0,
        displayIndex: idx + 1,
        savedAnswer: '',
        answerFormat: 'TEXT',
        revealedHints: [],
        status: 'DRAFT',
        isBookmarked: false,
        needsReview: false,
        selfRating: null,
        personalNotes: '',
        attemptId: att?.id || null
      };
    });

    logger.info('Practice session started successfully', {
      practiceSessionId: practiceSession.id,
      preparationId,
      userId,
      questionsCount: sanitizedQuestions.length,
      category: normCategory,
      difficulty: normDifficulty
    });

    return {
      session: practiceSession,
      questions: sanitizedQuestions,
      availableBreakdown: breakdown,
      notice:
        matchingCount < normCount
          ? `Selected ${matchingCount} available question(s) matching your criteria.`
          : null
    };
  }

  /**
   * Retrieves practice sessions for a preparation
   */
  static async getSessions(preparationId, userId, queryParams = {}) {
    const { status, page = 1, limit = 10, sortOrder = 'desc' } = queryParams;

    // Verify preparation ownership
    const preparation = await db.preparationSession.findUnique({
      where: { id: preparationId }
    });

    if (!preparation) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (preparation.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view these practice sessions');
      err.status = 403;
      throw err;
    }

    const { skip, take } = getPaginationParams(page, limit);
    const where = {
      preparationSessionId: preparationId,
      userId
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      db.practiceSession.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: sortOrder }
      }),
      db.practiceSession.count({ where })
    ]);

    return formatPaginatedResponse({
      data: items,
      total,
      page,
      limit
    });
  }

  /**
   * Retrieves single practice session details with saved answers and current state
   */
  static async getSessionById(sessionId, userId) {
    const session = await db.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        preparationSession: {
          select: { id: true, userId: true, jobTitle: true, companyName: true }
        }
      }
    });

    if (!session) {
      const err = new Error('Practice session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to access this practice session');
      err.status = 403;
      throw err;
    }

    // 1. Check for linked attempts created specifically for this practice session
    const attempts = await db.questionAttempt.findMany({
      where: {
        userId,
        practiceSessionId: sessionId
      },
      include: {
        question: true
      },
      orderBy: { createdAt: 'asc' }
    });

    let mappedQuestions = [];

    if (attempts.length > 0) {
      mappedQuestions = attempts.map((att, idx) => {
        const q = att.question;
        return {
          id: q.id,
          category: q.category,
          question: q.question,
          description: q.description,
          difficulty: q.difficulty,
          estimatedTime: q.estimatedTime || 5,
          tags: q.tags || [],
          expectedConcepts: q.expectedConcepts || [],
          hints: q.hints || [],
          displayIndex: idx + 1,
          savedAnswer: att.answer || '',
          answerFormat: att.answerFormat || 'TEXT',
          revealedHints: att.revealedHints || [],
          status: att.status || 'DRAFT',
          isBookmarked: att.isBookmarked || false,
          needsReview: att.needsReview || false,
          selfRating: att.selfRating || null,
          personalNotes: att.personalNotes || null,
          submittedAt: att.submittedAt || null,
          draftSavedAt: att.draftSavedAt || null,
          attemptId: att.id
        };
      });
    } else {
      // Fallback for legacy practice sessions without initial placeholder attempts
      const whereFilter = {
        preparationSessionId: session.preparationSessionId
      };

      if (
        Array.isArray(session.selectedCategories) &&
        session.selectedCategories.length > 0 &&
        session.selectedCategories.length < 5
      ) {
        whereFilter.category = { in: session.selectedCategories };
      }

      const questions = await db.interviewQuestion.findMany({
        where: whereFilter,
        orderBy: { displayOrder: 'asc' },
        take: session.totalQuestions || 20
      });

      mappedQuestions = questions.map((q, idx) => ({
        id: q.id,
        category: q.category,
        question: q.question,
        description: q.description,
        difficulty: q.difficulty,
        estimatedTime: q.estimatedTime || 5,
        tags: q.tags || [],
        expectedConcepts: q.expectedConcepts || [],
        hints: q.hints || [],
        displayIndex: idx + 1,
        savedAnswer: '',
        answerFormat: 'TEXT',
        revealedHints: [],
        status: 'DRAFT',
        isBookmarked: false,
        needsReview: false,
        selfRating: null,
        personalNotes: null,
        submittedAt: null,
        draftSavedAt: null,
        attemptId: null
      }));
    }

    return {
      session,
      questions: mappedQuestions
    };
  }

  /**
   * Resumes an in-progress or paused practice session
   */
  static async resumeSession(sessionId, userId) {
    const session = await db.practiceSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      const err = new Error('Practice session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to resume this session');
      err.status = 403;
      throw err;
    }

    const updated = await db.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        lastActivityAt: new Date()
      }
    });

    return this.getSessionById(sessionId, userId);
  }

  /**
   * Saves or updates an answer draft
   */
  static async saveDraft(sessionId, questionId, userId, draftData) {
    const { answer = '', answerFormat = 'TEXT', revealedHints = [] } = draftData;

    let session = null;
    if (sessionId) {
      session = await db.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        const err = new Error('Practice session not found');
        err.status = 404;
        throw err;
      }

      if (session.userId !== userId) {
        const err = new Error('Access denied: You do not have permission to save drafts for this session');
        err.status = 403;
        throw err;
      }
    }

    // Verify question
    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { preparationSession: true }
    });

    if (!question) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    if (question.preparationSession && question.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to draft answers for this question');
      err.status = 403;
      throw err;
    }

    if (session && question.preparationSessionId !== session.preparationSessionId) {
      const err = new Error('Question does not belong to this practice session');
      err.status = 400;
      throw err;
    }

    // Find existing draft
    const draftWhere = {
      userId,
      questionId
    };
    if (sessionId) {
      draftWhere.practiceSessionId = sessionId;
    }

    const existingDraft = await db.questionAttempt.findFirst({
      where: draftWhere
    });

    let attempt;
    if (existingDraft) {
      attempt = await db.questionAttempt.update({
        where: { id: existingDraft.id },
        data: {
          answer,
          answerFormat,
          revealedHints,
          status: 'DRAFT',
          draftSavedAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      attempt = await db.questionAttempt.create({
        data: {
          userId,
          questionId,
          practiceSessionId: sessionId || null,
          answer,
          answerFormat,
          revealedHints,
          status: 'DRAFT',
          draftSavedAt: new Date(),
          attemptNumber: 1
        }
      });
    }

    // Update session last activity
    if (sessionId) {
      await db.practiceSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() }
      });
    }

    return attempt;
  }

  /**
   * Submits an answer attempt
   */
  static async submitAttempt(sessionId, questionId, userId, attemptData) {
    const { answer, answerFormat = 'TEXT', timeTaken = 0, revealedHints = [] } = attemptData;

    let session = null;
    if (sessionId) {
      session = await db.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        const err = new Error('Practice session not found');
        err.status = 404;
        throw err;
      }

      if (session.userId !== userId) {
        const err = new Error('Access denied: You do not have permission to submit answers for this session');
        err.status = 403;
        throw err;
      }
    }

    // Verify question
    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { preparationSession: true }
    });

    if (!question) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    if (question.preparationSession && question.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to answer this question');
      err.status = 403;
      throw err;
    }

    if (session && question.preparationSessionId !== session.preparationSessionId) {
      const err = new Error('Question does not belong to this practice session');
      err.status = 400;
      throw err;
    }

    // Determine attempt number
    const previousAttemptsCount = await db.questionAttempt.count({
      where: {
        userId,
        questionId,
        status: { not: 'DRAFT' }
      }
    });

    const attemptNumber = previousAttemptsCount + 1;

    // Check if draft exists in this session to update or create new
    const attemptWhere = {
      userId,
      questionId
    };
    if (sessionId) {
      attemptWhere.practiceSessionId = sessionId;
    }

    const existingSessionAttempt = await db.questionAttempt.findFirst({
      where: attemptWhere
    });

    let attempt;
    if (existingSessionAttempt) {
      attempt = await db.questionAttempt.update({
        where: { id: existingSessionAttempt.id },
        data: {
          answer,
          answerFormat,
          timeTaken,
          revealedHints,
          attemptNumber,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      attempt = await db.questionAttempt.create({
        data: {
          userId,
          questionId,
          practiceSessionId: sessionId || null,
          answer,
          answerFormat,
          timeTaken,
          revealedHints,
          attemptNumber,
          status: 'SUBMITTED',
          submittedAt: new Date()
        }
      });
    }

    // Update distinct answered count in session if session exists
    if (sessionId) {
      const answeredCount = await db.questionAttempt.count({
        where: {
          practiceSessionId: sessionId,
          status: 'SUBMITTED'
        }
      });

      await db.practiceSession.update({
        where: { id: sessionId },
        data: {
          attemptedQuestions: answeredCount,
          completedQuestions: answeredCount,
          lastActivityAt: new Date()
        }
      });
    }

    logger.info('Answer submitted successfully', {
      attemptId: attempt.id,
      questionId,
      userId,
      attemptNumber
    });

    return attempt;
  }

  /**
   * Retrieves past attempts for a question by the authenticated user
   */
  static async getQuestionAttempts(questionId, userId) {
    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId },
      include: {
        preparationSession: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!question) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    if (question.preparationSession && question.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view attempts for this question');
      err.status = 403;
      throw err;
    }

    return await db.questionAttempt.findMany({
      where: {
        userId,
        questionId
      },
      orderBy: { attemptedAt: 'desc' }
    });
  }

  /**
   * Sequentially reveals a hint for a question
   */
  static async revealHint(sessionId, questionId, userId, hintIndex = 0) {
    const session = await db.practiceSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId) {
      const err = new Error('Access denied or practice session not found');
      err.status = 403;
      throw err;
    }

    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question || question.preparationSessionId !== session.preparationSessionId) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    const hints = Array.isArray(question.hints) ? question.hints : [];
    if (hints.length === 0) {
      return {
        hasHints: false,
        message: 'No hints available for this question.',
        hint: null,
        hintIndex: 0,
        totalHints: 0
      };
    }

    const targetIdx = Math.min(Math.max(0, hintIndex), hints.length - 1);

    // Save revealed hint index in active draft/attempt
    try {
      const existing = await db.questionAttempt.findFirst({
        where: { userId, questionId, practiceSessionId: sessionId }
      });

      if (existing) {
        const currentRevealed = Array.isArray(existing.revealedHints) ? existing.revealedHints : [];
        if (!currentRevealed.includes(targetIdx)) {
          await db.questionAttempt.update({
            where: { id: existing.id },
            data: {
              revealedHints: [...currentRevealed, targetIdx]
            }
          });
        }
      }
    } catch (saveErr) {
      logger.warn('Failed to persist revealed hint state:', saveErr.message);
    }

    return {
      hasHints: true,
      hint: hints[targetIdx],
      hintIndex: targetIdx,
      totalHints: hints.length
    };
  }

  /**
   * Reveals the reference answer, explanation, and evaluation rubric
   */
  static async getReferenceAnswer(questionId, userId) {
    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId },
      include: {
        preparationSession: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!question) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    if (question.preparationSession && question.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view reference material for this question');
      err.status = 403;
      throw err;
    }

    return {
      questionId: question.id,
      category: question.category,
      referenceAnswer: question.referenceAnswer || 'No model reference answer provided for this question.',
      explanation: question.explanation || 'No detailed architectural explanation provided.',
      expectedConcepts: question.expectedConcepts || [],
      tags: question.tags || [],
      hints: question.hints || []
    };
  }

  /**
   * Completes a practice session
   */
  static async completeSession(sessionId, userId) {
    const session = await db.practiceSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      const err = new Error('Practice session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to complete this session');
      err.status = 403;
      throw err;
    }

    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    );

    const completed = await db.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastActivityAt: new Date(),
        durationSeconds
      }
    });

    logger.info('Practice session marked completed', {
      sessionId,
      userId,
      durationSeconds
    });

    return completed;
  }

  /**
   * Updates question review state, bookmark, self-assessment, and personal notes
   */
  static async updateReviewStatus(questionId, userId, reviewData) {
    const { isBookmarked, needsReview, selfRating, personalNotes } = reviewData;

    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId },
      include: {
        preparationSession: { select: { id: true, userId: true } }
      }
    });

    if (!question) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    if (question.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to review this question');
      err.status = 403;
      throw err;
    }

    // Find latest attempt or create a lightweight entry
    const latestAttempt = await db.questionAttempt.findFirst({
      where: { userId, questionId },
      orderBy: { updatedAt: 'desc' }
    });

    const updates = {};
    if (isBookmarked !== undefined) updates.isBookmarked = isBookmarked;
    if (needsReview !== undefined) updates.needsReview = needsReview;
    if (selfRating !== undefined) updates.selfRating = selfRating;
    if (personalNotes !== undefined) updates.personalNotes = personalNotes;

    let result;
    if (latestAttempt) {
      result = await db.questionAttempt.update({
        where: { id: latestAttempt.id },
        data: updates
      });
    } else {
      result = await db.questionAttempt.create({
        data: {
          userId,
          questionId,
          answer: '',
          status: 'DRAFT',
          ...updates
        }
      });
    }

    return result;
  }

  /**
   * Retrieves overall practice history for the authenticated user
   */
  static async getPracticeHistory(userId, queryParams = {}) {
    const {
      preparationId,
      status,
      category,
      search,
      page = 1,
      limit = 10,
      sortOrder = 'desc'
    } = queryParams;

    const { skip, take } = getPaginationParams(page, limit);

    const where = { userId };

    if (preparationId) {
      where.preparationSessionId = preparationId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [items, total] = await Promise.all([
      db.practiceSession.findMany({
        where,
        skip,
        take,
        include: {
          preparationSession: {
            select: {
              id: true,
              jobTitle: true,
              companyName: true,
              experienceLevel: true
            }
          }
        },
        orderBy: { createdAt: sortOrder }
      }),
      db.practiceSession.count({ where })
    ]);

    return formatPaginatedResponse({
      data: items,
      total,
      page,
      limit
    });
  }

  /**
   * Aggregates real practice statistics for candidate dashboard
   */
  static async getPracticeStats(userId) {
    const [
      totalSessions,
      completedSessions,
      inProgressSessions,
      allAttempts,
      bookmarkedCount,
      needsReviewCount
    ] = await Promise.all([
      db.practiceSession.count({ where: { userId } }),
      db.practiceSession.count({ where: { userId, status: 'COMPLETED' } }),
      db.practiceSession.count({ where: { userId, status: 'IN_PROGRESS' } }),
      db.questionAttempt.findMany({
        where: { userId, status: 'SUBMITTED' },
        include: {
          question: {
            select: { category: true, difficulty: true }
          }
        }
      }),
      db.questionAttempt.count({ where: { userId, isBookmarked: true } }),
      db.questionAttempt.count({ where: { userId, needsReview: true } })
    ]);

    // Distinct questions attempted
    const uniqueQuestionsAttempted = new Set(allAttempts.map((a) => a.questionId)).size;

    // Category breakdown
    const categoryCounts = {
      TECHNICAL: 0,
      HR: 0,
      CODING: 0,
      SYSTEM_DESIGN: 0,
      SCENARIO: 0
    };

    // Difficulty breakdown
    const difficultyCounts = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
      EXPERT: 0
    };

    allAttempts.forEach((a) => {
      const cat = a.question?.category;
      if (cat && categoryCounts[cat] !== undefined) {
        categoryCounts[cat]++;
      }
      const diff = a.question?.difficulty;
      if (diff && difficultyCounts[diff] !== undefined) {
        difficultyCounts[diff]++;
      }
    });

    return {
      totalSessions,
      completedSessions,
      inProgressSessions,
      totalSubmittedAttempts: allAttempts.length,
      uniqueQuestionsAttempted,
      bookmarkedCount,
      needsReviewCount,
      categoryBreakdown: categoryCounts,
      difficultyBreakdown: difficultyCounts
    };
  }
}

