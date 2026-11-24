import { QuestionService } from '../services/question.service.js';
import {
  generateQuestionsSchema,
  queryQuestionsSchema,
  updateQuestionSchema
} from '../validators/question.validator.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Controller managing HTTP endpoints for Phase 7 AI Question Generation
 */

/**
 * POST /api/preparations/:id/questions/generate
 * Generates personalized interview questions and/or coding challenges
 */
export async function generateQuestions(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const validatedBody = generateQuestionsSchema.parse(req.body || {});

    logger.info('Received question generation request', {
      preparationId: id,
      userId,
      category: validatedBody.category,
      count: validatedBody.count
    });

    const result = await QuestionService.generateQuestions(id, userId, validatedBody);

    return sendSuccess(
      res,
      `Successfully generated ${result.data.totalCreated} interview questions and challenges`,
      result.data,
      201
    );
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Validation error in question generation parameters', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/preparations/:id/questions
 * Retrieves paginated list of generated interview questions with search and filter
 */
export async function getQuestions(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const validatedQuery = queryQuestionsSchema.parse(req.query);
    const paginatedResult = await QuestionService.getQuestions(id, userId, validatedQuery);

    return res.status(200).json({
      success: true,
      message: 'Interview questions retrieved successfully',
      data: paginatedResult.items,
      pagination: paginatedResult.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid question query parameters', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/questions/:questionId
 * Retrieves individual question details
 */
export async function getQuestionById(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const question = await QuestionService.getQuestionById(questionId, userId);
    return sendSuccess(res, 'Interview question details retrieved', question, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * PATCH /api/questions/:questionId
 * Updates question fields
 */
export async function updateQuestion(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const validatedBody = updateQuestionSchema.parse(req.body);
    const updated = await QuestionService.updateQuestion(questionId, userId, validatedBody);

    return sendSuccess(res, 'Question updated successfully', updated, 200);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid question update payload', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * DELETE /api/questions/:questionId
 * Deletes an interview question
 */
export async function deleteQuestion(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const result = await QuestionService.deleteQuestion(questionId, userId);
    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * POST /api/preparations/:id/questions/regenerate
 * Regenerates questions for a specific category
 */
export async function regenerateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const validatedBody = generateQuestionsSchema.parse(req.body || {});
    const result = await QuestionService.regenerateCategory(id, userId, validatedBody.category, validatedBody);

    return sendSuccess(
      res,
      `Successfully regenerated ${result.data.totalCreated} questions for ${validatedBody.category}`,
      result.data,
      200
    );
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Validation error in question regeneration parameters', 400, error.format());
    }
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/preparations/:id/coding-challenges
 * Retrieves coding challenges with protected test cases
 */
export async function getCodingChallenges(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const challenges = await QuestionService.getCodingChallenges(id, userId);
    return sendSuccess(res, 'Coding challenges retrieved successfully', challenges, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/coding-challenges/:challengeId
 * Retrieves single challenge with masked hidden test cases
 */
export async function getCodingChallengeById(req, res, next) {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const challenge = await QuestionService.getCodingChallengeById(challengeId, userId);
    return sendSuccess(res, 'Coding challenge details retrieved', challenge, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

