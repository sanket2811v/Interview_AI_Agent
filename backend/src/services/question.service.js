import { db } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { OpenAIService } from './openai.service.js';
import {
  QUESTION_PROMPT_VERSION,
  getQuestionGenerationSystemPrompt,
  buildQuestionGenerationUserPrompt
} from '../prompts/questionGeneration.prompt.js';
import { getPaginationParams, formatPaginatedResponse } from './db.service.js';

/**
 * Service managing interview question generation, coding challenge persistence,
 * search & filtering, duplicate prevention, and multi-tenant security.
 */
export class QuestionService {
  /**
   * Generates questions for a preparation session grounded in Phase 6 analysis
   *
   * @param {string} preparationId
   * @param {string} userId
   * @param {object} options - Generation options (category, difficulty, count, targetSkills, language)
   * @returns {Promise<object>} Persisted questions and metadata
   */
  static async generateQuestions(preparationId, userId, options = {}) {
    const {
      category = 'TECHNICAL',
      difficulty = 'MEDIUM',
      count = 5,
      targetSkills = [],
      language = 'JavaScript',
      focusOnGaps = false
    } = options;

    // 1. Fetch preparation session with Phase 6 JobAnalysis
    const session = await db.preparationSession.findUnique({
      where: { id: preparationId },
      include: {
        jobAnalysis: true,
        jobDescription: true,
        questions: {
          select: { question: true, category: true }
        },
        codingChallenges: {
          select: { title: true }
        }
      }
    });

    if (!session) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    // 2. Strict tenant user ownership check
    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to generate questions for this preparation');
      err.status = 403;
      throw err;
    }

    // 3. Phase 6 Analysis Requirement
    if (!session.jobAnalysis) {
      const err = new Error(
        'Phase 6 job description analysis must be completed before interview questions can be generated. Please run AI analysis first.'
      );
      err.status = 400;
      err.code = 'ANALYSIS_REQUIRED';
      throw err;
    }

    // 4. Stale analysis detection (warning metadata)
    const isStale = Boolean(
      session.jobDescription?.updatedAt &&
      session.jobAnalysis?.updatedAt &&
      new Date(session.jobDescription.updatedAt) > new Date(session.jobAnalysis.updatedAt)
    );

    // 5. Retrieve candidate profile for skill gap alignment
    let candidateProfile = null;
    try {
      candidateProfile = await db.userProfile.findUnique({
        where: { userId }
      });
    } catch (profileErr) {
      logger.warn('Failed to retrieve user profile for question personalization:', profileErr.message);
    }

    // 6. Gather existing questions to prevent duplicates
    const existingTitles = [
      ...session.questions.map((q) => q.question),
      ...session.codingChallenges.map((c) => c.title)
    ];

    // 7. Adjust focus skills if focusOnGaps is enabled
    let effectiveSkills = [...targetSkills];
    if (focusOnGaps && session.jobAnalysis.skillGapAnalysis?.skills) {
      const gapSkills = session.jobAnalysis.skillGapAnalysis.skills
        .filter((s) => s.matchStatus === 'GAP' || s.matchStatus === 'PARTIAL_MATCH')
        .map((s) => s.requiredSkill);
      if (gapSkills.length > 0) {
        effectiveSkills = Array.from(new Set([...effectiveSkills, ...gapSkills]));
      }
    }

