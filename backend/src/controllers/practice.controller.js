import { PracticeService } from '../services/practice.service.js';
import {
  createPracticeSessionSchema,
  saveDraftSchema,
  submitAttemptSchema,
  updateReviewSchema,
  queryPracticeSessionsSchema,
  queryHistorySchema
} from '../validators/practice.validator.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Controller managing HTTP endpoints for Phase 8 Interview Practice Engine
 */

/**
 * POST /api/preparations/:id/practice/sessions
 * Starts a new interactive practice session
 */
export async function startPracticeSession(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const validatedBody = createPracticeSessionSchema.parse(req.body || {});
    const result = await PracticeService.startSession(id, userId, validatedBody);

    return sendSuccess(res, 'Practice session started successfully', result, 201);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Validation error in practice session parameters', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/preparations/:id/practice/availability
 * Retrieves question bank availability counts by category and difficulty
 */
export async function getPracticeAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const availability = await PracticeService.getQuestionAvailability(id, userId);
    return sendSuccess(res, 'Practice question availability retrieved', availability, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/preparations/:id/practice/sessions
 * Retrieves practice sessions for a preparation
 */
export async function getPracticeSessions(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const validatedQuery = queryPracticeSessionsSchema.parse(req.query);
    const paginated = await PracticeService.getSessions(id, userId, validatedQuery);

    return res.status(200).json({
      success: true,
      message: 'Practice sessions retrieved successfully',
      data: paginated.items,
      pagination: paginated.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid query parameters', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/practice/sessions/:sessionId
 * Retrieves single practice session details with saved questions & drafts
 */
export async function getPracticeSessionById(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const sessionData = await PracticeService.getSessionById(sessionId, userId);
    return sendSuccess(res, 'Practice session retrieved', sessionData, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * POST /api/practice/sessions/:sessionId/resume
 * Resumes an existing practice session
 */
export async function resumePracticeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const resumedData = await PracticeService.resumeSession(sessionId, userId);
    return sendSuccess(res, 'Practice session resumed', resumedData, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * PUT /api/practice/sessions/:sessionId/questions/:questionId/draft
 * Saves an answer draft for an in-progress question
 */
export async function saveAnswerDraft(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.body?.sessionId || null;
    const { questionId } = req.params;
    const userId = req.user.id;

    const validatedBody = saveDraftSchema.parse(req.body || {});
    const draft = await PracticeService.saveDraft(sessionId, questionId, userId, validatedBody);

    return sendSuccess(res, 'Draft saved successfully', draft, 200);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid draft payload', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * POST /api/practice/sessions/:sessionId/questions/:questionId/attempts
 * Submits an answer attempt
 */
export async function submitAnswerAttempt(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.body?.sessionId || null;
    const { questionId } = req.params;
    const userId = req.user.id;

    const validatedBody = submitAttemptSchema.parse(req.body || {});
    const attempt = await PracticeService.submitAttempt(sessionId, questionId, userId, validatedBody);

    return sendSuccess(res, 'Answer submitted successfully', attempt, 201);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid attempt submission payload', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/questions/:questionId/attempts
 * Retrieves past attempts for a question
 */
export async function getQuestionAttempts(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const attempts = await PracticeService.getQuestionAttempts(questionId, userId);
    return sendSuccess(res, 'Question attempts retrieved', attempts, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * POST /api/practice/sessions/:sessionId/questions/:questionId/hints/reveal
 * Sequentially reveals a hint
 */
export async function revealHint(req, res, next) {
  try {
    const { sessionId, questionId } = req.params;
    const userId = req.user.id;
    const hintIndex = Number(req.body?.hintIndex ?? 0);

    const hintData = await PracticeService.revealHint(sessionId, questionId, userId, hintIndex);
    return sendSuccess(res, 'Hint revealed', hintData, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/questions/:questionId/reference-answer
 * Retrieves reference answer and explanation
 */
export async function getReferenceAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const refData = await PracticeService.getReferenceAnswer(questionId, userId);
    return sendSuccess(res, 'Reference answer retrieved', refData, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * POST /api/practice/sessions/:sessionId/complete
 * Completes a practice session
 */
export async function completePracticeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const completed = await PracticeService.completeSession(sessionId, userId);
    return sendSuccess(res, 'Practice session completed successfully', completed, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * PATCH /api/questions/:questionId/review
 * Updates question bookmark, review flag, self-assessment, and personal notes
 */
export async function updateQuestionReview(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const validatedBody = updateReviewSchema.parse(req.body || {});
    const updated = await PracticeService.updateReviewStatus(questionId, userId, validatedBody);

    return sendSuccess(res, 'Question review state updated', updated, 200);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid review update payload', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/practice/history
 * Retrieves overall practice history for candidate
 */
export async function getPracticeHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const validatedQuery = queryHistorySchema.parse(req.query);

    const history = await PracticeService.getPracticeHistory(userId, validatedQuery);
    return res.status(200).json({
      success: true,
      message: 'Practice history retrieved successfully',
      data: history.items,
      pagination: history.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid history query parameters', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/practice/stats
 * Retrieves aggregated practice statistics
 */
export async function getPracticeStats(req, res, next) {
  try {
    const userId = req.user.id;
    const stats = await PracticeService.getPracticeStats(userId);
    return sendSuccess(res, 'Practice statistics retrieved', stats, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

