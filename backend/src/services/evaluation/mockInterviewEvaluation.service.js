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
  buildMockInterviewEvaluationSystemPrompt,
  buildMockInterviewEvaluationTurnPrompt
} from '../../prompts/evaluation.prompt.js';
import { aiMockInterviewEvaluationOutputSchema } from '../../validators/evaluation.validator.js';

export class MockInterviewEvaluationService {
  static _mockHandler = null;

  static __setMockHandler(fn) {
    this._mockHandler = fn;
  }

  /**
   * Evaluates a completed Phase 10 MockInterview session
   */
  static async evaluateInterview(interviewId, userId, options = {}) {
    const { forceRegenerate = false } = options;

    // 1. Fetch MockInterview with preparation and ordered messages
    const interview = await db.mockInterview.findUnique({
      where: { id: interviewId },
      include: {
        preparationSession: true,
        messages: {
          orderBy: { sequenceNumber: 'asc' }
        }
      }
    });

    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied: You do not own this mock interview');
      err.status = 403;
      throw err;
    }

    // Must be COMPLETED
    if (interview.status !== 'COMPLETED') {
      const err = new Error(
        `Cannot evaluate an interview with status "${interview.status}". The interview must be concluded before generating a performance evaluation.`
      );
      err.status = 400;
      throw err;
    }

    // 2. Check for existing evaluation unless forceRegenerate is true
    if (!forceRegenerate) {
      const existing = await db.interviewEvaluation.findFirst({
        where: {
          mockInterviewId: interview.id,
          userId
        }
      });
      if (existing) {
        return existing;
      }
    }

    const rubric = getRubricForCategory(interview.interviewType || 'TECHNICAL');

    // 3. Generate AI Evaluation
    let aiOutput;
    if (this._mockHandler) {
      aiOutput = await this._mockHandler({
        interview,
        messages: interview.messages,
        rubric,
        sourceType: 'MOCK_INTERVIEW'
      });
    } else {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        const err = new Error('OpenAI API Key is not configured. Real AI evaluation is unavailable.');
        err.status = 503;
        err.code = 'OPENAI_KEY_MISSING';
        throw err;
      }

      const systemPrompt = buildMockInterviewEvaluationSystemPrompt({
        interviewType: interview.interviewType,
        difficulty: interview.difficulty,
        experienceLevel: interview.experienceLevel,
        rubric
      });

