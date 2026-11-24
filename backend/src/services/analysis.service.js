import { db } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { OpenAIService } from './openai.service.js';

/**
 * Service managing Job Description Analysis lifecycle, PostgreSQL persistence,
 * tenant isolation, and status orchestration.
 */
export class AnalysisService {
  /**
   * Run AI analysis on a saved job description
   *
   * @param {string} preparationId - Preparation session UUID
   * @param {string} userId - Authenticated user UUID
   * @param {boolean} forceRegenerate - If true, bypasses existing cached analysis
   * @returns {Promise<object>} Persisted JobAnalysis record
   */
  static async analyzePreparation(preparationId, userId, forceRegenerate = false) {
    // 1. Fetch preparation session with its job description and existing analysis
    const session = await db.preparationSession.findUnique({
      where: { id: preparationId },
      include: {
        jobDescription: true,
        jobAnalysis: true
      }
    });

    if (!session) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    // 2. Strict multi-tenant user ownership verification
    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to analyze this preparation');
      err.status = 403;
      throw err;
    }

    // 3. Verify job description exists and contains meaningful text
    const jobDescription = session.jobDescription;
    if (!jobDescription || !jobDescription.rawText || jobDescription.rawText.trim().length < 20) {
      const err = new Error(
        'A valid job description of at least 20 characters must be saved before analysis can be executed'
      );
      err.status = 400;
      throw err;
    }

    // 4. Return existing analysis if already performed and not regenerating
    if (session.jobAnalysis && !forceRegenerate) {
      logger.info('Returning existing JobAnalysis record', {
        preparationId,
        analysisId: session.jobAnalysis.id
      });
      return session.jobAnalysis;
    }

    // 5. Prevent duplicate concurrent executions, with 2-minute auto-recovery for stale locks
    if (session.status === 'ANALYZING' && !forceRegenerate) {
      const updatedAtMs = session.updatedAt ? new Date(session.updatedAt).getTime() : 0;
      const elapsedSinceUpdate = Date.now() - updatedAtMs;
      const STALE_LOCK_THRESHOLD_MS = 120000; // 2 minutes

      if (elapsedSinceUpdate < STALE_LOCK_THRESHOLD_MS) {
        const err = new Error('An analysis is already in progress for this preparation session. Please wait.');
        err.status = 409;
        throw err;
      }

      logger.warn('Auto-recovering from stale ANALYZING status on preparation session', {
        preparationId,
        elapsedSinceUpdateMs: elapsedSinceUpdate
      });
    }

    // 6. Fetch user profile for candidate skill-gap alignment
    let candidateProfile = null;
    try {
      candidateProfile = await db.userProfile.findUnique({
        where: { userId }
      });
    } catch (profileErr) {
      logger.warn('Failed to retrieve user profile for skill-gap matching:', profileErr.message);
    }

    const previousStatus = session.status;
    const startAnalysisTimestamp = Date.now();

    logger.info('Initiating Phase 6 Job Description Analysis pipeline', {
      preparationId,
      userId,
      forceRegenerate,
      rawTextLength: jobDescription.rawText.length
    });

    // 7. Transition preparation session status to ANALYZING
    await db.preparationSession.update({
      where: { id: preparationId },
      data: { status: 'ANALYZING', updatedAt: new Date() }
    });

