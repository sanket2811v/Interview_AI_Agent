import { AnalysisService } from '../services/analysis.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Controller handling HTTP endpoints for AI-Powered Job Description Analysis
 */

/**
 * POST /api/preparations/:id/analyze
 * Initiates or retrieves AI analysis for a preparation session's saved job description
 */
export async function startAnalysis(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info('Received request to analyze job description', { preparationId: id, userId });
    const analysis = await AnalysisService.analyzePreparation(id, userId, false);

    return sendSuccess(res, 'Job description analyzed successfully', analysis, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/preparations/:id/analysis
 * Retrieves previously generated job description analysis
 */
export async function getAnalysis(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analysis = await AnalysisService.getAnalysis(id, userId);
    return sendSuccess(res, 'Job analysis retrieved successfully', analysis, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * POST /api/preparations/:id/analysis/regenerate
 * Forces re-analysis of the saved job description
 */
export async function regenerateAnalysis(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info('Received request to regenerate job analysis', { preparationId: id, userId });
    const analysis = await AnalysisService.regenerateAnalysis(id, userId);

    return sendSuccess(res, 'Job analysis regenerated successfully', analysis, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

/**
 * GET /api/preparations/:id/analysis/status
 * Returns current processing / completion status of job description analysis
 */
export async function getAnalysisStatus(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const status = await AnalysisService.getAnalysisStatus(id, userId);
    return sendSuccess(res, 'Job analysis status retrieved', status, 200);
  } catch (error) {
    if (error.status && error.status < 500) {
      return sendError(res, error.message, error.status, error.details || null);
    }
    next(error);
  }
}