      const userPrompt = buildMockInterviewEvaluationTurnPrompt({
        companyName: interview.preparationSession?.companyName,
        jobTitle: interview.preparationSession?.jobTitle || interview.title,
        durationMinutes: interview.durationMinutes,
        messages: interview.messages
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
        const err = new Error(`OpenAI mock interview evaluation error: ${response.statusText}`);
        err.status = response.status === 429 ? 429 : 502;
        throw err;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      try {
        aiOutput = JSON.parse(rawContent);
      } catch (parseErr) {
        throw new Error('AI returned malformed mock interview evaluation JSON');
      }

      if (data.usage) {
        await db.aiUsageLog.create({
          data: {
            userId,
            preparationSessionId: interview.preparationSessionId,
            operationType: 'ANSWER_EVALUATION',
            provider: 'OpenAI',
            model: env.OPENAI_MODEL || 'gpt-4o-mini',
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
            durationMs: Date.now() - startTime,
            status: 'SUCCESS'
          }
        }).catch((e) => logger.warn('Failed to log AI mock evaluation usage:', e.message));
      }
    }

    const parsed = aiMockInterviewEvaluationOutputSchema.safeParse(aiOutput);
    const validOutput = parsed.success ? parsed.data : aiOutput;

    // 4. Score calculation and normalization
    const criterionScores = normalizeCriterionScores(validOutput.criterionScores || [], rubric);
    const overallScore = calculateWeightedScore(criterionScores, rubric);
    const classification = classifyPerformance(overallScore);

    // 5. Persist or Upsert InterviewEvaluation
    const evaluation = await db.interviewEvaluation.upsert({
      where: { mockInterviewId: interview.id },
      update: {
        overallScore,
        classification,
        rubricVersion: RUBRIC_VERSION,
        evaluationStatus: 'COMPLETED',
        technicalAccuracy: validOutput.technicalAccuracyScore ?? overallScore,
        communicationScore: validOutput.communicationScore ?? 80,
        problemSolvingScore: validOutput.problemSolvingScore ?? 75,
        completenessScore: validOutput.completenessScore ?? 80,
        confidenceScore: Math.round((validOutput.confidence || 0.85) * 100),
        criterionScores,
        strengths: validOutput.strengths || [],
        weaknesses: validOutput.weaknesses || [],
        missingConcepts: [],
        recommendations: validOutput.recommendations || [],
        improvementSuggestions: validOutput.recommendations || [],
        detailedFeedback: validOutput.summary || '',
        confidence: validOutput.confidence || 0.85,
        limitations: [
          'Evaluates verbal and technical reasoning within conversational transcript bounds.'
        ],
        evaluatedAt: new Date()
      },
      create: {
        userId,
        sourceType: 'MOCK_INTERVIEW',
        sourceId: interview.id,
        mockInterviewId: interview.id,
        overallScore,
        classification,
        rubricVersion: RUBRIC_VERSION,
        evaluationStatus: 'COMPLETED',
        technicalAccuracy: validOutput.technicalAccuracyScore ?? overallScore,
        communicationScore: validOutput.communicationScore ?? 80,
        problemSolvingScore: validOutput.problemSolvingScore ?? 75,
        completenessScore: validOutput.completenessScore ?? 80,
        confidenceScore: Math.round((validOutput.confidence || 0.85) * 100),
        criterionScores,
        strengths: validOutput.strengths || [],
        weaknesses: validOutput.weaknesses || [],
        missingConcepts: [],
        recommendations: validOutput.recommendations || [],
        improvementSuggestions: validOutput.recommendations || [],
        detailedFeedback: validOutput.summary || '',
        confidence: validOutput.confidence || 0.85,
        limitations: [
          'Evaluates verbal and technical reasoning within conversational transcript bounds.'
        ],
        evaluatedAt: new Date()
      }
    });

    // 6. Update MockInterview record overallScore
    await db.mockInterview.update({
      where: { id: interview.id },
      data: { overallScore }
    }).catch((e) => logger.warn('Failed to update mock interview score:', e.message));

    // 7. Generate improvement recommendations if weaknesses exist
    if (Array.isArray(validOutput.weaknesses) && validOutput.weaknesses.length > 0) {
      for (const weakness of validOutput.weaknesses.slice(0, 3)) {
        await db.improvementRecommendation.create({
          data: {
            userId,
            evaluationId: evaluation.id,
            skill: interview.interviewType || 'General',
            weakness,
            whyItMatters: `Identified growth area during ${interview.interviewType} mock interview.`,
            recommendedAction: validOutput.recommendations?.[0] || 'Target this topic in your next study session.',
            practiceActivity: `Practice targeted ${interview.interviewType} drills on this topic`,
            priority: overallScore < 65 ? 'HIGH' : 'MEDIUM',
            estimatedMinutes: 30,
            status: 'PENDING'
          }
        }).catch((e) => logger.warn('Failed to create mock interview recommendation:', e.message));
      }
    }

    return {
      evaluation,
      questionEvaluations: validOutput.questionEvaluations || []
    };
  }

  /**
   * Retrieves evaluation for a mock interview
   */
  static async getInterviewEvaluation(interviewId, userId) {
    const evaluation = await db.interviewEvaluation.findFirst({
      where: {
        mockInterviewId: interviewId,
        userId
      }
    });

    if (!evaluation) {
      const err = new Error('No evaluation found for this mock interview. Please request evaluation first.');
      err.status = 404;
      throw err;
    }

    return evaluation;
  }
}