    try {
      const openAiStartTime = Date.now();
      logger.info('Dispatching prompt to OpenAI Chat Completions API', {
        preparationId
      });

      // 8. Invoke Centralized OpenAI Service
      const analysisOutput = await OpenAIService.analyzeJobDescription(
        jobDescription.rawText,
        candidateProfile,
        {
          userId,
          preparationSessionId: preparationId
        }
      );
      const openAiElapsedMs = Date.now() - openAiStartTime;

      logger.info('OpenAI analysis response received and parsed', {
        preparationId,
        openAiElapsedMs,
        jobTitle: analysisOutput.jobOverview?.jobTitle
      });

      // 9. Map and persist to PostgreSQL via transaction
      const dbPersistStartTime = Date.now();
      const savedAnalysis = await db.$transaction(async (tx) => {
        // Upsert JobAnalysis record
        const analysisData = {
          jobTitle: analysisOutput.jobOverview.jobTitle || session.jobTitle,
          companyName: analysisOutput.jobOverview.companyName || session.companyName,
          seniorityLevel: analysisOutput.jobOverview.seniorityLevel,
          requiredExperience:
            analysisOutput.experienceAnalysis.minimumYears !== null
              ? `${analysisOutput.experienceAnalysis.minimumYears}+ years (Level: ${analysisOutput.experienceAnalysis.experienceLevel})`
              : `Level: ${analysisOutput.experienceAnalysis.experienceLevel}`,
          responsibilities: analysisOutput.responsibilities,
          requiredSkills: analysisOutput.technicalSkills
            .filter((s) => s.requirementType === 'REQUIRED')
            .map((s) => s.name),
          preferredSkills: analysisOutput.technicalSkills
            .filter((s) => s.requirementType === 'PREFERRED')
            .map((s) => s.name),
          technicalSkills: analysisOutput.technicalSkills,
          softSkills: analysisOutput.softSkills,
          technologies: analysisOutput.technologyStack,
          qualifications: analysisOutput.qualifications,
          interviewDifficulty: analysisOutput.difficultyAnalysis.level,
          skillGapAnalysis: analysisOutput.skillGapAnalysis,
          rawAnalysis: analysisOutput
        };

        const analysisRecord = await tx.jobAnalysis.upsert({
          where: { preparationSessionId: preparationId },
          create: {
            preparationSessionId: preparationId,
            ...analysisData
          },
          update: {
            ...analysisData
          }
        });

        // Update preparation session progress and status
        await tx.preparationSession.update({
          where: { id: preparationId },
          data: {
            status: 'READY',
            progress: Math.max(session.progress, 25), // Milestone: JD analyzed brings baseline readiness to at least 25%
            difficulty: analysisOutput.difficultyAnalysis.level,
            updatedAt: new Date()
          }
        });

        return analysisRecord;
      });

      const dbPersistElapsedMs = Date.now() - dbPersistStartTime;
      const totalElapsedMs = Date.now() - startAnalysisTimestamp;

      logger.info('Job analysis completed and persisted successfully', {
        preparationId,
        analysisId: savedAnalysis.id,
        difficulty: savedAnalysis.interviewDifficulty,
        openAiElapsedMs,
        dbPersistElapsedMs,
        totalElapsedMs
      });

      return savedAnalysis;
    } catch (analysisErr) {
      // Revert status on failure
      logger.error('Failed to complete job description analysis:', analysisErr.message);
      await db.preparationSession.update({
        where: { id: preparationId },
        data: { status: previousStatus === 'ANALYZING' ? 'DRAFT' : previousStatus }
      });
      throw analysisErr;
    }
  }

  /**
   * Retrieves saved analysis for a preparation session with ownership check
   *
   * @param {string} preparationId
   * @param {string} userId
   * @returns {Promise<object>} JobAnalysis record
   */
  static async getAnalysis(preparationId, userId) {
    const session = await db.preparationSession.findUnique({
      where: { id: preparationId },
      include: {
        jobAnalysis: true,
        jobDescription: true
      }
    });

    if (!session) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view this analysis');
      err.status = 403;
      throw err;
    }

    if (!session.jobAnalysis) {
      const err = new Error('Analysis has not been generated for this preparation session yet');
      err.status = 404;
      err.code = 'ANALYSIS_NOT_FOUND';
      throw err;
    }

    return session.jobAnalysis;
  }

  /**
   * Regenerates analysis for an existing preparation session
   *
   * @param {string} preparationId
   * @param {string} userId
   * @returns {Promise<object>} Fresh JobAnalysis record
   */
  static async regenerateAnalysis(preparationId, userId) {
    return await this.analyzePreparation(preparationId, userId, true);
  }

  /**
   * Retrieves high-level analysis state for UI orchestration
   *
   * @param {string} preparationId
   * @param {string} userId
   * @returns {Promise<object>} Status descriptor
   */
  static async getAnalysisStatus(preparationId, userId) {
    const session = await db.preparationSession.findUnique({
      where: { id: preparationId },
      include: {
        jobAnalysis: {
          select: { id: true, interviewDifficulty: true, updatedAt: true }
        },
        jobDescription: {
          select: { id: true, rawText: true, updatedAt: true }
        }
      }
    });

    if (!session) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to inspect this preparation');
      err.status = 403;
      throw err;
    }

    const hasDescription = Boolean(session.jobDescription?.rawText && session.jobDescription.rawText.trim().length >= 20);

    let status = 'NOT_STARTED';
    if (session.status === 'ANALYZING') {
      status = 'PROCESSING';
    } else if (session.jobAnalysis) {
      status = 'COMPLETED';
    } else if (!hasDescription) {
      status = 'MISSING_DESCRIPTION';
    }

    return {
      status,
      preparationId: session.id,
      preparationTitle: session.jobTitle || session.title,
      companyName: session.companyName,
      hasJobDescription: hasDescription,
      analysisId: session.jobAnalysis?.id || null,
      difficulty: session.jobAnalysis?.interviewDifficulty || session.difficulty,
      lastAnalyzedAt: session.jobAnalysis?.updatedAt || null
    };
  }
}

