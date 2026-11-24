import { PreparationService } from '../services/preparation.service.js';
import { processDocumentUpload } from '../utils/documentExtractor.js';
import {
  createPreparationSchema,
  updatePreparationSchema,
  updateJobDescriptionSchema,
  queryPreparationsSchema
} from '../validators/preparation.validator.js';
import { logger } from '../utils/logger.js';

/**
 * Controller managing interview preparations, job description uploads, and workspace metrics
 */
export const createPreparation = async (req, res, next) => {
  try {
    let fileInfo = null;

    // Handle document upload if file attached in multipart request
    if (req.file) {
      fileInfo = await processDocumentUpload(req.file.buffer, req.file.originalname);
      if (!req.body.jobDescription || req.body.jobDescription.trim().length === 0) {
        req.body.jobDescription = fileInfo.rawText;
      }
    }

    // Parse JSON arrays sent as stringified multipart fields
    if (typeof req.body.preferences === 'string') {
      try {
        req.body.preferences = JSON.parse(req.body.preferences);
      } catch {
        req.body.preferences = [req.body.preferences];
      }
    }

    const validatedData = createPreparationSchema.parse(req.body);
    const session = await PreparationService.createPreparation(req.user.id, validatedData, fileInfo);

    return res.status(201).json({
      success: true,
      message: 'Preparation session created successfully',
      id: session.id,
      data: {
        id: session.id,
        title: session.title,
        companyName: session.companyName,
        jobTitle: session.jobTitle,
        status: session.status,
        progress: session.progress,
        createdAt: session.createdAt,
        jobDescription: session.jobDescription
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for preparation session',
        errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }
    next(error);
  }
};

/**
 * Upload and extract text from document (PDF / DOCX / TXT)
 */
export const uploadAndExtractDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided. Please attach a PDF, DOCX, or text file.'
      });
    }

    const result = await processDocumentUpload(req.file.buffer, req.file.originalname);

    return res.status(200).json({
      success: true,
      message: 'Document text extracted successfully',
      data: {
        extractedText: result.rawText,
        sourceType: result.sourceType,
        originalFileName: result.originalFileName,
        fileSize: result.fileSize
      }
    });
  } catch (error) {
    logger.warn('Document extraction failed', { error: error.message });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to extract text from the uploaded document'
    });
  }
};

/**
 * Get all preparations for the authenticated user with search, filter, and pagination
 */
export const getPreparations = async (req, res, next) => {
  try {
    const validatedQuery = queryPreparationsSchema.parse(req.query);
    const result = await PreparationService.getPreparations(req.user.id, validatedQuery);

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.issues
      });
    }
    next(error);
  }
};

/**
 * Get single preparation session details
 */
export const getPreparationById = async (req, res, next) => {
  try {
    const session = await PreparationService.getPreparationById(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update preparation details
 */
export const updatePreparation = async (req, res, next) => {
  try {
    const validatedData = updatePreparationSchema.parse(req.body);
    const updated = await PreparationService.updatePreparation(req.params.id, req.user.id, validatedData);

    return res.status(200).json({
      success: true,
      message: 'Preparation session updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for preparation update',
        errors: error.issues
      });
    }
    next(error);
  }
};

/**
 * Archive / soft delete preparation session
 */
export const archivePreparation = async (req, res, next) => {
  try {
    const archived = await PreparationService.archivePreparation(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Preparation session archived successfully',
      data: {
        id: archived.id,
        status: archived.status,
        deletedAt: archived.deletedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore an archived preparation session
 */
export const restorePreparation = async (req, res, next) => {
  try {
    const restored = await PreparationService.restorePreparation(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Preparation session restored successfully',
      data: {
        id: restored.id,
        status: restored.status,
        deletedAt: restored.deletedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete a preparation session
 */
export const deletePreparation = async (req, res, next) => {
  try {
    const result = await PreparationService.deletePreparationPermanently(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get preparation statistics for candidate dashboard
 */
export const getPreparationStats = async (req, res, next) => {
  try {
    const stats = await PreparationService.getPreparationStats(req.user.id);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get job description for a preparation session
 */
export const getJobDescription = async (req, res, next) => {
  try {
    const jobDesc = await PreparationService.getJobDescription(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: jobDesc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update job description text
 */
export const updateJobDescription = async (req, res, next) => {
  try {
    const validated = updateJobDescriptionSchema.parse(req.body);
    const updated = await PreparationService.updateJobDescription(req.params.id, req.user.id, validated.rawText);

    return res.status(200).json({
      success: true,
      message: 'Job description updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for job description',
        errors: error.issues
      });
    }
    next(error);
  }
};

