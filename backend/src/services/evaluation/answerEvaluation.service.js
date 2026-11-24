import { db } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
  getRubricForCategory,
  calculateWeightedScore,
  classifyPerformance,
  normalizeCriterionScores,
  RUBRIC_VERSION
} from './rubrics.js';
import {
  buildAnswerEvaluationSystemPrompt,
  buildAnswerEvaluationTurnPrompt
} from '../../prompts/evaluation.prompt.js';
import { aiAnswerEvaluationOutputSchema } from '../../validators/evaluation.validator.js';

export class AnswerEvaluationService {
  // Mock handler hook for deterministic offline testing
  static _mockHandler = null;

  static __setMockHandler(fn) {
    this._mockHandler = fn;
  }

  /**
   * Evaluates an individual Phase 8 QuestionAttempt
   */
  static async evaluateAttempt(attemptId, userId, options = {}) {
    const { forceRegenerate = false } = options;

    // 1. Fetch QuestionAttempt with associated question and preparation
    const attempt = await db.questionAttempt.findUnique({
      where: { id: attemptId },
      include: {
        question: {
          include: {
            preparationSession: true
          }
        }
      }
    });

    if (!attempt) {
      const err = new Error('Question attempt not found');
      err.status = 404;
      throw err;
    }

    if (attempt.userId !== userId) {
      const err = new Error('Access denied: You do not own this question attempt');
      err.status = 403;
      throw err;
    }

    // Must be submitted (not an unsubmitted draft)
    if (attempt.status !== 'SUBMITTED' && attempt.status !== 'EVALUATED') {
      const err = new Error('Cannot evaluate an unsubmitted draft attempt. Please submit your answer first.');
      err.status = 400;
      throw err;
    }

    // 2. Check for existing evaluation (idempotency) unless regeneration is forced
    if (!forceRegenerate) {
      const existing = await db.interviewEvaluation.findFirst({
        where: {
          questionAttemptId: attempt.id,
          userId
        }
      });
      if (existing) {
        return existing;
      }
    }

    const { question } = attempt;
    const category = question.category || 'TECHNICAL';
    const rubric = getRubricForCategory(category);

    // 3. Generate AI evaluation
    let aiOutput;
    if (this._mockHandler) {
      aiOutput = await this._mockHandler({
        attempt,
        question,
        rubric,
        sourceType: 'PRACTICE_ANSWER'
      });
    } else {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        const err = new Error('OpenAI API Key is not configured. Real AI evaluation is unavailable.');
        err.status = 503;
        err.code = 'OPENAI_KEY_MISSING';
        throw err;
      }

      const systemPrompt = buildAnswerEvaluationSystemPrompt({ category, rubric });
      const userPrompt = buildAnswerEvaluationTurnPrompt({
        questionText: question.question,
        category,
        difficulty: question.difficulty,
        expectedConcepts: Array.isArray(question.expectedConcepts) ? question.expectedConcepts : [],
        referenceAnswer: question.referenceAnswer || '',
        evaluationCriteria: question.evaluationCriteria || '',
        candidateAnswer: attempt.answer || ''
      });

      const startTime = Date.now();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI evaluation request failed:', errorText);
        const err = new Error(`OpenAI evaluation error: ${response.statusText}`);
        err.status = response.status === 429 ? 429 : 502;
        throw err;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      try {
        aiOutput = JSON.parse(rawContent);
      } catch (parseErr) {
        throw new Error('AI returned malformed evaluation JSON');
      }

      // Log token usage
      if (data.usage) {
        await db.aiUsageLog.create({
          data: {
            userId,
            preparationSessionId: question.preparationSessionId,
            operationType: 'ANSWER_EVALUATION',
            provider: 'OpenAI',
            model: env.OPENAI_MODEL || 'gpt-4o-mini',
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
            durationMs: Date.now() - startTime,
            status: 'SUCCESS'
          }
        }).catch((e) => logger.warn('Failed to log AI evaluation usage:', e.message));
      }
    }

    // 4. Validate output schema
    const parsed = aiAnswerEvaluationOutputSchema.safeParse(aiOutput);
    const validOutput = parsed.success ? parsed.data : aiOutput;

    // 5. Score calculation and normalization
    const criterionScores = normalizeCriterionScores(validOutput.criterionScores || [], rubric);
    const overallScore = calculateWeightedScore(criterionScores, rubric);
    const classification = classifyPerformance(overallScore);

    // 6. Persist InterviewEvaluation
    const evaluation = await db.interviewEvaluation.create({
      data: {
        userId,
        sourceType: 'PRACTICE_ANSWER',
        sourceId: attempt.id,
        questionAttemptId: attempt.id,
        overallScore,
        classification,
        rubricVersion: RUBRIC_VERSION,
        evaluationStatus: 'COMPLETED',
        criterionScores,
        strengths: validOutput.strengths || [],
        weaknesses: validOutput.weaknesses || [],
        missingConcepts: validOutput.missingConcepts || [],
        improvementSuggestions: validOutput.improvementSuggestions || [],
        detailedFeedback: validOutput.detailedFeedback || '',
        improvedAnswer: validOutput.improvedAnswer || '',
        confidence: validOutput.confidence || 0.85,
        limitations: [],
        evaluatedAt: new Date()
      }
    });

    // 7. Update QuestionAttempt status and score
    await db.questionAttempt.update({
      where: { id: attempt.id },
      data: {
        score: overallScore,
        status: 'EVALUATED',
        feedback: validOutput.detailedFeedback || '',
        strengths: validOutput.strengths || [],
        weaknesses: validOutput.weaknesses || [],
        suggestedAnswer: validOutput.improvedAnswer || null
      }
    }).catch((e) => logger.warn('Failed to update attempt score:', e.message));

    // 8. Generate personalized recommendations if weaknesses exist
    if (Array.isArray(validOutput.weaknesses) && validOutput.weaknesses.length > 0) {
      for (const weakness of validOutput.weaknesses.slice(0, 2)) {
        await db.improvementRecommendation.create({
          data: {
            userId,
            evaluationId: evaluation.id,
            skill: question.category || 'General',
            weakness,
            whyItMatters: `Identified gap during practice question: "${question.question.slice(0, 80)}..."`,
            recommendedAction: validOutput.improvementSuggestions?.[0] || 'Review foundational principles and re-attempt question.',
            practiceActivity: `Re-practice ${question.category} question: ${question.question.slice(0, 50)}`,
            priority: overallScore < 60 ? 'HIGH' : 'MEDIUM',
            estimatedMinutes: 25,
            status: 'PENDING'
          }
        }).catch((e) => logger.warn('Failed to generate recommendation:', e.message));
      }
    }

    return evaluation;
  }

  /**
   * Retrieves evaluation for a question attempt
   */
  static async getAttemptEvaluation(attemptId, userId) {
    const evaluation = await db.interviewEvaluation.findFirst({
      where: {
        questionAttemptId: attemptId,
        userId
      }
    });

    if (!evaluation) {
      const err = new Error('No evaluation found for this attempt. Please request evaluation first.');
      err.status = 404;
      throw err;
    }

    return evaluation;
  }
}