    // 8. Build Prompts
    const systemPrompt = getQuestionGenerationSystemPrompt();
    const userPrompt = buildQuestionGenerationUserPrompt({
      jobAnalysis: session.jobAnalysis,
      preparation: session,
      candidateProfile,
      category,
      difficulty,
      count,
      targetSkills: effectiveSkills,
      language,
      existingQuestions: existingTitles
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // 9. Call OpenAI Service
    const startTimestamp = Date.now();
    logger.info('Invoking OpenAI for interview question generation', {
      preparationId,
      category,
      difficulty,
      count
    });

    const aiOutput = await OpenAIService.generateInterviewQuestions(messages, {
      userId,
      preparationSessionId: preparationId
    });
    const openAiElapsedMs = Date.now() - startTimestamp;

    // 10. Deduplication & Persistence in Transaction
    const existingNormalized = new Set(existingTitles.map((t) => t.toLowerCase().trim()));

    const uniqueQuestions = (aiOutput.questions || []).filter((q) => {
      const norm = q.question.toLowerCase().trim();
      if (existingNormalized.has(norm)) return false;
      existingNormalized.add(norm);
      return true;
    });

    const uniqueChallenges = (aiOutput.codingChallenges || []).filter((c) => {
      const norm = c.title.toLowerCase().trim();
      if (existingNormalized.has(norm)) return false;
      existingNormalized.add(norm);
      return true;
    });

    if (uniqueQuestions.length === 0 && uniqueChallenges.length === 0) {
      if ((aiOutput.questions || []).length > 0 || (aiOutput.codingChallenges || []).length > 0) {
        const err = new Error(
          'All generated questions matched existing questions already in this bank. Try selecting different competencies or count.'
        );
        err.status = 409;
        throw err;
      }
      const err = new Error('AI generation did not produce any valid questions. Please try again.');
      err.status = 502;
      throw err;
    }

    const currentQuestionCount = session.questions.length;
    const dbPersistStartTime = Date.now();

    const result = await db.$transaction(async (tx) => {
      // A. Insert standard interview questions
      const createdQuestions = [];
      for (let i = 0; i < uniqueQuestions.length; i++) {
        const item = uniqueQuestions[i];
        const q = await tx.interviewQuestion.create({
          data: {
            preparationSessionId: preparationId,
            category: item.category,
            question: item.question,
            description: item.description || item.subcategory || null,
            difficulty: item.difficulty || (difficulty === 'MIXED' ? 'MEDIUM' : difficulty),
            expectedConcepts: item.expectedConcepts || [],
            hints: item.hints || [],
            referenceAnswer: item.referenceAnswer || null,
            explanation: item.explanation || null,
            estimatedTime: item.estimatedTime || 5,
            tags: item.tags?.length > 0 ? item.tags : item.relatedSkills || [],
            displayOrder: currentQuestionCount + i + 1
          }
        });
        createdQuestions.push(q);
      }

      // B. Insert coding challenges and test cases
      const createdChallenges = [];
      for (let j = 0; j < uniqueChallenges.length; j++) {
        const cItem = uniqueChallenges[j];
        const challenge = await tx.codingChallenge.create({
          data: {
            preparationSessionId: preparationId,
            title: cItem.title,
            description: cItem.description,
            difficulty: cItem.difficulty || (difficulty === 'MIXED' ? 'MEDIUM' : difficulty),
            category: cItem.category || 'Algorithms',
            supportedLanguages: cItem.supportedLanguages || ['javascript', 'python', 'java', 'cpp'],
            constraints: cItem.constraints || [],
            sampleInput: cItem.sampleInput || null,
            sampleOutput: cItem.sampleOutput || null,
            hints: cItem.hints || [],
            expectedTimeComplexity: cItem.expectedTimeComplexity || null,
            expectedSpaceComplexity: cItem.expectedSpaceComplexity || null,
            timeLimit: cItem.timeLimit || 2000,
            memoryLimit: cItem.memoryLimit || 128
          }
        });

        // Insert associated test cases
        if (Array.isArray(cItem.testCases) && cItem.testCases.length > 0) {
          for (let k = 0; k < cItem.testCases.length; k++) {
            const tc = cItem.testCases[k];
            await tx.codingTestCase.create({
              data: {
                challengeId: challenge.id,
                input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input ?? ''),
                expectedOutput: typeof tc.expectedOutput === 'string' ? tc.expectedOutput : JSON.stringify(tc.expectedOutput ?? ''),
                isHidden: Boolean(tc.isHidden),
                displayOrder: k
              }
            });
          }
        }

        createdChallenges.push(challenge);
      }

      // C. Update session readiness progress milestone (min 50% upon generating question bank)
      await tx.preparationSession.update({
        where: { id: preparationId },
        data: {
          progress: Math.max(session.progress, 50),
          status: 'READY',
          updatedAt: new Date()
        }
      });

      return {
        questions: createdQuestions,
        codingChallenges: createdChallenges
      };
    });

    const dbPersistElapsedMs = Date.now() - dbPersistStartTime;
    const totalElapsedMs = Date.now() - startTimestamp;

    logger.info('Interview questions persisted successfully', {
      preparationId,
      questionsCount: result.questions.length,
      challengesCount: result.codingChallenges.length,
      openAiElapsedMs,
      dbPersistElapsedMs,
      totalElapsedMs
    });

    return {
      success: true,
      data: {
        questions: result.questions,
        codingChallenges: result.codingChallenges,
        totalCreated: result.questions.length + result.codingChallenges.length,
        isStaleAnalysis: isStale,
        metadata: {
          category,
          difficulty,
          promptVersion: QUESTION_PROMPT_VERSION,
          generatedAt: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Retrieves paginated questions for a preparation session with search & filtering
   *
   * @param {string} preparationId
   * @param {string} userId
   * @param {object} queryParams
   */
  static async getQuestions(preparationId, userId, queryParams = {}) {
    const {
      category,
      difficulty,
      search,
      skill,
      page = 1,
      limit = 10,
      sortOrder = 'asc'
    } = queryParams;

    // Verify ownership
    const session = await db.preparationSession.findUnique({
      where: { id: preparationId }
    });

    if (!session) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view questions for this preparation');
      err.status = 403;
      throw err;
    }

    const { skip, take } = getPaginationParams(page, limit);

    const where = {
      preparationSessionId: preparationId
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty;
    }

    if (search) {
      where.question = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [items, total] = await Promise.all([
      db.interviewQuestion.findMany({
        where,
        skip,
        take,
        orderBy: [
          { displayOrder: sortOrder },
          { createdAt: sortOrder }
        ]
      }),
      db.interviewQuestion.count({ where })
    ]);

    return formatPaginatedResponse({
      data: items,
      total,
      page,
      limit
    });
  }

  /**
   * Retrieves single question details with ownership verification
   *
   * @param {string} questionId
   * @param {string} userId
   */
  static async getQuestionById(questionId, userId) {
    const question = await db.interviewQuestion.findUnique({
      where: { id: questionId },
      include: {
        preparationSession: {
          select: { id: true, userId: true, jobTitle: true, companyName: true }
        }
      }
    });

    if (!question) {
      const err = new Error('Interview question not found');
      err.status = 404;
      throw err;
    }

    if (question.preparationSession.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view this question');
      err.status = 403;
      throw err;
    }

    return question;
  }

  /**
   * Updates question content with ownership enforcement
   */
  static async updateQuestion(questionId, userId, updates) {
    const existing = await this.getQuestionById(questionId, userId);

    return await db.interviewQuestion.update({
      where: { id: questionId },
      data: updates
    });
  }

  /**
   * Deletes question with ownership enforcement
   */
  static async deleteQuestion(questionId, userId) {
    await this.getQuestionById(questionId, userId);

    await db.interviewQuestion.delete({
      where: { id: questionId }
    });

    return { message: 'Interview question deleted successfully' };
  }

  /**
   * Regenerates a specific category's questions while preserving other categories
   */
  static async regenerateCategory(preparationId, userId, category, options = {}) {
    return await this.generateQuestions(preparationId, userId, {
      ...options,
      category
    });
  }

  /**
   * Retrieves coding challenges for a preparation with hidden test case protection
   */
  static async getCodingChallenges(preparationId, userId) {
    const session = await db.preparationSession.findUnique({
      where: { id: preparationId }
    });

    if (!session) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (session.userId !== userId) {
      const err = new Error('Access denied: You do not have permission to view coding challenges');
      err.status = 403;
      throw err;
    }

    const challenges = await db.codingChallenge.findMany({
      where: { preparationSessionId: preparationId },
      include: {
        testCases: {
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mask hidden evaluation test cases to prevent cheating
    return challenges.map((ch) => ({
      ...ch,
      testCases: ch.testCases.map((tc) => ({
        id: tc.id,
        isHidden: tc.isHidden,
        displayOrder: tc.displayOrder,
        input: tc.isHidden ? '[Hidden evaluation input]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden evaluation output]' : tc.expectedOutput
      }))
    }));
  }

  /**
   * Retrieves single coding challenge by ID with hidden test case masking
   */
  static async getCodingChallengeById(challengeId, userId) {
    const challenge = await db.codingChallenge.findUnique({
      where: { id: challengeId },
      include: {
        preparationSession: {
          select: { id: true, userId: true }
        },
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
      const err = new Error('Access denied: You do not have permission to view this challenge');
      err.status = 403;
      throw err;
    }

    // Mask hidden test cases
    return {
      ...challenge,
      testCases: challenge.testCases.map((tc) => ({
        id: tc.id,
        isHidden: tc.isHidden,
        displayOrder: tc.displayOrder,
        input: tc.isHidden ? '[Hidden evaluation input]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden evaluation output]' : tc.expectedOutput
      }))
    };
  }
}

