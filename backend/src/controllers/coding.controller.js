import { CodeExecutionService } from '../services/codeExecution/codeExecution.service.js';
import { QuestionService } from '../services/question.service.js';
import {
  runCodeSchema,
  standaloneRunSchema,
  submitCodeSchema,
  querySubmissionsSchema
} from '../validators/coding.validator.js';

/**
 * GET /api/coding/languages
 * Returns list of supported programming languages and configuration
 */
export async function getSupportedLanguages(req, res, next) {
  try {
    const languages = CodeExecutionService.getSupportedLanguages();
    return res.status(200).json({
      success: true,
      data: { languages }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/starter-code?language=...
 * Retrieves default starter code for standalone mode without requiring a challenge
 */
export async function getStandaloneStarterCode(req, res, next) {
  try {
    const language = req.query.language || 'javascript';
    const starterData = CodeExecutionService.getStandaloneStarterCode(language);
    return res.status(200).json({
      success: true,
      data: starterData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/coding/run
 * Standalone code execution (does not require challengeId)
 */
export async function runStandaloneCode(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const parsed = standaloneRunSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const result = await CodeExecutionService.executeStandalone({
      userId,
      language: parsed.data.language,
      sourceCode: parsed.data.sourceCode,
      stdin: parsed.data.stdin || ''
    });

    return res.status(200).json({
      success: Boolean(result.success),
      errorType: result.status === 'AUTH_ERROR' ? 'AUTH_ERROR' : undefined,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/challenges/:challengeId
 * Retrieves challenge details with masked hidden test cases
 */
export async function getChallengeDetails(req, res, next) {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const challenge = await QuestionService.getCodingChallengeById(challengeId, userId);
    return res.status(200).json({
      success: true,
      data: { challenge }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/challenges/:challengeId/starter-code?language=...
 * Retrieves starter code for selected language
 */
export async function getStarterCode(req, res, next) {
  try {
    const { challengeId } = req.params;
    const language = req.query.language || 'javascript';
    const userId = req.user.id;

    const starterData = await CodeExecutionService.getStarterCode(challengeId, language, userId);
    return res.status(200).json({
      success: true,
      data: starterData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/coding/challenges/:challengeId/run
 * Runs code against sample / public test cases
 */
export async function runCode(req, res, next) {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const parsed = runCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const result = await CodeExecutionService.runSampleTestCases(challengeId, userId, parsed.data);
    return res.status(200).json({
      success: Boolean(result.success),
      errorType: result.status === 'AUTH_ERROR' ? 'AUTH_ERROR' : undefined,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/coding/challenges/:challengeId/submit
 * Evaluates solution against visible and hidden test cases, persists submission
 */
export async function submitSolution(req, res, next) {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const parsed = submitCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const result = await CodeExecutionService.submitSolution(challengeId, userId, parsed.data);
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/submissions/:submissionId
 * Retrieves detailed submission results
 */
export async function getSubmissionDetails(req, res, next) {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission = await CodeExecutionService.getSubmissionById(submissionId, userId);
    return res.status(200).json({
      success: true,
      data: { submission }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/challenges/:challengeId/submissions
 * Retrieves paginated submissions for a specific challenge
 */
export async function getChallengeSubmissions(req, res, next) {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;
    const query = querySubmissionsSchema.parse(req.query);

    const result = await CodeExecutionService.getChallengeSubmissions(challengeId, userId, query);
    return res.status(200).json({
      success: Boolean(result.success),
      errorType: result.status === 'AUTH_ERROR' ? 'AUTH_ERROR' : undefined,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/submissions/history
 * Retrieves global user coding submissions history
 */
export async function getUserCodingHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const query = querySubmissionsSchema.parse(req.query);

    const result = await CodeExecutionService.getUserCodingHistory(userId, query);
    return res.status(200).json({
      success: Boolean(result.success),
      errorType: result.status === 'AUTH_ERROR' ? 'AUTH_ERROR' : undefined,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coding/stats
 * Retrieves coding assessment analytics for the authenticated user
 */
export async function getCodingStats(req, res, next) {
  try {
    const userId = req.user.id;
    const stats = await CodeExecutionService.getCodingStats(userId);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
}

